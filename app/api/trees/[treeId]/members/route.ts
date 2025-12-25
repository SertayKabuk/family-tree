import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { z } from "zod";
import { Gender } from "@prisma/client";

const createMemberSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).nullable().optional(),
  nickname: z.string().max(100).nullable().optional(),
  gender: z.nativeEnum(Gender),
  birthDate: z.string().nullable().optional(),
  deathDate: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  birthPlace: z.string().max(200).nullable().optional(),
  deathPlace: z.string().max(200).nullable().optional(),
  occupation: z.string().max(200).nullable().optional(),
  positionX: z.number().nullable().optional(),
  positionY: z.number().nullable().optional(),
});

// GET /api/trees/[treeId]/members - List all family members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "view");

    const members = await prisma.familyMember.findMany({
      where: { treeId },
      include: {
        relationshipsFrom: {
          include: { toMember: { select: { id: true, firstName: true, lastName: true } } },
        },
        relationshipsTo: {
          include: { fromMember: { select: { id: true, firstName: true, lastName: true } } },
        },
        _count: {
          select: { photos: true, documents: true, audioClips: true, facts: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/trees/[treeId]/members - Create a new family member
export async function POST(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "manage_members");

    const body = await request.json();
    const parsed = createMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const member = await prisma.familyMember.create({
      data: {
        treeId,
        firstName: data.firstName,
        lastName: data.lastName || null,
        nickname: data.nickname || null,
        gender: data.gender,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        deathDate: data.deathDate ? new Date(data.deathDate) : null,
        bio: data.bio || null,
        birthPlace: data.birthPlace || null,
        deathPlace: data.deathPlace || null,
        occupation: data.occupation || null,
        positionX: data.positionX ?? null,
        positionY: data.positionY ?? null,
      },
    });

    // Update the tree's updatedAt timestamp
    await prisma.familyTree.update({
      where: { id: treeId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error creating member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
