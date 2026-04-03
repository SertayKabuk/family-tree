import { getBoss } from "./boss";
import { QUEUES } from "./queues";
import {
  handleStoryGeneration,
  handleMediaAnalysis,
  handleMediaIndexing,
} from "./handlers";

export async function startWorkers() {
  const boss = await getBoss();

  // Ensure queues exist before registering workers (pg-boss v12 requirement)
  await boss.createQueue(QUEUES.STORY_GENERATION);
  await boss.createQueue(QUEUES.MEDIA_ANALYSIS);
  await boss.createQueue(QUEUES.MEDIA_INDEXING);

  await boss.work(
    QUEUES.STORY_GENERATION,
    { localConcurrency: 2 },
    handleStoryGeneration
  );

  await boss.work(
    QUEUES.MEDIA_ANALYSIS,
    { localConcurrency: 2 },
    handleMediaAnalysis
  );

  await boss.work(
    QUEUES.MEDIA_INDEXING,
    { localConcurrency: 2 },
    handleMediaIndexing
  );

  console.log("[pg-boss] Workers registered for all queues");
}
