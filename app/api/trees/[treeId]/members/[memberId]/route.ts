import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { deleteFile } from "@/lib/storage";
import { z } from "zod";
import { Gender } from "@prisma/client";

const updateMemberSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).nullable().optional(),
  nickname: z.string().max(100).nullable().optional(),
  gender: z.nativeEnum(Gender).optional(),
  birthDate: z.string().nullable().optional(),
  deathDate: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  birthPlace: z.string().max(200).nullable().optional(),
  deathPlace: z.string().max(200).nullable().optional(),
  occupation: z.string().max(200).nullable().optional(),
  profilePicturePath: z.string().nullable().optional(),
  positionX: z.number().nullable().optional(),
  positionY: z.number().nullable().optional(),
});

// GET /api/trees/[treeId]/members/[memberId] - Get a single member with all details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ treeId: string; memberId: string }> }
) {
  try {
    const { treeId, memberId } = await params;
    await requirePermission(treeId, "view");

    const member = await prisma.familyMember.findFirst({
      where: { id: memberId, treeId },
      include: {
        relationshipsFrom: {
          include: {
            toMember: {
              select: { id: true, firstName: true, lastName: true, gender: true },
            },
          },
        },
        relationshipsTo: {
          include: {
            fromMember: {
              select: { id: true, firstName: true, lastName: true, gender: true },
            },
          },
        },
        photos: { orderBy: { uploadedAt: "desc" } },
        documents: { orderBy: { uploadedAt: "desc" } },
        audioClips: { orderBy: { uploadedAt: "desc" } },
        facts: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error fetching member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/trees/[treeId]/members/[memberId] - Update a member
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ treeId: string; memberId: string }> }
) {
  try {
    const { treeId, memberId } = await params;
    await requirePermission(treeId, "manage_members");

    const body = await request.json();
    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check member exists and belongs to tree
    const existing = await prisma.familyMember.findFirst({
      where: { id: memberId, treeId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    }
    if (data.deathDate !== undefined) {
      updateData.deathDate = data.deathDate ? new Date(data.deathDate) : null;
    }
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.birthPlace !== undefined) updateData.birthPlace = data.birthPlace;
    if (data.deathPlace !== undefined) updateData.deathPlace = data.deathPlace;
    if (data.occupation !== undefined) updateData.occupation = data.occupation;
    if (data.profilePicturePath !== undefined) {
      // Delete old profile photo if it exists and we're changing it
      if (existing.profilePicturePath && data.profilePicturePath !== existing.profilePicturePath) {
        await deleteFile(existing.profilePicturePath);
      }
      updateData.profilePicturePath = data.profilePicturePath;
    }
    if (data.positionX !== undefined) updateData.positionX = data.positionX;
    if (data.positionY !== undefined) updateData.positionY = data.positionY;

    const member = await prisma.familyMember.update({
      where: { id: memberId },
      data: updateData,
    });

    // Update tree timestamp
    await prisma.familyTree.update({
      where: { id: treeId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error updating member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/trees/[treeId]/members/[memberId] - Delete a member
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ treeId: string; memberId: string }> }
) {
  try {
    const { treeId, memberId } = await params;
    await requirePermission(treeId, "manage_members");

    // Check member exists and belongs to tree
    const existing = await prisma.familyMember.findFirst({
      where: { id: memberId, treeId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await prisma.familyMember.delete({
      where: { id: memberId },
    });

    // Update tree timestamp
    await prisma.familyTree.update({
      where: { id: treeId },
      data: { updatedAt: new Date() },
    });

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
    console.error("Error deleting member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
