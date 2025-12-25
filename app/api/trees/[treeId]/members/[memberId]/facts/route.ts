import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { z } from "zod";

const createFactSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  date: z.string().nullable().optional(),
  source: z.string().max(200).nullable().optional(),
});

// POST /api/trees/[treeId]/members/[memberId]/facts - Add a fact
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

    const body = await request.json();
    const parsed = createFactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, content, date, source } = parsed.data;

    const fact = await prisma.fact.create({
      data: {
        memberId,
        title,
        content,
        date: date ? new Date(date) : null,
        source: source || null,
      },
    });

    // Update tree timestamp
    await prisma.familyTree.update({
      where: { id: treeId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(fact, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error creating fact:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
