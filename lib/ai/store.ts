import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";
import pg from "pg";
import { generateEmbedding, embedTextDocument } from "./embedding";
import { env } from "@/lib/env";

const globalForStore = globalThis as unknown as {
  agentStore?: PostgresStore;
  checkpointer?: PostgresSaver;
  checkpointerPool?: pg.Pool;
};

const geminiEmbeddings = {
  embedDocuments: (texts: string[]) => Promise.all(texts.map(embedTextDocument)),
  embedQuery: (text: string) => generateEmbedding(text),
};

export async function getAgentStore(): Promise<PostgresStore> {
  if (!globalForStore.agentStore) {
    globalForStore.agentStore = new PostgresStore({
      connectionOptions: env.DATABASE_URL,
      ensureTables: true,
      index: {
        dims: 1536,
        embed: geminiEmbeddings,
        distanceMetric: "cosine",
      },
    });
    await globalForStore.agentStore.setup();
  }
  return globalForStore.agentStore;
}

export async function getCheckpointerPool(): Promise<pg.Pool> {
  if (!globalForStore.checkpointerPool) {
    globalForStore.checkpointerPool = new pg.Pool({
      connectionString: env.DATABASE_URL,
    });
  }
  return globalForStore.checkpointerPool;
}

export async function getCheckpointer(): Promise<PostgresSaver> {
  if (!globalForStore.checkpointer) {
    const pool = await getCheckpointerPool();
    globalForStore.checkpointer = new PostgresSaver(pool);
    await globalForStore.checkpointer.setup();
  }
  return globalForStore.checkpointer;
}
