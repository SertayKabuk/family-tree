import { createAgent } from "langchain";
import { ChatGoogle } from "@langchain/google";
import { HumanMessage } from "@langchain/core/messages";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const PHOTO_PROMPT = `Bu fotoğrafı ayrıntılı olarak analiz et. Türkçe yanıt ver.

Şunları belirt:
- Fotoğraftaki kişi(ler)in fiziksel özellikleri, yaş tahmini, kıyafetleri
- Ortam ve mekan (iç mekan/dış mekan, şehir/kırsal, dekor)
- Dönem tahmini (kıyafet, fotoğraf kalitesi, nesnelerden)
- Duygusal atmosfer (mutlu, resmi, rahat vb.)
- Önemli nesneler veya detaylar
- Fotoğrafın olası bağlamı (düğün, aile toplantısı, okul, iş vb.)

Kısa ve öz paragraflar halinde yaz. Maksimum 200 kelime.`;

const DOCUMENT_PROMPT = `Bu belgeyi analiz et ve içeriğini özetle. Türkçe yanıt ver.

Şunları belirt:
- Belgenin türü (resmi belge, mektup, sertifika, rapor vb.)
- Ana içerik ve konusu
- Önemli isimler, tarihler ve yerler
- Belgenin tarihsel veya kişisel önemi

Kısa ve öz paragraflar halinde yaz. Maksimum 200 kelime.`;

const AUDIO_PROMPT = `Bu ses kaydını dinle ve analiz et. Türkçe yanıt ver.

Şunları belirt:
- Konuşan kişi(ler) hakkında gözlemler (yaş tahmini, cinsiyet, duygu durumu)
- Konuşmanın içeriği ve konusu
- Önemli isimler, yerler, tarihler veya olaylar
- Arka plan sesleri veya ortam ipuçları
- Konuşma dili ve şivesi

Konuşmanın önemli kısımlarını özetle. Maksimum 200 kelime.`;

type MediaType = "photo" | "document" | "audio";

const PROMPTS: Record<MediaType, string> = {
  photo: PHOTO_PROMPT,
  document: DOCUMENT_PROMPT,
  audio: AUDIO_PROMPT,
};

const CONTENT_TYPES: Record<MediaType, "image" | "file" | "audio"> = {
  photo: "image",
  document: "file",
  audio: "audio",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
  };
  return mimeMap[ext] || "application/octet-stream";
}

async function analyzeFile(filePath: string, type: MediaType): Promise<string> {
  const fullPath = path.join(env.UPLOAD_DIR, filePath);
  const buffer = await fs.readFile(fullPath);
  const mimeType = getMimeType(filePath);
  const contentType = CONTENT_TYPES[type];

  const model = new ChatGoogle({
    model: env.GOOGLE_LLM_MODEL,
    apiKey: env.GOOGLE_API_KEY,
  });

  const agent = createAgent({
    model,
    tools: [],
  });

  const result = await agent.invoke({
    messages: [
      new HumanMessage({
        content: [
          { type: contentType, mimeType, data: buffer.toString("base64") },
          { type: "text", text: PROMPTS[type] },
        ],
      }),
    ],
  });

  const lastMessage = result.messages[result.messages.length - 1];
  const text = typeof lastMessage.content === "string"
    ? lastMessage.content
    : lastMessage.text;

  if (!text) throw new Error("No analysis text returned");
  return text.trim();
}

export async function analyzePhoto(photoId: string, filePath: string): Promise<void> {
  try {
    const aiDescription = await analyzeFile(filePath, "photo");
    await prisma.photo.update({ where: { id: photoId }, data: { aiDescription } });
    console.log(`Photo ${photoId} analyzed successfully`);
  } catch (error) {
    console.error(`Photo analysis failed for ${photoId}:`, error);
  }
}

export async function analyzeDocument(documentId: string, filePath: string): Promise<void> {
  try {
    const aiDescription = await analyzeFile(filePath, "document");
    await prisma.document.update({ where: { id: documentId }, data: { aiDescription } });
    console.log(`Document ${documentId} analyzed successfully`);
  } catch (error) {
    console.error(`Document analysis failed for ${documentId}:`, error);
  }
}

export async function analyzeAudioClip(audioClipId: string, filePath: string): Promise<void> {
  try {
    const aiDescription = await analyzeFile(filePath, "audio");
    await prisma.audioClip.update({ where: { id: audioClipId }, data: { aiDescription } });
    console.log(`AudioClip ${audioClipId} analyzed successfully`);
  } catch (error) {
    console.error(`Audio analysis failed for ${audioClipId}:`, error);
  }
}
