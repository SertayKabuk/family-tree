import { getBoss } from "./boss";
import { prisma } from "@/lib/prisma";
import { abortActiveStoryRun } from "./story-run-registry";
import {
  QUEUES,
  type StoryGenerationPayload,
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

async function scheduleStoryGenerationJob(memberId: string, immediate: boolean) {
  const boss = await getBoss();
  const payload = { memberId } satisfies StoryGenerationPayload;
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
  options: { immediate?: boolean } = {}
) {
  const immediate = options.immediate ?? false;
  const requestedAt = new Date();
  const boss = await getBoss();
  const existingStory = await prisma.story.findUnique({
    where: { memberId },
  }) as { queuedJobId: string | null; activeJobId: string | null } | null;

  const story = await prisma.story.upsert({
    where: { memberId },
    create: {
      memberId,
      content: "",
      status: "PENDING",
      error: null,
      requestedVersion: 1,
      generationRequestedAt: requestedAt,
    },
    update: {
      requestedVersion: { increment: 1 },
      status: "PENDING",
      error: null,
      activeJobId: null,
      queuedJobId: null,
      generationRequestedAt: requestedAt,
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

  const jobId = await scheduleStoryGenerationJob(memberId, immediate);

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
