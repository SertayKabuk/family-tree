import { z } from "zod";
import { createAgent, providerStrategy } from "langchain";
import { ChatGoogle } from "@langchain/google";
import { HumanMessage } from "@langchain/core/messages";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { generateStoryAudio, deleteStoryAudio } from "./tts";
import { buildMemberStoryPrompt, type StoryStyle, DEFAULT_STORY_STYLE } from "@/lib/story-styles";
import { defaultLocale, type Locale } from "@/i18n/config";
import { contextLabels, getDateLocaleTag } from "@/lib/ai/context-labels";

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
}, locale: Locale = defaultLocale): string {
  const l = contextLabels[locale] ?? contextLabels.tr;
  const dateTag = getDateLocaleTag(locale);
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
  const lines: string[] = [];

  lines.push(`${l.name}: ${fullName}`);
  if (member.nickname) lines.push(`${l.nickname}: "${member.nickname}"`);
  lines.push(`${l.gender}: ${member.gender}`);

  if (member.birthDate) {
    const bd = member.birthDate.toLocaleDateString(dateTag, { year: "numeric", month: "long", day: "numeric" });
    lines.push(`${l.birthDate}: ${bd}${member.birthPlace ? `, ${member.birthPlace}` : ""}`);
  }
  if (member.deathDate) {
    const dd = member.deathDate.toLocaleDateString(dateTag, { year: "numeric", month: "long", day: "numeric" });
    lines.push(`${l.deathDate}: ${dd}${member.deathPlace ? `, ${member.deathPlace}` : ""}`);
  }
  if (member.occupation) lines.push(`${l.occupation}: ${member.occupation}`);
  if (member.bio) lines.push(`\n${l.biography}:\n${member.bio}`);

  const relLines: string[] = [];
  for (const r of member.relationshipsFrom) {
    const name = [r.toMember.firstName, r.toMember.lastName].filter(Boolean).join(" ");
    relLines.push(`- ${r.type}: ${name}`);
  }
  for (const r of member.relationshipsTo) {
    const name = [r.fromMember.firstName, r.fromMember.lastName].filter(Boolean).join(" ");
    relLines.push(`- ${r.type} (${l.reverse}): ${name}`);
  }
  if (relLines.length > 0) {
    lines.push(`\n${l.relationships}:\n${relLines.join("\n")}`);
  }

  if (member.facts.length > 0) {
    const factLines = member.facts.map((f) => {
      let line = `- ${f.title}: ${f.content}`;
      if (f.date) line += ` (${f.date.toLocaleDateString(dateTag)})`;
      if (f.source) line += ` [${l.source}: ${f.source}]`;
      return line;
    });
    lines.push(`\n${l.factsAndStories}:\n${factLines.join("\n")}`);
  }

  if (member.photos.length > 0) {
    const photoLines = member.photos
      .map((p) => {
        const desc = p.aiDescription || p.description;
        return `- ${p.title || l.photo}${desc ? `: ${desc}` : ""}`;
      })
      .join("\n");
    lines.push(`\n${l.photos} (${member.photos.length}):\n${photoLines}`);
  }
  if (member.documents.length > 0) {
    const docLines = member.documents
      .map((d) => {
        const desc = d.aiDescription || d.description;
        return `- ${d.title}${desc ? `: ${desc}` : ""}`;
      })
      .join("\n");
    lines.push(`\n${l.documents} (${member.documents.length}):\n${docLines}`);
  }
  if (member.audioClips.length > 0) {
    const audioLines = member.audioClips
      .map((a) => {
        const desc = a.aiDescription || a.description;
        return `- ${a.title}${desc ? `: ${desc}` : ""}`;
      })
      .join("\n");
    lines.push(`\n${l.audioClips} (${member.audioClips.length}):\n${audioLines}`);
  }

  return lines.join("\n");
}

const generatedStoriesSchema = z.object({
  formalStory: z.string().describe("Resmi biyografik metin, UI'da görüntülenecek."),
  narrativeStory: z.string().describe("Sözlü anlatım hikayesi, sesli okuma için."),
});

type GeneratedStories = z.infer<typeof generatedStoriesSchema>;

export interface StoryGenerationRunOptions {
  signal?: AbortSignal;
  jobId?: string;
  targetVersion?: number;
}

class StoryGenerationSupersededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoryGenerationSupersededError";
  }
}

function isAbortError(error: unknown) {
  if (error instanceof StoryGenerationSupersededError) {
    return true;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof Error) {
    return error.name === "AbortError" || /abort|aborted|superseded/i.test(error.message);
  }

  return false;
}

function throwIfSignalAborted(signal?: AbortSignal) {
  if (!signal?.aborted) {
    return;
  }

  const { reason } = signal;
  if (reason instanceof Error) {
    throw reason;
  }

  throw new StoryGenerationSupersededError(
    typeof reason === "string" ? reason : "Story generation aborted"
  );
}

async function assertStoryRunCurrent(
  memberId: string,
  targetVersion: number,
  jobId?: string,
  signal?: AbortSignal
) {
  throwIfSignalAborted(signal);

  const story = await prisma.story.findUnique({
    where: { memberId },
    select: {
      requestedVersion: true,
      generatedVersion: true,
      activeJobId: true,
    },
  });

  if (!story) {
    throw new StoryGenerationSupersededError(
      `Story state no longer exists for member ${memberId}`
    );
  }

  if (story.requestedVersion > targetVersion) {
    throw new StoryGenerationSupersededError(
      `Story version ${targetVersion} for member ${memberId} was superseded by version ${story.requestedVersion}`
    );
  }

  if (jobId && story.activeJobId !== jobId) {
    throw new StoryGenerationSupersededError(
      `Story job ${jobId} for member ${memberId} is no longer the active run`
    );
  }

  throwIfSignalAborted(signal);

  return story;
}

export async function generateMemberStory(
  memberId: string,
  options: StoryGenerationRunOptions = {}
): Promise<GeneratedStories> {
  throwIfSignalAborted(options.signal);

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

  const storyRecord = await prisma.story.findUnique({
    where: { memberId },
    select: { storyStyle: true, customPrompt: true, locale: true },
  });

  const style = (storyRecord?.storyStyle as StoryStyle) || DEFAULT_STORY_STYLE;
  const locale = (storyRecord?.locale as Locale) || defaultLocale;
  const customPrompt = storyRecord?.customPrompt;

  const context = buildMemberContext(member, locale);
  const prompt = buildMemberStoryPrompt({ locale, style, customPrompt }, context);

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
    messages: [new HumanMessage(prompt)],
  }, {
    signal: options.signal,
  });

  const parsed = generatedStoriesSchema.parse(result.structuredResponse);

  return {
    formalStory: parsed.formalStory.trim(),
    narrativeStory: parsed.narrativeStory.trim(),
  };
}

export async function generateAndSaveStory(
  memberId: string,
  options: StoryGenerationRunOptions = {}
): Promise<void> {
  const existing = await prisma.story.findUnique({
    where: { memberId },
    select: {
      audioPath: true,
      requestedVersion: true,
      generatedVersion: true,
      locale: true,
    },
  });

  if (!existing) {
    return;
  }

  const targetVersion = options.targetVersion ?? existing.requestedVersion;

  try {
    await assertStoryRunCurrent(memberId, targetVersion, options.jobId, options.signal);

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { treeId: true },
    });
    if (!member) {
      throw new StoryGenerationSupersededError(`Member ${memberId} no longer exists`);
    }

    const previousAudioPath = existing.audioPath;
    const { formalStory, narrativeStory } = await generateMemberStory(memberId, options);

    await assertStoryRunCurrent(memberId, targetVersion, options.jobId, options.signal);

    let audioPath: string | null = null;
    try {
      audioPath = await generateStoryAudio(narrativeStory, member.treeId, memberId, {
        signal: options.signal,
        locale: (existing.locale as Locale) || defaultLocale,
      });
    } catch (ttsError) {
      if (isAbortError(ttsError)) {
        throw ttsError;
      }

      console.error(`TTS failed for member ${memberId}:`, ttsError);
    }

    await assertStoryRunCurrent(memberId, targetVersion, options.jobId, options.signal);

    const updateResult = await prisma.story.updateMany({
      where: {
        memberId,
        requestedVersion: targetVersion,
        ...(options.jobId ? { activeJobId: options.jobId } : {}),
      },
      data: {
        content: formalStory,
        narrativeContent: narrativeStory,
        audioPath,
        status: "COMPLETED",
        error: null,
        generatedVersion: targetVersion,
        queuedJobId: null,
        activeJobId: null,
        generationCompletedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new StoryGenerationSupersededError(
        `Story version ${targetVersion} for member ${memberId} became stale before save`
      );
    }

    if (previousAudioPath && previousAudioPath !== audioPath) {
      await deleteStoryAudio(previousAudioPath);
    }

    console.log(`Story generated for member ${memberId}`);
  } catch (error) {
    if (isAbortError(error)) {
      console.log(`Story generation aborted for member ${memberId}:`, error);

      if (options.jobId) {
        await prisma.story.updateMany({
          where: {
            memberId,
            activeJobId: options.jobId,
          },
          data: {
            activeJobId: null,
            status: "PENDING",
            error: null,
          },
        });
      }

      return;
    }

    console.error(`Story generation failed for member ${memberId}:`, error);

    const currentStory = await prisma.story.findUnique({
      where: { memberId },
      select: {
        requestedVersion: true,
        activeJobId: true,
      },
    });

    if (!currentStory || currentStory.requestedVersion > targetVersion) {
      if (options.jobId) {
        await prisma.story.updateMany({
          where: {
            memberId,
            activeJobId: options.jobId,
          },
          data: {
            activeJobId: null,
            status: "PENDING",
            error: null,
          },
        });
      }

      return;
    }

    await prisma.story.updateMany({
      where: {
        memberId,
        ...(options.jobId ? { activeJobId: options.jobId } : {}),
      },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
        activeJobId: null,
        queuedJobId: null,
      },
    });
  }
}
