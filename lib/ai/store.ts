import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";
import pg from "pg";
import { generateEmbedding, embedTextDocument } from "./embedding";
import { env } from "@/lib/env";

const globalForStore = globalThis as unknown as {
  agentStore?: PostgresStore;
  agentStorePromise?: Promise<PostgresStore>;
  checkpointer?: PostgresSaver;
  checkpointerPromise?: Promise<PostgresSaver>;
  checkpointerPool?: pg.Pool;
};

const geminiEmbeddings = {
  embedDocuments: (texts: string[]) => Promise.all(texts.map(embedTextDocument)),
  embedQuery: (text: string) => generateEmbedding(text),
};

export async function getAgentStore(): Promise<PostgresStore> {
  if (globalForStore.agentStore) {
    return globalForStore.agentStore;
  }

  if (!globalForStore.agentStorePromise) {
    globalForStore.agentStorePromise = (async () => {
      const store = new PostgresStore({
        connectionOptions: env.DATABASE_URL,
        ensureTables: true,
        index: {
          dims: 1536,
          embed: geminiEmbeddings,
          distanceMetric: "cosine",
        },
      });

      await store.setup();
      globalForStore.agentStore = store;
      return store;
    })().catch((error) => {
      globalForStore.agentStorePromise = undefined;
      throw error;
    });
  }

  return globalForStore.agentStorePromise;
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
  if (globalForStore.checkpointer) {
    return globalForStore.checkpointer;
  }

  if (!globalForStore.checkpointerPromise) {
    globalForStore.checkpointerPromise = (async () => {
      const pool = await getCheckpointerPool();
      const checkpointer = new PostgresSaver(pool);

      await checkpointer.setup();
      globalForStore.checkpointer = checkpointer;
      return checkpointer;
    })().catch((error) => {
      globalForStore.checkpointerPromise = undefined;
      throw error;
    });
  }

  return globalForStore.checkpointerPromise;
}
