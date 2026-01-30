-- CreateTable
CREATE TABLE "IndexingJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndexingJob_status_idx" ON "IndexingJob"("status");
