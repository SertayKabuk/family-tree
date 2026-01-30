import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { analyzeImage, transcribeAudio, extractDocumentText } from "./multimodal";
import { generateEmbedding } from "./embedding";
import { saveVector, deleteVectorByResourceId } from "./vector-store";

type ResourceType = 'PHOTO' | 'DOCUMENT' | 'AUDIO';
type JobType = 'INDEX' | 'DELETE';

export async function queueIndexingJob(
    type: JobType,
    resourceType: ResourceType,
    resourceId: string,
    extraMetadata: Prisma.InputJsonValue = {}
) {
    try {
        const job = await prisma.indexingJob.create({
            data: {
                type,
                resourceType,
                resourceId,
                metadata: extraMetadata,
                status: 'PENDING'
            }
        });

        // Fire and forget trigger for processing
        try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            fetch(`${baseUrl}/api/cron/indexing`, {
                method: 'POST',
                body: JSON.stringify({ jobId: job.id }),
                headers: { 'Content-Type': 'application/json' }
            }).catch(err => console.error("Failed to trigger background processing:", err));
        } catch {
            // Ignore URL construction errors
        }

        console.log(`Queued ${type} job for ${resourceType} ${resourceId}`);
        return job;
    } catch (error) {
        console.error("Failed to queue job", error);
        throw error;
    }
}

export async function processJob(jobId: string) {
    const job = await prisma.indexingJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    await prisma.indexingJob.update({ where: { id: jobId }, data: { status: 'PROCESSING', attempts: { increment: 1 } } });

    try {
        const { type, resourceType, resourceId, metadata } = job;
        const meta = (metadata as Record<string, unknown>) || {};

        if (type === 'DELETE') {
            await deleteVectorByResourceId(resourceId);
        } else if (type === 'INDEX') {
            let textContent = "";
            // We must ensure metadata has 'filePath' or 'url'.
            const filePath = (meta.filePath || meta.url) as string | undefined;
            if (!filePath) throw new Error("File path missing in job metadata");

            switch (resourceType) {
                case 'PHOTO':
                    textContent = await analyzeImage(filePath);
                    break;
                case 'AUDIO':
                    textContent = await transcribeAudio(filePath);
                    break;
                case 'DOCUMENT':
                    textContent = await extractDocumentText(filePath);
                    break;
            }

            if (textContent && textContent.trim().length > 0) {
                const embedding = await generateEmbedding(textContent);
                await saveVector(textContent, { resourceId, type: resourceType, ...meta }, embedding);
            }
        }

        await prisma.indexingJob.update({ where: { id: jobId }, data: { status: 'COMPLETED' } });
        console.log(`Job ${jobId} completed`);

    } catch (error) {
        console.error(`Job ${jobId} failed`, error);
        await prisma.indexingJob.update({
            where: { id: jobId },
            data: {
                status: 'FAILED',
                error: error instanceof Error ? error.message : String(error)
            }
        });
    }
}
