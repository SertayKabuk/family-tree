import { getBoss } from "./boss";
import {
  QUEUES,
  type StoryGenerationPayload,
  type MediaAnalysisPayload,
  type MediaIndexingPayload,
} from "./queues";

export async function enqueueStoryGeneration(memberId: string) {
  const boss = await getBoss();
  const jobId = await boss.send(QUEUES.STORY_GENERATION, { memberId } satisfies StoryGenerationPayload, {
    singletonKey: memberId,
    retryLimit: 3,
    retryBackoff: true,
    expireInSeconds: 15 * 60,
  });
  console.log(`[enqueue] story-generation for member ${memberId} -> job ${jobId}`);
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
