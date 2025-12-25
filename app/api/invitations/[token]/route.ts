import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateInvitation, acceptInvitation } from "@/lib/invitations";

// GET /api/invitations/[token] - Validate invitation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const validation = await validateInvitation(token);

    return NextResponse.json(validation);
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/invitations/[token] - Accept invitation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;
    const result = await acceptInvitation(token, session.user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, treeId: result.treeId });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
