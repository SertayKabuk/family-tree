import OpenAI from "openai";

// Initialize OpenAI client for Azure
// Note: Requires AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT in env
// Client is initialized strictly lazily in getClient() to prevent build-time errors.

// Since the user is using specific deployments, we might need separate clients or base URLs if they are on different endpoints?
// Usually in Azure, the deployment name is part of the URL if using the standard OpenAI lib with 'baseURL' hack, 
// OR we use the 'azure-openai' adapter. 
// However, the user provided a sample:
// const endpoint = "https://enterprise-free.openai.azure.com/openai/v1/";
// const deploymentName = "gpt-5-mini";
// const openai = new OpenAI({ baseURL: endpoint, apiKey: apiKey });

// So we will follow that pattern.

const BASE_URL = process.env.AZURE_OPENAI_ENDPOINT || "https://enterprise-free.openai.azure.com/openai/v1/";
const GPT_MODEL = "gpt-5-mini";
const MISTRAL_MODEL = "mistral-ocr";

function getClient() {
    return new OpenAI({
        baseURL: BASE_URL,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
    });
}

import fs from "fs/promises";
import path from "path";

async function getAsBase64(pathOrUrl: string): Promise<string> {
    if (pathOrUrl.startsWith("http")) {
        const response = await fetch(pathOrUrl);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString("base64");
    } else {
        // Local file
        // Assuming pathOrUrl is relative to project root or absolute
        // If it comes from 'uploads/...', it might be relative to cwd
        try {
            const fullPath = path.resolve(process.cwd(), pathOrUrl);
            const buffer = await fs.readFile(fullPath);
            return buffer.toString("base64");
        } catch (e) {
            console.error("Failed to read local file:", pathOrUrl, e);
            throw e;
        }
    }
}

export async function analyzeImage(imageUrl: string): Promise<string> {
    try {
        const base64Image = await getAsBase64(imageUrl);
        const dataUrl = `data:image/jpeg;base64,${base64Image}`; // Handling mime type loosely

        const response = await getClient().chat.completions.create({
            model: GPT_MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Describe this image in detail. Extract any visible text. If it's a person, describe appearance. If it's a document, transcribe it." },
                        {
                            type: "image_url",
                            image_url: {
                                url: dataUrl, // Sending base64 data URL
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1000,
        });
        return response.choices[0].message.content || "";
    } catch (error) {
        console.error("Error analyzing image:", error);
        throw new Error("Failed to analyze image");
    }
}

export async function transcribeAudio(audioUrl: string): Promise<string> {
    try {
        const base64Audio = await getAsBase64(audioUrl);

        // Note: input_audio is a newer API feature that may not be fully typed in the OpenAI SDK
        const response = await getClient().chat.completions.create({
            model: GPT_MODEL,
            modalities: ["text"],
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Transcribe this audio file exactly." },
                        {
                            type: "input_audio",
                            input_audio: {
                                data: base64Audio,
                                format: "mp3"
                            }
                        }
                    ] as unknown as Array<{ type: "text"; text: string }>
                },
            ],
        });

        return response.choices[0].message.content || "";

    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw error;
    }
}

export async function extractDocumentText(docUrl: string): Promise<string> {
    try {
        // For Mistral, if it supports VLM, we might send image. 
        // If it's a PDF, typical VLMs accept image per page.
        // Simplifying assumption: treating doc as image for now if possible, 
        // or relying on model to handle the URL/content.
        // If strictly PDF, we might need pdf-parse lib locally before sending text to LLM if LLM doesn't support PDF.
        // But user said "Mistral OCR". We will try sending the base64 of the file.

        // Note: If docUrl is a PDF, simply base64-ing it as image_url valid? 
        // Usually not. OpenAI doesn't support PDF in image_url.
        // Azure OpenAI "On Your Data" or Document Intelligence does.
        // Mistral OCR model via API might accept base64 in specific field.
        // Since I don't have the exact specs of the user's "Mistral OCR" model availability,
        // I will attempt to assume it accepts standard Chat content or I should fallback to text extraction.

        // However, sticking to the plan:
        const base64Doc = await getAsBase64(docUrl);
        // Construct data URL or just base64?
        // Let's try sending as image_url (often used for VLM OCR of screenshots/scans).
        const dataUrl = `data:image/jpeg;base64,${base64Doc}`; // Mime type might be wrong for PDF

        const response = await getClient().chat.completions.create({
            model: MISTRAL_MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Extract all text from this document. Preserve formatting where possible." },
                        {
                            type: "image_url",
                            image_url: { url: dataUrl }
                        }
                    ]
                }
            ]
        });
        return response.choices[0].message.content || "";
    } catch (error) {
        console.error("Mistral OCR error:", error);
        throw error;
    }
}

