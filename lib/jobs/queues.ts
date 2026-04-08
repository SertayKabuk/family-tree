export const QUEUES = {
  STORY_GENERATION: "story-generation",
  TREE_STORY_GENERATION: "tree-story-generation",
  MEDIA_ANALYSIS: "media-analysis",
  MEDIA_INDEXING: "media-indexing",
} as const;

export interface StoryStyleOptions {
  storyStyle?: string;
  customPrompt?: string | null;
  locale?: string;
}

export interface StoryGenerationPayload {
  memberId: string;
  storyStyle?: string;
  customPrompt?: string | null;
}

export interface TreeStoryGenerationPayload {
  treeId: string;
  storyStyle?: string;
  customPrompt?: string | null;
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
