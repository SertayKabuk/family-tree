import { getBoss } from "./boss";
import { prisma } from "@/lib/prisma";
import { abortActiveStoryRun } from "./story-run-registry";
import { abortActiveTreeStoryRun } from "./tree-story-run-registry";
import {
  QUEUES,
  type StoryGenerationPayload,
  type TreeStoryGenerationPayload,
  type StoryStyleOptions,
  type MediaAnalysisPayload,
  type MediaIndexingPayload,
} from "./queues";

export const STORY_GENERATION_QUIET_WINDOW_SECONDS = 30;

function getStoryGenerationJobOptions(memberId: string) {
  return {
    singletonKey: memberId,
    retryLimit: 3,
    retryBackoff: true,
    expireInSeconds: 15 * 60,
  };
}

async function scheduleStoryGenerationJob(memberId: string, immediate: boolean, styleOptions?: StoryStyleOptions) {
  const boss = await getBoss();
  const payload = { memberId, ...styleOptions } satisfies StoryGenerationPayload;
  const options = getStoryGenerationJobOptions(memberId);

  const jobId = immediate
    ? await boss.send(QUEUES.STORY_GENERATION, payload, options)
    : await boss.sendAfter(
        QUEUES.STORY_GENERATION,
        payload,
        options,
        STORY_GENERATION_QUIET_WINDOW_SECONDS
      );

  return jobId;
}

export async function requestStoryGeneration(
  memberId: string,
  options: { immediate?: boolean } & StoryStyleOptions = {}
) {
  const immediate = options.immediate ?? false;
  const styleOptions: StoryStyleOptions = {
    storyStyle: options.storyStyle,
    customPrompt: options.customPrompt,
    locale: options.locale,
  };
  const requestedAt = new Date();
  const boss = await getBoss();
  const existingStory = await prisma.story.findUnique({
    where: { memberId },
  }) as { queuedJobId: string | null; activeJobId: string | null } | null;

  const styleUpdate = {
    ...(styleOptions.storyStyle ? { storyStyle: styleOptions.storyStyle, customPrompt: styleOptions.customPrompt ?? null } : {}),
    ...(styleOptions.locale ? { locale: styleOptions.locale } : {}),
  };

  const story = await prisma.story.upsert({
    where: { memberId },
    create: {
      memberId,
      content: "",
      status: "PENDING",
      error: null,
      requestedVersion: 1,
      generationRequestedAt: requestedAt,
      ...styleUpdate,
    },
    update: {
      requestedVersion: { increment: 1 },
      status: "PENDING",
      error: null,
      activeJobId: null,
      queuedJobId: null,
      generationRequestedAt: requestedAt,
      ...styleUpdate,
    },
  }) as unknown as { requestedVersion: number };

  const idsToCancel = [...new Set([
    existingStory?.queuedJobId,
    existingStory?.activeJobId,
  ].filter((jobId): jobId is string => Boolean(jobId)))];

  await Promise.allSettled(
    idsToCancel.map((jobId) => boss.cancel(QUEUES.STORY_GENERATION, jobId))
  );

  if (existingStory?.activeJobId) {
    abortActiveStoryRun(memberId, `Story generation superseded for member ${memberId}`);
  }

  const jobId = await scheduleStoryGenerationJob(memberId, immediate, styleOptions);

  if (!jobId) {
    console.warn(
      `[request] story-generation for member ${memberId} did not create a new ${immediate ? "immediate" : "delayed"} job`
    );
    return { jobId: null, requestedVersion: story.requestedVersion };
  }

  const updateResult = await prisma.story.updateMany({
    where: {
      memberId,
      requestedVersion: story.requestedVersion,
    },
    data: {
      queuedJobId: jobId,
    },
  });

  if (updateResult.count === 0) {
    await Promise.allSettled([
      boss.cancel(QUEUES.STORY_GENERATION, jobId),
    ]);

    console.log(
      `[request] story-generation for member ${memberId} was superseded before job ${jobId} could be persisted`
    );

    return { jobId: null, requestedVersion: story.requestedVersion };
  }

  console.log(
    `[request] story-generation (${immediate ? "immediate" : `after ${STORY_GENERATION_QUIET_WINDOW_SECONDS}s`}) for member ${memberId} -> job ${jobId}`
  );

  return { jobId, requestedVersion: story.requestedVersion };
}

export async function enqueueStoryGeneration(memberId: string) {
  return requestStoryGeneration(memberId, { immediate: true });
}

export async function requestTreeStoryGeneration(
  treeId: string,
  options: { immediate?: boolean } & StoryStyleOptions = {}
) {
  const immediate = options.immediate ?? false;
  const styleOptions: StoryStyleOptions = {
    storyStyle: options.storyStyle,
    customPrompt: options.customPrompt,
    locale: options.locale,
  };
  const requestedAt = new Date();
  const boss = await getBoss();
  const existingStory = await prisma.treeStory.findUnique({
    where: { treeId },
  }) as { queuedJobId: string | null; activeJobId: string | null } | null;

  const styleUpdate = {
    ...(styleOptions.storyStyle ? { storyStyle: styleOptions.storyStyle, customPrompt: styleOptions.customPrompt ?? null } : {}),
    ...(styleOptions.locale ? { locale: styleOptions.locale } : {}),
  };

  const story = await prisma.treeStory.upsert({
    where: { treeId },
    create: {
      treeId,
      content: "",
      status: "PENDING",
      error: null,
      requestedVersion: 1,
      generationRequestedAt: requestedAt,
      ...styleUpdate,
    },
    update: {
      requestedVersion: { increment: 1 },
      status: "PENDING",
      error: null,
      activeJobId: null,
      queuedJobId: null,
      generationRequestedAt: requestedAt,
      ...styleUpdate,
    },
  }) as unknown as { requestedVersion: number };

  const idsToCancel = [...new Set([
    existingStory?.queuedJobId,
    existingStory?.activeJobId,
  ].filter((jobId): jobId is string => Boolean(jobId)))];

  await Promise.allSettled(
    idsToCancel.map((jobId) => boss.cancel(QUEUES.TREE_STORY_GENERATION, jobId))
  );

  if (existingStory?.activeJobId) {
    abortActiveTreeStoryRun(treeId, `Tree story generation superseded for tree ${treeId}`);
  }

  const jobId = await scheduleTreeStoryGenerationJob(treeId, immediate, styleOptions);

  if (!jobId) {
    console.warn(
      `[request] tree-story-generation for tree ${treeId} did not create a new ${immediate ? "immediate" : "delayed"} job`
    );
    return { jobId: null, requestedVersion: story.requestedVersion };
  }

  const updateResult = await prisma.treeStory.updateMany({
    where: {
      treeId,
      requestedVersion: story.requestedVersion,
    },
    data: {
      queuedJobId: jobId,
    },
  });

  if (updateResult.count === 0) {
    await Promise.allSettled([
      boss.cancel(QUEUES.TREE_STORY_GENERATION, jobId),
    ]);

    console.log(
      `[request] tree-story-generation for tree ${treeId} was superseded before job ${jobId} could be persisted`
    );

    return { jobId: null, requestedVersion: story.requestedVersion };
  }

  console.log(
    `[request] tree-story-generation (${immediate ? "immediate" : `after ${STORY_GENERATION_QUIET_WINDOW_SECONDS}s`}) for tree ${treeId} -> job ${jobId}`
  );

  return { jobId, requestedVersion: story.requestedVersion };
}

function getTreeStoryGenerationJobOptions(treeId: string) {
  return {
    singletonKey: `tree-${treeId}`,
    retryLimit: 3,
    retryBackoff: true,
    expireInSeconds: 15 * 60,
  };
}

async function scheduleTreeStoryGenerationJob(treeId: string, immediate: boolean, styleOptions?: StoryStyleOptions) {
  const boss = await getBoss();
  const payload = { treeId, ...styleOptions } satisfies TreeStoryGenerationPayload;
  const options = getTreeStoryGenerationJobOptions(treeId);

  const jobId = immediate
    ? await boss.send(QUEUES.TREE_STORY_GENERATION, payload, options)
    : await boss.sendAfter(
        QUEUES.TREE_STORY_GENERATION,
        payload,
        options,
        STORY_GENERATION_QUIET_WINDOW_SECONDS
      );

  return jobId;
}

export async function enqueueMediaAnalysis(
  type: MediaAnalysisPayload["type"],
  recordId: string,
  filePath: string,
  memberId: string
) {
  const boss = await getBoss();
  const jobId = await boss.send(
    QUEUES.MEDIA_ANALYSIS,
    { type, recordId, filePath, memberId } satisfies MediaAnalysisPayload,
    {
      retryLimit: 3,
      retryBackoff: true,
      expireInSeconds: 15 * 60,
    }
  );
  console.log(`[enqueue] media-analysis (${type}) for record ${recordId} -> job ${jobId}`);
  return jobId;
}

export async function enqueueMediaIndexing(
  jobType: MediaIndexingPayload["jobType"],
  resourceType: MediaIndexingPayload["resourceType"],
  resourceId: string,
  metadata: Record<string, unknown> = {}
) {
  const boss = await getBoss();
  const jobId = await boss.send(
    QUEUES.MEDIA_INDEXING,
    { jobType, resourceType, resourceId, metadata } satisfies MediaIndexingPayload,
    {
      retryLimit: 3,
      retryBackoff: true,
      expireInSeconds: 15 * 60,
    }
  );
  console.log(`[enqueue] media-indexing (${jobType} ${resourceType}) for ${resourceId} -> job ${jobId}`);
  return jobId;
}
