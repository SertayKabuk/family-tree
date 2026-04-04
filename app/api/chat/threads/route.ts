import { auth } from "@/auth";
import { getCheckpointer, getCheckpointerPool, getAgentStore } from "@/lib/ai/store";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId");
  if (!treeId) return new Response("Missing treeId", { status: 400 });

  const prefix = `${userId}-${treeId}`;

  // Ensure LangGraph checkpoint tables exist before querying them directly.
  await getCheckpointer();

  // Query distinct thread_ids with their latest checkpoint timestamp via raw SQL
  const pool = await getCheckpointerPool();
  const { rows } = await pool.query<{ thread_id: string; updated_at: string }>(
    `
    WITH latest AS (
      SELECT DISTINCT ON (thread_id)
        thread_id,
        checkpoint->>'ts' AS updated_at
      FROM checkpoints
      WHERE thread_id = $1 OR thread_id LIKE $2
      ORDER BY thread_id, checkpoint_id DESC
    )
    SELECT * FROM latest
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 50
    `,
    [prefix, `${prefix}-%`]
  );

  // Fetch saved titles from the semantic store
  const titles: Record<string, string> = {};
  try {
    const store = await getAgentStore();
    const items = await store.search([userId, treeId, "threads"], { limit: 100 });
    for (const item of items) {
      titles[item.key] = (item.value as { title?: string }).title ?? "";
    }
  } catch {
    // Store search failure is non-fatal — we fall back to date-based titles
  }

  const threads = rows.map((row) => {
    const isLegacy = row.thread_id === prefix;
    const id = isLegacy ? "__default__" : row.thread_id.slice(prefix.length + 1);
    return {
      id,
      title: titles[id] ?? null,
      updatedAt: row.updated_at ?? null,
    };
  });

  return Response.json(threads);
}
