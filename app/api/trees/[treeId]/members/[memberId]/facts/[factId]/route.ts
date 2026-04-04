import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { z } from "zod";

const updateFactSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  date: z.string().nullable().optional(),
  source: z.string().max(200).nullable().optional(),
});

type Params = { params: Promise<{ treeId: string; memberId: string; factId: string }> };

// PATCH /api/trees/[treeId]/members/[memberId]/facts/[factId]
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { treeId, memberId, factId } = await params;
    await requirePermission(treeId, "manage_members");

    const fact = await prisma.fact.findFirst({
      where: { id: factId, memberId },
    });
    if (!fact) {
      return NextResponse.json({ error: "Fact not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateFactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, content, date, source } = parsed.data;

    const updated = await prisma.fact.update({
      where: { id: factId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(date !== undefined && { date: date ? new Date(date) : null }),
        ...(source !== undefined && { source: source || null }),
      },
    });

    await prisma.familyTree.update({
      where: { id: treeId },
      data: { updatedAt: new Date() },
    });

    const { enqueueStoryGeneration } = await import("@/lib/jobs/enqueue");
    await enqueueStoryGeneration(memberId);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error updating fact:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/trees/[treeId]/members/[memberId]/facts/[factId]
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { treeId, memberId, factId } = await params;
    await requirePermission(treeId, "manage_members");

    const fact = await prisma.fact.findFirst({
      where: { id: factId, memberId },
    });
    if (!fact) {
      return NextResponse.json({ error: "Fact not found" }, { status: 404 });
    }

    await prisma.fact.delete({ where: { id: factId } });

    await prisma.familyTree.update({
      where: { id: treeId },
      data: { updatedAt: new Date() },
    });

    const { enqueueStoryGeneration } = await import("@/lib/jobs/enqueue");
    await enqueueStoryGeneration(memberId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error deleting fact:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
