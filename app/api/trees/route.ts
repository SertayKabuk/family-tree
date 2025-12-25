import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { z } from "zod";

const createTreeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
});

// GET /api/trees - List user's trees
export async function GET() {
  try {
    const userId = await requireAuth();

    const [ownedTrees, memberships] = await Promise.all([
      prisma.familyTree.findMany({
        where: { ownerId: userId },
        include: {
          _count: { select: { familyMembers: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.treeMembership.findMany({
        where: { userId },
        include: {
          tree: {
            include: {
              owner: { select: { name: true, email: true } },
              _count: { select: { familyMembers: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      owned: ownedTrees,
      shared: memberships.map((m) => ({
        ...m.tree,
        role: m.role,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching trees:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/trees - Create a new tree
export async function POST(request: Request) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const parsed = createTreeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tree = await prisma.familyTree.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        ownerId: userId,
      },
    });

    return NextResponse.json(tree, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating tree:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
