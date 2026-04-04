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
    const totalSize = fileBuffer.byteLength;

    // Handle byte-range requests (required for audio/video on mobile browsers,
    // especially iOS Safari which sends Range requests before playing media)
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      // Reject multi-range requests (RFC 7233 §6.1) – serve only single ranges
      if (rangeHeader.includes(",")) {
        return new NextResponse(null, {
          status: 416, // Range Not Satisfiable
          headers: {
            "Content-Range": `bytes */${totalSize}`,
          },
        });
      }

      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);

      if (!match) {
        return new NextResponse(null, {
          status: 416, // Range Not Satisfiable
          headers: {
            "Content-Range": `bytes */${totalSize}`,
          },
        });
      }

      let start: number;
      let end: number;

      if (!match[1] && match[2]) {
        // Suffix range: bytes=-N (last N bytes)
        const suffixLength = parseInt(match[2], 10);
        start = Math.max(0, totalSize - suffixLength);
        end = totalSize - 1;
      } else {
        start = match[1] ? parseInt(match[1], 10) : 0;
        // Per RFC 7233, cap end at the last available byte
        end = match[2] ? Math.min(parseInt(match[2], 10), totalSize - 1) : totalSize - 1;
      }

      if (start > end || start >= totalSize) {
        return new NextResponse(null, {
          status: 416, // Range Not Satisfiable
          headers: {
            "Content-Range": `bytes */${totalSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const chunk = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset + start, end - start + 1);

      return new NextResponse(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as BodyInit, {
        status: 206, // Partial Content
        headers: {
          "Content-Type": mimeType,
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Content-Length": String(chunkSize),
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=31536000",
        },
      });
    }

    return new NextResponse(fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as BodyInit, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(totalSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=31536000", // Cache for 1 year
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
