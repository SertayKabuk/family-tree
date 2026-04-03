import type { Job } from "pg-boss";
import type {
  StoryGenerationPayload,
  MediaAnalysisPayload,
  MediaIndexingPayload,
} from "./queues";

export async function handleStoryGeneration(
  jobs: Job<StoryGenerationPayload>[]
) {
  for (const job of jobs) {
    const { memberId } = job.data;
    console.log(`[job:story-generation] Starting for member ${memberId}`);

    const { generateAndSaveStory } = await import("@/lib/ai/story");
    await generateAndSaveStory(memberId);

    console.log(`[job:story-generation] Completed for member ${memberId}`);
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
    const { enqueueStoryGeneration } = await import("@/lib/jobs/enqueue");
    await enqueueStoryGeneration(memberId);
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
