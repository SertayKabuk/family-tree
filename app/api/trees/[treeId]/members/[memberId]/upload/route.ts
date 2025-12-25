import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import {
  uploadFile,
  isValidImageType,
  isValidDocumentType,
  isValidAudioType,
  FILE_SIZE_LIMITS,
  MediaType,
} from "@/lib/storage";

// POST /api/trees/[treeId]/members/[memberId]/upload - Upload file for a member
export async function POST(
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as MediaType | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;

    if (!file || !type) {
      return NextResponse.json(
        { error: "File and type are required" },
        { status: 400 }
      );
    }

    // Validate type
    if (!["profile", "photos", "documents", "audio"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Validate file size
    const sizeLimit = FILE_SIZE_LIMITS[type];
    if (file.size > sizeLimit) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${sizeLimit / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (type === "profile" || type === "photos") {
      if (!isValidImageType(file.type)) {
        return NextResponse.json(
          { error: "Invalid image type. Allowed: JPEG, PNG, GIF, WebP" },
          { status: 400 }
        );
      }
    } else if (type === "documents") {
      if (!isValidDocumentType(file.type)) {
        return NextResponse.json(
          { error: "Invalid document type. Allowed: PDF, DOC, DOCX" },
          { status: 400 }
        );
      }
    } else if (type === "audio") {
      if (!isValidAudioType(file.type)) {
        return NextResponse.json(
          { error: "Invalid audio type. Allowed: MP3, WAV, WebM, OGG" },
          { status: 400 }
        );
      }
    }

    // Upload the file
    const result = await uploadFile(treeId, memberId, type, file);

    // Save to database based on type
    let dbRecord;

    if (type === "profile") {
      // Update member's profile picture
      dbRecord = await prisma.familyMember.update({
        where: { id: memberId },
        data: { profilePicturePath: result.filePath },
      });
    } else if (type === "photos") {
      dbRecord = await prisma.photo.create({
        data: {
          memberId,
          title: title || file.name,
          description,
          filePath: result.filePath,
        },
      });
    } else if (type === "documents") {
      dbRecord = await prisma.document.create({
        data: {
          memberId,
          title: title || file.name,
          description,
          filePath: result.filePath,
          fileType: file.type,
          fileSize: file.size,
        },
      });
    } else if (type === "audio") {
      dbRecord = await prisma.audioClip.create({
        data: {
          memberId,
          title: title || file.name,
          description,
          filePath: result.filePath,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        filePath: result.filePath,
        record: dbRecord,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
