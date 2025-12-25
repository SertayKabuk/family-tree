import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { z } from "zod";

const updatePositionsSchema = z.object({
  positions: z.array(
    z.object({
      id: z.string(),
      positionX: z.number(),
      positionY: z.number(),
    })
  ),
});

// PATCH /api/trees/[treeId]/positions - Bulk update member positions
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "edit");

    const body = await request.json();
    const parsed = updatePositionsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Update all positions in a transaction
    await prisma.$transaction(
      parsed.data.positions.map((pos) =>
        prisma.familyMember.updateMany({
          where: { id: pos.id, treeId },
          data: {
            positionX: pos.positionX,
            positionY: pos.positionY,
          },
        })
      )
    );

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
    console.error("Error updating positions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
