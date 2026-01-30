import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { z } from "zod";
import { RelationshipType } from "@prisma/client";

// Schema for batch create
const batchCreateSchema = z.object({
  relationships: z
    .array(
      z.object({
        fromMemberId: z.string(),
        toMemberId: z.string(),
        type: z.enum(RelationshipType),
        marriageDate: z.string().nullable().optional(),
        divorceDate: z.string().nullable().optional(),
        customColor: z.string().nullable().optional(),
      })
    )
    .min(1)
    .max(10), // Limit to 10 relationships per batch to prevent timeout
});

// Schema for batch delete
const batchDeleteSchema = z.object({
  relationships: z
    .array(
      z.object({
        fromMemberId: z.string(),
        toMemberId: z.string(),
        type: z.enum(RelationshipType),
      })
    )
    .min(1)
    .max(10),
});

// POST /api/trees/[treeId]/relationships/batch - Batch create relationships
export async function POST(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "manage_members");

    const body = await request.json();
    const parsed = batchCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { relationships } = parsed.data;

    // Validate all members belong to this tree
    const memberIds = new Set<string>();
    for (const rel of relationships) {
      memberIds.add(rel.fromMemberId);
      memberIds.add(rel.toMemberId);
    }

    const members = await prisma.familyMember.findMany({
      where: {
        id: { in: Array.from(memberIds) },
        treeId,
      },
      select: { id: true },
    });

    const validMemberIds = new Set(members.map((m) => m.id));
    const invalidMembers = Array.from(memberIds).filter(
      (id) => !validMemberIds.has(id)
    );

    if (invalidMembers.length > 0) {
      return NextResponse.json(
        {
          error: "Invalid members",
          details: {
            message: "One or more members do not belong to this tree",
            invalidMemberIds: invalidMembers,
          },
        },
        { status: 400 }
      );
    }

    // Check for duplicates within the request
    const seenKeys = new Set<string>();
    const duplicatesInRequest: string[] = [];
    for (const rel of relationships) {
      const key = `${rel.fromMemberId}-${rel.toMemberId}-${rel.type}`;
      if (seenKeys.has(key)) {
        duplicatesInRequest.push(key);
      }
      seenKeys.add(key);
    }

    if (duplicatesInRequest.length > 0) {
      return NextResponse.json(
        {
          error: "Duplicate relationships in request",
          details: { duplicates: duplicatesInRequest },
        },
        { status: 400 }
      );
    }

    // Check for existing relationships in database
    const existingRelationships = await prisma.relationship.findMany({
      where: {
        OR: relationships.map((rel) => ({
          fromMemberId: rel.fromMemberId,
          toMemberId: rel.toMemberId,
          type: rel.type,
        })),
      },
      select: { fromMemberId: true, toMemberId: true, type: true },
    });

    if (existingRelationships.length > 0) {
      return NextResponse.json(
        {
          error: "Some relationships already exist",
          details: {
            existing: existingRelationships.map(
              (r) => `${r.fromMemberId}-${r.toMemberId}-${r.type}`
            ),
          },
        },
        { status: 409 }
      );
    }

    // Create all relationships in a transaction
    const createdRelationships = await prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        relationships.map((rel) =>
          tx.relationship.create({
            data: {
              treeId,
              fromMemberId: rel.fromMemberId,
              toMemberId: rel.toMemberId,
              type: rel.type,
              marriageDate: rel.marriageDate
                ? new Date(rel.marriageDate)
                : null,
              divorceDate: rel.divorceDate ? new Date(rel.divorceDate) : null,
              customColor: rel.customColor || null,
            },
            include: {
              fromMember: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  gender: true,
                },
              },
              toMember: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  gender: true,
                },
              },
            },
          })
        )
      );

      // Update tree timestamp
      await tx.familyTree.update({
        where: { id: treeId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    return NextResponse.json(
      { relationships: createdRelationships },
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
    console.error("Error batch creating relationships:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/trees/[treeId]/relationships/batch - Batch delete relationships
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "manage_members");

    const body = await request.json();
    const parsed = batchDeleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { relationships } = parsed.data;

    // Find all matching relationships
    const existingRelationships = await prisma.relationship.findMany({
      where: {
        treeId,
        OR: relationships.map((rel) => ({
          fromMemberId: rel.fromMemberId,
          toMemberId: rel.toMemberId,
          type: rel.type,
        })),
      },
      select: { id: true, fromMemberId: true, toMemberId: true, type: true },
    });

    if (existingRelationships.length === 0) {
      return NextResponse.json(
        { error: "No matching relationships found" },
        { status: 404 }
      );
    }

    // Build a set of found relationships for reporting
    const foundKeys = new Set(
      existingRelationships.map(
        (r) => `${r.fromMemberId}-${r.toMemberId}-${r.type}`
      )
    );
    const requestedKeys = relationships.map(
      (r) => `${r.fromMemberId}-${r.toMemberId}-${r.type}`
    );
    const notFound = requestedKeys.filter((key) => !foundKeys.has(key));

    // Delete all found relationships in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.relationship.deleteMany({
        where: {
          id: { in: existingRelationships.map((r) => r.id) },
        },
      });

      // Update tree timestamp
      await tx.familyTree.update({
        where: { id: treeId },
        data: { updatedAt: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      deleted: existingRelationships.length,
      notFound: notFound.length > 0 ? notFound : undefined,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error batch deleting relationships:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
