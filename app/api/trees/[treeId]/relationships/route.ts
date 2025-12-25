import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { z } from "zod";
import { RelationshipType } from "@prisma/client";

const createRelationshipSchema = z.object({
  fromMemberId: z.string(),
  toMemberId: z.string(),
  type: z.nativeEnum(RelationshipType),
  marriageDate: z.string().nullable().optional(),
  divorceDate: z.string().nullable().optional(),
  customColor: z.string().nullable().optional(),
});

const deleteRelationshipSchema = z.object({
  fromMemberId: z.string(),
  toMemberId: z.string(),
  type: z.nativeEnum(RelationshipType),
});

// GET /api/trees/[treeId]/relationships - List all relationships
export async function GET(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "view");

    const relationships = await prisma.relationship.findMany({
      where: { treeId },
      include: {
        fromMember: {
          select: { id: true, firstName: true, lastName: true, gender: true },
        },
        toMember: {
          select: { id: true, firstName: true, lastName: true, gender: true },
        },
      },
    });

    return NextResponse.json(relationships);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error fetching relationships:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/trees/[treeId]/relationships - Create a new relationship
export async function POST(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "manage_members");

    const body = await request.json();
    const parsed = createRelationshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify both members belong to this tree
    const [fromMember, toMember] = await Promise.all([
      prisma.familyMember.findFirst({
        where: { id: data.fromMemberId, treeId },
      }),
      prisma.familyMember.findFirst({
        where: { id: data.toMemberId, treeId },
      }),
    ]);

    if (!fromMember || !toMember) {
      return NextResponse.json(
        { error: "One or both members not found in this tree" },
        { status: 400 }
      );
    }

    // Check for existing relationship
    const existing = await prisma.relationship.findUnique({
      where: {
        fromMemberId_toMemberId_type: {
          fromMemberId: data.fromMemberId,
          toMemberId: data.toMemberId,
          type: data.type,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This relationship already exists" },
        { status: 409 }
      );
    }

    const relationship = await prisma.relationship.create({
      data: {
        treeId,
        fromMemberId: data.fromMemberId,
        toMemberId: data.toMemberId,
        type: data.type,
        marriageDate: data.marriageDate ? new Date(data.marriageDate) : null,
        divorceDate: data.divorceDate ? new Date(data.divorceDate) : null,
        customColor: data.customColor || null,
      },
      include: {
        fromMember: {
          select: { id: true, firstName: true, lastName: true, gender: true },
        },
        toMember: {
          select: { id: true, firstName: true, lastName: true, gender: true },
        },
      },
    });

    // Update tree timestamp
    await prisma.familyTree.update({
      where: { id: treeId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(relationship, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error creating relationship:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/trees/[treeId]/relationships - Delete a relationship
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "manage_members");

    const body = await request.json();
    const parsed = deleteRelationshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const relationship = await prisma.relationship.findFirst({
      where: {
        treeId,
        fromMemberId: data.fromMemberId,
        toMemberId: data.toMemberId,
        type: data.type,
      },
    });

    if (!relationship) {
      return NextResponse.json(
        { error: "Relationship not found" },
        { status: 404 }
      );
    }

    await prisma.relationship.delete({
      where: { id: relationship.id },
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
    console.error("Error deleting relationship:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
