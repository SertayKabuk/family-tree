-- AlterTable
ALTER TABLE "Story" ADD COLUMN "storyStyle" TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE "Story" ADD COLUMN "customPrompt" TEXT;

-- AlterTable
ALTER TABLE "TreeStory" ADD COLUMN "storyStyle" TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE "TreeStory" ADD COLUMN "customPrompt" TEXT;
