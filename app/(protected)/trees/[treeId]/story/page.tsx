import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getTreePermissions } from "@/lib/permissions";
import { TreeStoryPageClient } from "./tree-story-page-client";

interface TreeStoryPageProps {
  params: Promise<{ treeId: string }>;
}

export default async function TreeStoryPage({ params }: TreeStoryPageProps) {
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
    select: {
      id: true,
      name: true,
      treeStory: true,
      _count: { select: { familyMembers: true } },
    },
  });

  if (!tree) {
    notFound();
  }

  const canEdit = permissions.includes("edit") || permissions.includes("manage_members");

  return (
    <TreeStoryPageClient
      treeId={treeId}
      treeName={tree.name}
      memberCount={tree._count.familyMembers}
      story={tree.treeStory}
      canEdit={canEdit}
    />
  );
}
