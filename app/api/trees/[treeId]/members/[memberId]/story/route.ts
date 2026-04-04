import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { deleteStoryAudio } from "@/lib/ai/tts";
import { requestStoryGeneration } from "@/lib/jobs/enqueue";

// GET /api/trees/[treeId]/members/[memberId]/story - Get member story
export async function GET(
  request: Request,
  { params }: { params: Promise<{ treeId: string; memberId: string }> }
) {
  try {
    const { treeId, memberId } = await params;
    await requirePermission(treeId, "view");

    const member = await prisma.familyMember.findFirst({
      where: { id: memberId, treeId },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const story = await prisma.story.findUnique({
      where: { memberId },
    });

    if (!story) {
      return NextResponse.json({ error: "No story found" }, { status: 404 });
    }

    return NextResponse.json(story);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error fetching story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/trees/[treeId]/members/[memberId]/story - Generate/regenerate story
export async function POST(
  request: Request,
  { params }: { params: Promise<{ treeId: string; memberId: string }> }
) {
  try {
    const { treeId, memberId } = await params;
    await requirePermission(treeId, "manage_members");

    const member = await prisma.familyMember.findFirst({
      where: { id: memberId, treeId },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await requestStoryGeneration(memberId, { immediate: true });

    return NextResponse.json({ message: "Story generation requested", status: "PENDING" }, { status: 202 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error triggering story generation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/trees/[treeId]/members/[memberId]/story - Delete story
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ treeId: string; memberId: string }> }
) {
  try {
    const { treeId, memberId } = await params;
    await requirePermission(treeId, "manage_members");

    const member = await prisma.familyMember.findFirst({
      where: { id: memberId, treeId },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const story = await prisma.story.findUnique({ where: { memberId } });
    if (!story) {
      return NextResponse.json({ error: "No story found" }, { status: 404 });
    }

    if (story.audioPath) {
      await deleteStoryAudio(story.audioPath);
    }

    await prisma.story.delete({ where: { memberId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error deleting story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
