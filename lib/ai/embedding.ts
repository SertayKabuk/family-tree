import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";
import { env } from "@/lib/env";

const MODEL = "gemini-embedding-2-preview";
const DIMS = 1536;

function getClient() {
  return new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
}

function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await getClient().models.embedContent({
    model: MODEL,
    contents: [{ parts: [{ text: text.replace(/\n/g, " ") }] }],
    config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: DIMS },
  });
  return l2Normalize(result.embeddings![0].values!);
}

export async function embedTextDocument(text: string): Promise<number[]> {
  const result = await getClient().models.embedContent({
    model: MODEL,
    contents: [{ parts: [{ text: text.replace(/\n/g, " ") }] }],
    config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: DIMS },
  });
  return l2Normalize(result.embeddings![0].values!);
}

export async function embedMedia(filePath: string, mimeType: string): Promise<number[]> {
  const fullPath = path.resolve(process.cwd(), filePath);
  const buffer = await fs.readFile(fullPath);
  const result = await getClient().models.embedContent({
    model: MODEL,
    contents: [{ parts: [{ inlineData: { mimeType, data: buffer.toString("base64") } }] }],
    config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: DIMS },
  });
  return l2Normalize(result.embeddings![0].values!);
}
