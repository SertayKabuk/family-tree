import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { deleteStoryAudio } from "@/lib/ai/tts";
import { requestTreeStoryGeneration } from "@/lib/jobs/enqueue";
import { getLocale } from "next-intl/server";

// GET /api/trees/[treeId]/story - Get tree story
export async function GET(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "view");

    const story = await prisma.treeStory.findUnique({
      where: { treeId },
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
    console.error("Error fetching tree story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/trees/[treeId]/story - Generate/regenerate tree story
export async function POST(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "manage_members");

    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
      select: { id: true, _count: { select: { familyMembers: true } } },
    });

    if (!tree) {
      return NextResponse.json({ error: "Tree not found" }, { status: 404 });
    }

    if (tree._count.familyMembers === 0) {
      return NextResponse.json({ error: "Tree has no members" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { storyStyle, customPrompt } = body as { storyStyle?: string; customPrompt?: string };
    const locale = await getLocale();

    await requestTreeStoryGeneration(treeId, { immediate: true, storyStyle, customPrompt, locale });

    return NextResponse.json({ message: "Tree story generation requested", status: "PENDING" }, { status: 202 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error triggering tree story generation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/trees/[treeId]/story - Delete tree story
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "manage_members");

    const story = await prisma.treeStory.findUnique({ where: { treeId } });
    if (!story) {
      return NextResponse.json({ error: "No story found" }, { status: 404 });
    }

    if (story.audioPath) {
      await deleteStoryAudio(story.audioPath);
    }

    await prisma.treeStory.delete({ where: { treeId } });

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
    console.error("Error deleting tree story:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
