import { auth } from "@/auth";
import { getAgentStore, getCheckpointer } from "@/lib/ai/store";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const { threadId } = await params;
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId");
  if (!treeId) return new Response("Missing treeId", { status: 400 });

  const prefix = `${userId}-${treeId}`;
  const fullThreadId =
    threadId === "__default__" ? prefix : `${prefix}-${threadId}`;

  const checkpointer = await getCheckpointer();
  const tuple = await checkpointer.getTuple({
    configurable: { thread_id: fullThreadId },
  });

  if (!tuple) return Response.json({ messages: [] });

  const rawMessages: unknown[] =
    (tuple.checkpoint.channel_values?.messages as unknown[]) ?? [];

  type SimpleMessage = { role: "user" | "assistant"; content: string };
  const messages: SimpleMessage[] = [];

  for (const msg of rawMessages) {
    if (!msg || typeof msg !== "object") continue;
    const m = msg as Record<string, unknown>;

    // Determine type — LangChain messages expose _getType() or getType()
    let msgType: string | null = null;
    if (typeof (m as { _getType?: () => string })._getType === "function") {
      msgType = (m as { _getType: () => string })._getType();
    } else if (typeof (m as { getType?: () => string }).getType === "function") {
      msgType = (m as { getType: () => string }).getType();
    } else if (typeof m.type === "string") {
      msgType = m.type;
    }

    if (msgType !== "human" && msgType !== "ai") continue;

    // Extract content
    let content = "";
    if (typeof m.content === "string") {
      content = m.content;
    } else if (Array.isArray(m.content)) {
      content = (m.content as unknown[])
        .map((c) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object") return (c as { text?: string }).text ?? "";
          return "";
        })
        .join("");
    }

    if (!content) continue;
    messages.push({ role: msgType === "human" ? "user" : "assistant", content });
  }

  return Response.json({ messages });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const { threadId } = await params;
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId");
  if (!treeId) return new Response("Missing treeId", { status: 400 });

  const prefix = `${userId}-${treeId}`;
  const fullThreadId =
    threadId === "__default__" ? prefix : `${prefix}-${threadId}`;

  const [store, checkpointer] = await Promise.all([
    getAgentStore(),
    getCheckpointer(),
  ]);

  await Promise.all([
    checkpointer.deleteThread(fullThreadId),
    store.delete([userId, treeId, "threads"], threadId).catch(() => undefined),
  ]);

  return Response.json({ success: true });
}
