-- AlterTable
ALTER TABLE "Story"
ADD COLUMN     "requestedVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "generatedVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "queuedJobId" TEXT,
ADD COLUMN     "activeJobId" TEXT,
ADD COLUMN     "generationRequestedAt" TIMESTAMP(3),
ADD COLUMN     "generationStartedAt" TIMESTAMP(3),
ADD COLUMN     "generationCompletedAt" TIMESTAMP(3);
