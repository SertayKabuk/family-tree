import { createDeepAgent, CompositeBackend, StateBackend, StoreBackend } from "deepagents";
import { ChatGoogle } from "@langchain/google";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { auth } from "@/auth";
import { getAgentStore, getCheckpointer } from "@/lib/ai/store";
import { generateEmbedding } from "@/lib/ai/embedding";
import { searchVectors } from "@/lib/ai/vector-store";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const session = await auth();
  const { messages, treeId } = await req.json();
  const userId = session?.user?.id ?? "anonymous";

  const [store, checkpointer] = await Promise.all([getAgentStore(), getCheckpointer()]);

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

  const llm = new ChatGoogle({
    apiKey: env.GOOGLE_API_KEY,
    model: env.GOOGLE_LLM_MODEL,
    apiVersion: "v1beta"
  });

  const agent = createDeepAgent({
    model: llm,
    tools: [searchTool],
    store,
    checkpointer,
    systemPrompt: `You are a helpful family history assistant. Use search_family_archive to find relevant photos, documents, and audio. Save important facts to /memories/ to recall across conversations. Be respectful and accurate.`,
    backend: (config) =>
      new CompositeBackend(new StateBackend(config), {
        "/memories/": new StoreBackend(config, {
          namespace: [userId, treeId],
        }),
      }),
  });

  const agentStream = agent.streamEvents(
    { messages },
    { version: "v2", configurable: { thread_id: `${userId}-${treeId}` } }
  );

  const stream = new ReadableStream({
    async start(controller) {
      for await (const event of agentStream) {
        if (event.event === "on_chat_model_stream") {
          const content = event.data?.chunk?.content ?? "";
          if (content) controller.enqueue(new TextEncoder().encode(content));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}
