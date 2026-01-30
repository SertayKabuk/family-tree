import { NextResponse } from "next/server";
import { processJob } from "@/lib/ai/indexing";
import { prisma } from "@/lib/prisma";

// This route processes pending indexing jobs.
// It can be triggered by Cron or by the upload handler (fire & forget).
export async function POST(req: Request) {
    try {
        // If a specific jobId is provided, process that one (priority/immediate)
        // Otherwise pick the oldest PENDING job.

        let body = {};
        try { body = await req.json(); } catch { }
        const { jobId } = body as { jobId?: string };

        if (jobId) {
            // Fastest path for immediate triggering
            // We don't await the full process in the main thread usually, but here WE ARE the worker.
            // So we await it.
            await processJob(jobId);
            return NextResponse.json({ success: true, processed: jobId });
        }

        // Default: Pick next pending job
        const job = await prisma.indexingJob.findFirst({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' }
        });

        if (job) {
            await processJob(job.id);
            return NextResponse.json({ success: true, processed: job.id });
        }

        return NextResponse.json({ success: true, processed: null });

    } catch (error) {
        console.error("Worker error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
