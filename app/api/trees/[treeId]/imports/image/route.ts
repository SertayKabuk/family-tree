import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { isValidImageType, optimizeImageUpload } from "@/lib/storage";
import {
  IMAGE_SOURCE_FILE_SIZE_LIMITS,
  formatSizeLimitMb,
} from "@/lib/upload-constraints";
import {
  attachDuplicateCandidates,
  buildImportDraftPreview,
  buildImportDraftSummary,
  parseFamilyTreeImageDraft,
} from "@/lib/ai/family-tree-import";
import {
  saveImportDraft,
  setThreadImportDraft,
} from "@/lib/ai/family-tree-import-store";
import type { FamilyTreeImportDraftRecord } from "@/lib/ai/family-tree-import-schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    const { userId } = await requirePermission(treeId, "manage_members");

    const formData = await request.formData();
    const file = formData.get("file");
    const threadIdValue = formData.get("threadId");
    const threadId = typeof threadIdValue === "string" && threadIdValue.length > 0
      ? threadIdValue
      : null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!isValidImageType(file.type)) {
      return NextResponse.json(
        { error: "Invalid image type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    if (file.size > IMAGE_SOURCE_FILE_SIZE_LIMITS.import) {
      return NextResponse.json(
        {
          error: `Image is too large. Maximum original size before optimization is ${formatSizeLimitMb(IMAGE_SOURCE_FILE_SIZE_LIMITS.import)}MB.`,
        },
        { status: 400 }
      );
    }

    const optimizedImage = await optimizeImageUpload(file, "import");
    const buffer = optimizedImage.buffer;
    const existingMembersPromise = prisma.familyMember.findMany({
      where: { treeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        deathDate: true,
      },
    });

    const parsedDraft = await parseFamilyTreeImageDraft({
      fileName: optimizedImage.fileName,
      mimeType: optimizedImage.mimeType,
      buffer,
    });

    const existingMembers = await existingMembersPromise;
    const draft = attachDuplicateCandidates(parsedDraft, existingMembers);

    const now = new Date().toISOString();
    const draftId = crypto.randomUUID();
    const record: FamilyTreeImportDraftRecord = {
      id: draftId,
      treeId,
      threadId,
      createdByUserId: userId,
      status: "ACTIVE",
      draft,
      createdAt: now,
      updatedAt: now,
      committedAt: null,
      commitResult: null,
    };

    await Promise.all([
      saveImportDraft(record),
      threadId ? setThreadImportDraft(userId, treeId, threadId, draftId) : Promise.resolve(),
    ]);

    return NextResponse.json(
      {
        draftId,
        summary: buildImportDraftSummary(record),
        preview: buildImportDraftPreview(draft),
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
      if (error.name === "ZodError") {
        return NextResponse.json({ error: "Could not parse the family tree image" }, { status: 422 });
      }

      if (error.message.includes("Image could not be optimized") || error.message.includes("Animated images")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
