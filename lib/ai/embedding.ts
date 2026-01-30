import OpenAI from "openai";

function getClient() {
    return new OpenAI({
        baseURL: process.env.AZURE_OPENAI_ENDPOINT || "https://enterprise-free.openai.azure.com/openai/v1/",
        apiKey: process.env.AZURE_OPENAI_API_KEY,
    });
}

const EMBEDDING_MODEL = "text-embedding-3-large";

export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await getClient().embeddings.create({
            model: EMBEDDING_MODEL,
            input: text.replace(/\n/g, " "), // Normalize newlines
            dimensions: 3072, // Explicitly set dimensions as requested
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw new Error("Failed to generate embedding");
    }
}
