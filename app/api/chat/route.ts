import { OpenAI } from "openai";
import { generateEmbedding } from "@/lib/ai/embedding";
import { searchVectors } from "@/lib/ai/vector-store";
import { NextResponse } from "next/server";

const CHAT_MODEL = "gpt-5-mini";

export async function POST(req: Request) {
    try {
        const client = new OpenAI({
            baseURL: process.env.AZURE_OPENAI_ENDPOINT || "https://enterprise-free.openai.azure.com/openai/v1/",
            apiKey: process.env.AZURE_OPENAI_API_KEY,
        });

        const { messages } = await req.json();
        const lastMessage = messages[messages.length - 1];
        const userQuery = lastMessage.content;

        // 1. Embed query
        let embedding: number[] = [];
        try {
            embedding = await generateEmbedding(userQuery);
        } catch (e) {
            console.error("Embedding generation failed", e);
        }

        // 2. Retrieve Context
        let context = "";
        if (embedding.length > 0) {
            const searchResults = await searchVectors(embedding, 5);
            const distinctResults = searchResults.map(r => r.content).join("\n\n---\n\n");
            context = `Base your answer on the following context if relevant:\n\n${distinctResults}`;
        }

        // 3. System Prompt
        const systemMessage = {
            role: "system" as const, // Fix typing
            content: `You are a helpful family history assistant. You have access to documents, photos, and audio related to this family tree.
      
      Context retrieved from family archives:
      ${context}
      
      If the answer is not in the context, say so, but you can still answer general questions.
      Always be respectful and strictly strictly adhere to the provided context for factual claims about the family.
      `
        };

        // 4. Chat Completion Stream
        const responseStream = await client.chat.completions.create({
            model: CHAT_MODEL,
            messages: [systemMessage, ...messages],
            stream: true,
        });

        // 5. Convert native OpenAI stream to Web Response stream
        const stream = new ReadableStream({
            async start(controller) {
                for await (const chunk of responseStream) {
                    const content = chunk.choices[0]?.delta?.content || "";
                    if (content) {
                        controller.enqueue(new TextEncoder().encode(content));
                    }
                }
                controller.close();
            },
        });

        return new Response(stream, {
            headers: { "Content-Type": "text/event-stream" },
        });

    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
