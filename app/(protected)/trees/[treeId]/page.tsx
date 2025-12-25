import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getTreePermissions } from "@/lib/permissions";
import { FamilyTreeCanvas } from "@/components/tree/family-tree-canvas";
import { TreeHeader } from "@/components/tree/tree-header";

interface TreePageProps {
  params: Promise<{ treeId: string }>;
}

export default async function TreePage({ params }: TreePageProps) {
  const { treeId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { hasAccess, permissions } = await getTreePermissions(treeId);

  if (!hasAccess) {
    notFound();
  }

  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      familyMembers: {
        orderBy: { createdAt: "asc" },
      },
      relationships: true,
      _count: {
        select: { familyMembers: true, memberships: true },
      },
    },
  });

  if (!tree) {
    notFound();
  }

  const canEdit = permissions.includes("edit") || permissions.includes("manage_members");

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <TreeHeader tree={tree} canEdit={canEdit} />
      <FamilyTreeCanvas
        treeId={treeId}
        members={tree.familyMembers}
        relationships={tree.relationships}
        canEdit={canEdit}
      />
    </div>
  );
}
