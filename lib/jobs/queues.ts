export const QUEUES = {
  STORY_GENERATION: "story-generation",
  MEDIA_ANALYSIS: "media-analysis",
  MEDIA_INDEXING: "media-indexing",
} as const;

export interface StoryGenerationPayload {
  memberId: string;
}

export interface MediaAnalysisPayload {
  type: "photos" | "documents" | "audio";
  recordId: string;
  filePath: string;
  memberId: string;
}

export interface MediaIndexingPayload {
  jobType: "INDEX" | "DELETE";
  resourceType: "PHOTO" | "DOCUMENT" | "AUDIO";
  resourceId: string;
  metadata: Record<string, unknown>;
}
