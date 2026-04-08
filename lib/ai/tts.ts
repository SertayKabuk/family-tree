import { GoogleGenAI } from "@google/genai";
import { mkdir, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { env } from "@/lib/env";
import { defaultLocale, type Locale } from "@/i18n/config";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";

const ttsConfig: Record<Locale, { voiceName: string; prompt: (text: string) => string }> = {
  tr: {
    voiceName: "Sulafat",
    prompt: (text) => `# SES PROFİLİ: Hikaye Anlatıcısı
## "Aile Hikayesi"

### YÖNETMEN NOTLARI
Stil: Sıcak, samimi bir hikaye anlatıcısı. Dinleyiciyi içine çeken, duygusal ve doğal bir anlatım.
Hız: Orta tempo, sakin ve akıcı. Önemli anlarda hafif duraklamalar.
Dil: Türkçe

### METİN
${text}`,
  },
  en: {
    voiceName: "Kore",
    prompt: (text) => `# VOICE PROFILE: Story Narrator
## "Family Story"

### DIRECTOR'S NOTES
Style: Warm and intimate storyteller. An engaging, emotional, and natural narration that draws the listener in.
Pace: Medium tempo, calm and fluid. Slight pauses at important moments.
Language: English

### TEXT
${text}`,
  },
};

function getClient() {
  return new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
}

function createWavBuffer(pcmData: Buffer): Buffer {
  const header = Buffer.alloc(44);
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

export async function generateTreeStoryAudio(
  storyText: string,
  treeId: string,
  options: { signal?: AbortSignal; locale?: Locale } = {}
): Promise<string> {
  return generateStoryAudioInternal(storyText, treeId, "tree-story", options);
}

export async function generateStoryAudio(
  storyText: string,
  treeId: string,
  memberId: string,
  options: { signal?: AbortSignal; locale?: Locale } = {}
): Promise<string> {
  return generateStoryAudioInternal(storyText, treeId, path.join(memberId, "story"), options);
}

async function generateStoryAudioInternal(
  storyText: string,
  treeId: string,
  subPath: string,
  options: { signal?: AbortSignal; locale?: Locale } = {}
): Promise<string> {
  const client = getClient();
  const locale = options.locale ?? defaultLocale;
  const config = ttsConfig[locale] ?? ttsConfig.tr;

  const prompt = config.prompt(storyText);

  const response = await client.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      abortSignal: options.signal,
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: config.voiceName,
          },
        },
      },
    },
  });

  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) {
    throw new Error("No audio data returned from TTS");
  }

  const pcmBuffer = Buffer.from(audioData, "base64");
  const wavBuffer = createWavBuffer(pcmBuffer);

  // Save to disk
  const uploadDir = env.UPLOAD_DIR;
  const storyDir = path.join(uploadDir, treeId, subPath);
  if (!existsSync(storyDir)) {
    await mkdir(storyDir, { recursive: true });
  }

  const fileName = `${nanoid(12)}.wav`;
  const fullPath = path.join(storyDir, fileName);
  await writeFile(fullPath, wavBuffer);

  const relativePath = path.join(treeId, subPath, fileName).replace(/\\/g, "/");
  return relativePath;
}

export async function deleteStoryAudio(filePath: string): Promise<void> {
  const fullPath = path.join(env.UPLOAD_DIR, filePath);
  try {
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  } catch (error) {
    console.error("Error deleting story audio:", error);
  }
}
