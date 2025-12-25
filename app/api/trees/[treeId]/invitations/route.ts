import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { createInvitation, getTreeInvitations, revokeInvitation } from "@/lib/invitations";
import { z } from "zod";
import { MemberRole } from "@prisma/client";

const createInvitationSchema = z.object({
  role: z.nativeEnum(MemberRole).optional().default("VIEWER"),
  email: z.string().email().optional(),
  expiresInDays: z.number().min(1).max(30).optional().default(7),
});

// GET /api/trees/[treeId]/invitations - List invitations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "invite");

    const invitations = await getTreeInvitations(treeId);

    return NextResponse.json(invitations);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/trees/[treeId]/invitations - Create invitation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "invite");

    const body = await request.json();
    const parsed = createInvitationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { role, email, expiresInDays } = parsed.data;

    const invitation = await createInvitation(treeId, role, email, expiresInDays);

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error creating invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/trees/[treeId]/invitations - Delete invitation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params;
    await requirePermission(treeId, "invite");

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json({ error: "Invitation ID required" }, { status: 400 });
    }

    await revokeInvitation(invitationId);

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
    console.error("Error deleting invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
