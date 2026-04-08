-- CreateTable
CREATE TABLE "TreeStory" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "narrativeContent" TEXT,
    "audioPath" TEXT,
    "status" "StoryStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "requestedVersion" INTEGER NOT NULL DEFAULT 0,
    "generatedVersion" INTEGER NOT NULL DEFAULT 0,
    "queuedJobId" TEXT,
    "activeJobId" TEXT,
    "generationRequestedAt" TIMESTAMP(3),
    "generationStartedAt" TIMESTAMP(3),
    "generationCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreeStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreeStory_treeId_idx" ON "TreeStory"("treeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeStory_treeId_key" ON "TreeStory"("treeId");

-- AddForeignKey
ALTER TABLE "TreeStory" ADD CONSTRAINT "TreeStory_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;
