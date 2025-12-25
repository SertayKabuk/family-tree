import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { deleteFile } from "@/lib/storage";
import { z } from "zod";

const deleteMediaSchema = z.object({
  type: z.enum(["photo", "document", "audio"]),
  id: z.string().min(1),
});

// DELETE /api/trees/[treeId]/members/[memberId]/media - Delete a media file
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ treeId: string; memberId: string }> }
) {
  try {
    const { treeId, memberId } = await params;
    await requirePermission(treeId, "manage_members");

    // Check member exists
    const member = await prisma.familyMember.findFirst({
      where: { id: memberId, treeId },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = deleteMediaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, id } = parsed.data;

    let filePath: string | null = null;

    if (type === "photo") {
      const photo = await prisma.photo.findFirst({
        where: { id, memberId },
      });

      if (!photo) {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 });
      }

      filePath = photo.filePath;

      await prisma.photo.delete({ where: { id } });
    } else if (type === "document") {
      const document = await prisma.document.findFirst({
        where: { id, memberId },
      });

      if (!document) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      filePath = document.filePath;

      await prisma.document.delete({ where: { id } });
    } else if (type === "audio") {
      const audioClip = await prisma.audioClip.findFirst({
        where: { id, memberId },
      });

      if (!audioClip) {
        return NextResponse.json({ error: "Audio clip not found" }, { status: 404 });
      }

      filePath = audioClip.filePath;

      await prisma.audioClip.delete({ where: { id } });
    }

    // Delete the actual file from storage
    if (filePath) {
      await deleteFile(filePath);
    }

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
    console.error("Error deleting media:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
