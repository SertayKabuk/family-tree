import { z } from "zod";
import { createAgent, providerStrategy } from "langchain";
import { ChatGoogle } from "@langchain/google";
import { HumanMessage } from "@langchain/core/messages";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { generateStoryAudio, deleteStoryAudio } from "./tts";

function buildMemberContext(member: {
  firstName: string;
  lastName: string | null;
  nickname: string | null;
  gender: string;
  birthDate: Date | null;
  deathDate: Date | null;
  bio: string | null;
  birthPlace: string | null;
  deathPlace: string | null;
  occupation: string | null;
  facts: { title: string; content: string; date: Date | null; source: string | null }[];
  photos: { title: string | null; description: string | null; aiDescription: string | null }[];
  documents: { title: string; description: string | null; aiDescription: string | null }[];
  audioClips: { title: string; description: string | null; aiDescription: string | null }[];
  relationshipsFrom: {
    type: string;
    toMember: { firstName: string; lastName: string | null };
  }[];
  relationshipsTo: {
    type: string;
    fromMember: { firstName: string; lastName: string | null };
  }[];
}): string {
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
  const lines: string[] = [];

  lines.push(`Ad: ${fullName}`);
  if (member.nickname) lines.push(`Lakap: "${member.nickname}"`);
  lines.push(`Cinsiyet: ${member.gender}`);

  if (member.birthDate) {
    const bd = member.birthDate.toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
    lines.push(`Doğum Tarihi: ${bd}${member.birthPlace ? `, ${member.birthPlace}` : ""}`);
  }
  if (member.deathDate) {
    const dd = member.deathDate.toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
    lines.push(`Vefat Tarihi: ${dd}${member.deathPlace ? `, ${member.deathPlace}` : ""}`);
  }
  if (member.occupation) lines.push(`Meslek: ${member.occupation}`);
  if (member.bio) lines.push(`\nBiyografi:\n${member.bio}`);

  const relLines: string[] = [];
  for (const r of member.relationshipsFrom) {
    const name = [r.toMember.firstName, r.toMember.lastName].filter(Boolean).join(" ");
    relLines.push(`- ${r.type}: ${name}`);
  }
  for (const r of member.relationshipsTo) {
    const name = [r.fromMember.firstName, r.fromMember.lastName].filter(Boolean).join(" ");
    relLines.push(`- ${r.type} (karşılık): ${name}`);
  }
  if (relLines.length > 0) {
    lines.push(`\nİlişkiler:\n${relLines.join("\n")}`);
  }

  if (member.facts.length > 0) {
    const factLines = member.facts.map((f) => {
      let line = `- ${f.title}: ${f.content}`;
      if (f.date) line += ` (${f.date.toLocaleDateString("tr-TR")})`;
      if (f.source) line += ` [Kaynak: ${f.source}]`;
      return line;
    });
    lines.push(`\nBilgiler ve Hikayeler:\n${factLines.join("\n")}`);
  }

  if (member.photos.length > 0) {
    const photoLines = member.photos
      .map((p) => {
        const desc = p.aiDescription || p.description;
        return `- ${p.title || "Fotoğraf"}${desc ? `: ${desc}` : ""}`;
      })
      .join("\n");
    lines.push(`\nFotoğraflar (${member.photos.length} adet):\n${photoLines}`);
  }
  if (member.documents.length > 0) {
    const docLines = member.documents
      .map((d) => {
        const desc = d.aiDescription || d.description;
        return `- ${d.title}${desc ? `: ${desc}` : ""}`;
      })
      .join("\n");
    lines.push(`\nBelgeler (${member.documents.length} adet):\n${docLines}`);
  }
  if (member.audioClips.length > 0) {
    const audioLines = member.audioClips
      .map((a) => {
        const desc = a.aiDescription || a.description;
        return `- ${a.title}${desc ? `: ${desc}` : ""}`;
      })
      .join("\n");
    lines.push(`\nSes Kayıtları (${member.audioClips.length} adet):\n${audioLines}`);
  }

  return lines.join("\n");
}

const generatedStoriesSchema = z.object({
  formalStory: z.string().describe("Resmi biyografik metin, UI'da görüntülenecek."),
  narrativeStory: z.string().describe("Sözlü anlatım hikayesi, sesli okuma için."),
});

type GeneratedStories = z.infer<typeof generatedStoriesSchema>;

export async function generateMemberStory(memberId: string): Promise<GeneratedStories> {
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    include: {
      facts: { orderBy: { createdAt: "desc" } },
      photos: { orderBy: { uploadedAt: "desc" }, select: { title: true, description: true, aiDescription: true } },
      documents: { orderBy: { uploadedAt: "desc" }, select: { title: true, description: true, aiDescription: true } },
      audioClips: { orderBy: { uploadedAt: "desc" }, select: { title: true, description: true, aiDescription: true } },
      relationshipsFrom: {
        include: { toMember: { select: { firstName: true, lastName: true } } },
      },
      relationshipsTo: {
        include: { fromMember: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  if (!member) throw new Error("Member not found");

  const context = buildMemberContext(member);

  const model = new ChatGoogle({
    model: env.GOOGLE_LLM_MODEL,
    apiKey: env.GOOGLE_API_KEY,
  });

  const agent = createAgent({
    model,
    tools: [],
    responseFormat: providerStrategy(generatedStoriesSchema),
  });

  const result = await agent.invoke({
    messages: [
      new HumanMessage(`Sen bir aile tarihçisisin. Aşağıdaki aile üyesi hakkında iki farklı metin yaz:

1. formalStory: Resmi ve yapılandırılmış bir biyografi. Tarihler, yerler ve başarılar belirgin şekilde yer almalı. Ansiklopedik ama sıcak bir üslup kullan. 350-450 kelime.

2. narrativeStory: Sözlü anlatım tarzında, sesli okunmak üzere tasarlanmış bir hikaye. Sanki bir büyükanne torunlarına anlatıyor gibi, akıcı, duygusal ve doğal. Yazılı formatlamadan kaçın (madde işareti, başlık vb. yok). 250-350 kelime.

Her iki metin de:
- Türkçe olmalı
- Yalnızca verilen bilgilere dayanmalı, spekülatif bilgi eklenmemeli
- Tüm mevcut bilgileri (biyografi, ilişkiler, olaylar, fotoğraf açıklamaları, belgeler) doğal şekilde içermeli

Aile Üyesi Bilgileri:
${context}`),
    ],
  });

  const parsed = generatedStoriesSchema.parse(result.structuredResponse);

  return {
    formalStory: parsed.formalStory.trim(),
    narrativeStory: parsed.narrativeStory.trim(),
  };
}

export async function generateAndSaveStory(memberId: string): Promise<void> {
  const existing = await prisma.story.findUnique({ where: { memberId } });
  if (existing?.status === "GENERATING") {
    console.log(`Story already generating for member ${memberId}, skipping`);
    return;
  }

  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { treeId: true },
  });
  if (!member) return;

  await prisma.story.upsert({
    where: { memberId },
    create: { memberId, content: "", status: "GENERATING" },
    update: { status: "GENERATING", error: null },
  });

  try {
    const { formalStory, narrativeStory } = await generateMemberStory(memberId);

    if (existing?.audioPath) {
      await deleteStoryAudio(existing.audioPath);
    }

    let audioPath: string | null = null;
    try {
      audioPath = await generateStoryAudio(narrativeStory, member.treeId, memberId);
    } catch (ttsError) {
      console.error(`TTS failed for member ${memberId}:`, ttsError);
    }

    await prisma.story.update({
      where: { memberId },
      data: {
        content: formalStory,
        narrativeContent: narrativeStory,
        audioPath,
        status: "COMPLETED",
        error: null,
      },
    });

    console.log(`Story generated for member ${memberId}`);
  } catch (error) {
    console.error(`Story generation failed for member ${memberId}:`, error);
    await prisma.story.update({
      where: { memberId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
