import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getFile, getMimeType } from "@/lib/storage";

// GET /api/files/[...path] - Serve uploaded files with auth check
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path: pathSegments } = await params;
    const filePath = pathSegments.join("/");

    // Extract treeId from path (first segment)
    const treeId = pathSegments[0];

    if (!treeId) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Check if user has access to this tree
    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
      select: { ownerId: true, isPublic: true },
    });

    if (!tree) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check access
    let hasAccess = tree.isPublic || tree.ownerId === session.user.id;

    if (!hasAccess) {
      const membership = await prisma.treeMembership.findUnique({
        where: {
          treeId_userId: {
            treeId,
            userId: session.user.id,
          },
        },
      });
      hasAccess = !!membership;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the file
    const fileBuffer = await getFile(filePath);

    if (!fileBuffer) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const mimeType = getMimeType(filePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=31536000", // Cache for 1 year
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
