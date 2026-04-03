import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { generateStoryAudio, deleteStoryAudio } from "./tts";

function getClient() {
  return new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
}

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

  // Relationships
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

  // Facts
  if (member.facts.length > 0) {
    const factLines = member.facts.map((f) => {
      let line = `- ${f.title}: ${f.content}`;
      if (f.date) line += ` (${f.date.toLocaleDateString("tr-TR")})`;
      if (f.source) line += ` [Kaynak: ${f.source}]`;
      return line;
    });
    lines.push(`\nBilgiler ve Hikayeler:\n${factLines.join("\n")}`);
  }

  // Media summaries
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

export async function generateMemberStory(memberId: string): Promise<string> {
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
  const client = getClient();

  const response = await client.models.generateContent({
    model: env.GOOGLE_LLM_MODEL,
    contents: [
      {
        parts: [
          {
            text: `Sen bir aile tarihçisisin. Aşağıdaki aile üyesi hakkında sıcak, samimi ve duygusal bir biyografik hikaye yaz.

Kurallar:
- Türkçe yaz.
- Yaklaşık 300-400 kelime olsun.
- Hikaye anlatıcı bir üslup kullan, sanki bir büyükanne/büyükbaba torunlarına anlatıyor gibi.
- Eldeki tüm bilgileri (biyografi, ilişkiler, bilgiler/hikayeler, fotoğraf açıklamaları, belgeler) doğal bir şekilde hikayeye örgüle.
- Spekülatif bilgi ekleme, sadece verilen bilgileri kullan.
- Eğer bilgi azsa, kısa ama anlamlı bir hikaye yaz.
- Hikayeyi doğrudan yaz, başlık veya format ekleme.

Aile Üyesi Bilgileri:
${context}`,
          },
        ],
      },
    ],
  });

  const storyText = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!storyText) throw new Error("No story text generated");

  return storyText.trim();
}

export async function generateAndSaveStory(memberId: string): Promise<void> {
  // Skip if already generating
  const existing = await prisma.story.findUnique({ where: { memberId } });
  if (existing?.status === "GENERATING") {
    console.log(`Story already generating for member ${memberId}, skipping`);
    return;
  }

  // Get treeId for audio storage
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { treeId: true },
  });
  if (!member) return;

  // Upsert to GENERATING status
  await prisma.story.upsert({
    where: { memberId },
    create: { memberId, content: "", status: "GENERATING" },
    update: { status: "GENERATING", error: null },
  });

  try {
    const storyText = await generateMemberStory(memberId);

    // Delete old audio if it exists
    if (existing?.audioPath) {
      await deleteStoryAudio(existing.audioPath);
    }

    let audioPath: string | null = null;
    try {
      audioPath = await generateStoryAudio(storyText, member.treeId, memberId);
    } catch (ttsError) {
      console.error(`TTS failed for member ${memberId}:`, ttsError);
      // Still save text even if TTS fails
    }

    await prisma.story.update({
      where: { memberId },
      data: {
        content: storyText,
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
