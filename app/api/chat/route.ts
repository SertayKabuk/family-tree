import { createDeepAgent, CompositeBackend, StateBackend, StoreBackend } from "deepagents";
import { ChatGoogle } from "@langchain/google";
import { AIMessageChunk, ToolMessage } from "langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { auth } from "@/auth";
import { getAgentStore, getCheckpointer } from "@/lib/ai/store";
import { generateEmbedding } from "@/lib/ai/embedding";
import { searchVectors } from "@/lib/ai/vector-store";
import { createSqlTools, buildSqlSystemPrompt } from "@/lib/ai/sql-tools";
import { defaultLocale, type Locale } from "@/i18n/config";
import { env } from "@/lib/env";

const LANGUAGE_INSTRUCTION: Record<Locale, string> = {
  en: "Always respond in English.",
  tr: "Her zaman Türkçe yanıt ver.",
};

export async function POST(req: Request) {
  const session = await auth();
  const { messages, treeId, threadId: clientThreadId } = await req.json();
  const userId = session?.user?.id ?? "anonymous";

  // Resolve thread ID — generate a new one if this is the first message in a session
  const threadId: string = clientThreadId ?? crypto.randomUUID();
  const prefix = `${userId}-${treeId}`;
  const fullThreadId =
    threadId === "__default__" ? prefix : `${prefix}-${threadId}`;

  const cookieHeader = req.headers.get("cookie") ?? "";
  const locale = (cookieHeader
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === "locale")?.[1] ?? defaultLocale) as Locale;

  const languageInstruction = LANGUAGE_INSTRUCTION[locale] ?? LANGUAGE_INSTRUCTION[defaultLocale];

  const [store, checkpointer] = await Promise.all([getAgentStore(), getCheckpointer()]);

  // Persist thread title on first message (non-blocking, best-effort)
  const firstUserMsg = (messages as { role: string; content: string }[]).find(
    (m) => m.role === "user"
  );
  if (firstUserMsg) {
    store
      .put(
        [userId, treeId, "threads"],
        threadId,
        { title: firstUserMsg.content.slice(0, 60) },
        false  // disable vector indexing for thread metadata
      )
      .catch(() => {/* ignore */});
  }

  const searchTool = tool(
    async ({ query }) => {
      const embedding = await generateEmbedding(query);
      const results = await searchVectors(embedding, 5);
      return results.map((r) => r.content).join("\n\n---\n\n") || "No relevant documents found.";
    },
    {
      name: "search_family_archive",
      description: "Search the family's indexed photos, documents, and audio for relevant information.",
      schema: z.object({ query: z.string().describe("Search query") }),
    }
  );

   

  const sqlTools = createSqlTools(treeId);
  const sqlInstructions = buildSqlSystemPrompt(treeId);

  const model = new ChatGoogle({
    model: env.GOOGLE_LLM_MODEL,
    apiKey: env.GOOGLE_API_KEY,
  });

  const agent = createDeepAgent({
    model,
    tools: [searchTool, ...sqlTools],
    store,
    checkpointer,
    systemPrompt: `You are a helpful family history assistant. Use search_family_archive to find relevant photos, documents, and audio. Save important facts to /memories/ to recall across conversations. Be respectful and accurate.

${languageInstruction}

${sqlInstructions}`,
    backend: (config) =>
      new CompositeBackend(new StateBackend(config), {
        "/memories/": new StoreBackend(config, {
          namespace: [userId, treeId],
        }),
      }),
  });

  const agentStream = await agent.stream(
    { messages },
    {
      streamMode: "messages",
      subgraphs: true,
      configurable: { thread_id: fullThreadId },
    }
  );

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) =>
        controller.enqueue(enc.encode(JSON.stringify(event) + "\n"));

      let activeTool: string | null = null;

      try {
        for await (const [namespace, chunk] of agentStream) {
          // Skip events from subagents (tools: namespace)
          const isSubagent = (namespace as string[]).some((s) =>
            s.startsWith("tools:")
          );
          if (isSubagent) continue;

          const message = chunk[0];

          if (AIMessageChunk.isInstance(message)) {
            // Tool call starting — grab the name from the first chunk
            for (const tc of message.tool_call_chunks ?? []) {
              if (tc.name && tc.name !== activeTool) {
                activeTool = tc.name;
                send({ type: "tool_start", name: tc.name });
              }
            }
            // Text token (not a tool call message)
            if (message.text && !(message.tool_call_chunks ?? []).length) {
              send({ type: "token", content: message.text });
            }
          }

          if (ToolMessage.isInstance(message)) {
            send({ type: "tool_end", name: activeTool ?? message.name });
            activeTool = null;
          }
        }
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      }

      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "X-Thread-Id": threadId,
    },
  });
}
