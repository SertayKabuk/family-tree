import type { Job } from "pg-boss";
import { prisma } from "@/lib/prisma";
import type {
  StoryGenerationPayload,
  TreeStoryGenerationPayload,
  MediaAnalysisPayload,
  MediaIndexingPayload,
} from "./queues";
import {
  clearActiveStoryRun,
  registerActiveStoryRun,
} from "./story-run-registry";
import {
  clearActiveTreeStoryRun,
  registerActiveTreeStoryRun,
} from "./tree-story-run-registry";

function startStorySupersessionWatcher(
  memberId: string,
  jobId: string,
  targetVersion: number,
  controller: AbortController
) {
  let checking = false;

  const interval = setInterval(() => {
    if (checking || controller.signal.aborted) {
      return;
    }

    checking = true;

    void prisma.story.findUnique({
      where: { memberId },
      select: {
        requestedVersion: true,
        activeJobId: true,
      },
    }).then((story) => {
      if (!story) {
        controller.abort(`Story state removed for member ${memberId}`);
        return;
      }

      if (story.requestedVersion > targetVersion) {
        controller.abort(
          `Story version ${targetVersion} for member ${memberId} was superseded by ${story.requestedVersion}`
        );
        return;
      }

      if (story.activeJobId !== jobId) {
        controller.abort(
          `Story job ${jobId} for member ${memberId} is no longer active`
        );
      }
    }).catch((error) => {
      console.error(
        `[job:story-generation] Watcher failed for member ${memberId}:`,
        error
      );
    }).finally(() => {
      checking = false;
    });
  }, 1000);

  return () => clearInterval(interval);
}

export async function handleStoryGeneration(
  jobs: Job<StoryGenerationPayload>[]
) {
  for (const job of jobs) {
    const { memberId } = job.data;
    console.log(`[job:story-generation] Starting job ${job.id} for member ${memberId}`);

    const story = await prisma.story.findUnique({
      where: { memberId },
      select: {
        requestedVersion: true,
        generatedVersion: true,
      },
    });

    if (!story) {
      console.log(`[job:story-generation] No story state found for member ${memberId}, skipping job ${job.id}`);
      continue;
    }

    if (story.generatedVersion >= story.requestedVersion) {
      await prisma.story.updateMany({
        where: {
          memberId,
          queuedJobId: job.id,
        },
        data: {
          queuedJobId: null,
        },
      });

      console.log(`[job:story-generation] Story for member ${memberId} is already fresh, skipping job ${job.id}`);
      continue;
    }

    const targetVersion = story.requestedVersion;
    const claimResult = await prisma.story.updateMany({
      where: {
        memberId,
        requestedVersion: targetVersion,
        activeJobId: null,
      },
      data: {
        activeJobId: job.id,
        queuedJobId: null,
        status: "GENERATING",
        error: null,
        generationStartedAt: new Date(),
      },
    });

    if (claimResult.count === 0) {
      console.log(`[job:story-generation] Job ${job.id} for member ${memberId} could not claim the current version, skipping`);
      continue;
    }

    const controller = new AbortController();
    registerActiveStoryRun(memberId, job.id, controller);
    const stopWatching = startStorySupersessionWatcher(
      memberId,
      job.id,
      targetVersion,
      controller
    );

    try {
      const { generateAndSaveStory } = await import("@/lib/ai/story");
      await generateAndSaveStory(memberId, {
        signal: controller.signal,
        jobId: job.id,
        targetVersion,
      });
    } finally {
      stopWatching();
      clearActiveStoryRun(memberId, job.id);
    }

    console.log(`[job:story-generation] Finished job ${job.id} for member ${memberId}`);
  }
}

function startTreeStorySupersessionWatcher(
  treeId: string,
  jobId: string,
  targetVersion: number,
  controller: AbortController
) {
  let checking = false;

  const interval = setInterval(() => {
    if (checking || controller.signal.aborted) {
      return;
    }

    checking = true;

    void prisma.treeStory.findUnique({
      where: { treeId },
      select: {
        requestedVersion: true,
        activeJobId: true,
      },
    }).then((story) => {
      if (!story) {
        controller.abort(`Tree story state removed for tree ${treeId}`);
        return;
      }

      if (story.requestedVersion > targetVersion) {
        controller.abort(
          `Tree story version ${targetVersion} for tree ${treeId} was superseded by ${story.requestedVersion}`
        );
        return;
      }

      if (story.activeJobId !== jobId) {
        controller.abort(
          `Tree story job ${jobId} for tree ${treeId} is no longer active`
        );
      }
    }).catch((error) => {
      console.error(
        `[job:tree-story-generation] Watcher failed for tree ${treeId}:`,
        error
      );
    }).finally(() => {
      checking = false;
    });
  }, 1000);

  return () => clearInterval(interval);
}

export async function handleTreeStoryGeneration(
  jobs: Job<TreeStoryGenerationPayload>[]
) {
  for (const job of jobs) {
    const { treeId } = job.data;
    console.log(`[job:tree-story-generation] Starting job ${job.id} for tree ${treeId}`);

    const story = await prisma.treeStory.findUnique({
      where: { treeId },
      select: {
        requestedVersion: true,
        generatedVersion: true,
      },
    });

    if (!story) {
      console.log(`[job:tree-story-generation] No tree story state found for tree ${treeId}, skipping job ${job.id}`);
      continue;
    }

    if (story.generatedVersion >= story.requestedVersion) {
      await prisma.treeStory.updateMany({
        where: {
          treeId,
          queuedJobId: job.id,
        },
        data: {
          queuedJobId: null,
        },
      });

      console.log(`[job:tree-story-generation] Tree story for tree ${treeId} is already fresh, skipping job ${job.id}`);
      continue;
    }

    const targetVersion = story.requestedVersion;
    const claimResult = await prisma.treeStory.updateMany({
      where: {
        treeId,
        requestedVersion: targetVersion,
        activeJobId: null,
      },
      data: {
        activeJobId: job.id,
        queuedJobId: null,
        status: "GENERATING",
        error: null,
        generationStartedAt: new Date(),
      },
    });

    if (claimResult.count === 0) {
      console.log(`[job:tree-story-generation] Job ${job.id} for tree ${treeId} could not claim the current version, skipping`);
      continue;
    }

    const controller = new AbortController();
    registerActiveTreeStoryRun(treeId, job.id, controller);
    const stopWatching = startTreeStorySupersessionWatcher(
      treeId,
      job.id,
      targetVersion,
      controller
    );

    try {
      const { generateAndSaveTreeStory } = await import("@/lib/ai/tree-story");
      await generateAndSaveTreeStory(treeId, {
        signal: controller.signal,
        jobId: job.id,
        targetVersion,
      });
    } finally {
      stopWatching();
      clearActiveTreeStoryRun(treeId, job.id);
    }

    console.log(`[job:tree-story-generation] Finished job ${job.id} for tree ${treeId}`);
  }
}

export async function handleMediaAnalysis(
  jobs: Job<MediaAnalysisPayload>[]
) {
  for (const job of jobs) {
    const { type, recordId, filePath, memberId } = job.data;
    console.log(
      `[job:media-analysis] Starting ${type} analysis for record ${recordId}`
    );

    const { analyzePhoto, analyzeDocument, analyzeAudioClip } = await import(
      "@/lib/ai/analyze"
    );

    if (type === "photos") {
      await analyzePhoto(recordId, filePath);
    } else if (type === "documents") {
      await analyzeDocument(recordId, filePath);
    } else if (type === "audio") {
      await analyzeAudioClip(recordId, filePath);
    }

    console.log(
      `[job:media-analysis] Completed ${type} analysis for record ${recordId}, triggering story regeneration for member ${memberId}`
    );

    // Chain: after media analysis completes, regenerate the member's story
    const { requestStoryGeneration } = await import("@/lib/jobs/enqueue");
    await requestStoryGeneration(memberId);
  }
}

export async function handleMediaIndexing(
  jobs: Job<MediaIndexingPayload>[]
) {
  for (const job of jobs) {
    const { jobType, resourceType, resourceId, metadata } = job.data;
  console.log(
    `[job:media-indexing] Starting ${jobType} for ${resourceType} ${resourceId}`
  );

  const { embedMedia } = await import("@/lib/ai/embedding");
  const { saveVector, deleteVectorByResourceId } = await import(
    "@/lib/ai/vector-store"
  );

  if (jobType === "DELETE") {
    await deleteVectorByResourceId(resourceId);
  } else if (jobType === "INDEX") {
    const filePath = (metadata.filePath || metadata.url) as string | undefined;
    if (!filePath) throw new Error("File path missing in job metadata");

    const ext = filePath.split(".").pop()?.toLowerCase();
    let mimeType = "application/octet-stream";
    if (resourceType === "PHOTO")
      mimeType = ext === "png" ? "image/png" : "image/jpeg";
    else if (resourceType === "AUDIO")
      mimeType = ext === "wav" ? "audio/wav" : "audio/mpeg";
    else if (resourceType === "DOCUMENT") mimeType = "application/pdf";

    const embedding = await embedMedia(filePath, mimeType);

    const label = { PHOTO: "Fotoğraf", AUDIO: "Ses Kaydı", DOCUMENT: "Belge" }[
      resourceType
    ];
    const parts: string[] = [label];
    if (metadata.title) parts.push(`"${metadata.title}"`);
    if (metadata.description) parts.push(String(metadata.description));
    if (metadata.memberId) parts.push(`(Üye: ${metadata.memberId})`);
    const content = parts.join(" — ");

    await saveVector(
      content,
      { resourceId, type: resourceType, ...metadata },
      embedding
    );
  }

    console.log(
      `[job:media-indexing] Completed ${jobType} for ${resourceType} ${resourceId}`
    );
  }
}
