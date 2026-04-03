import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getTreePermissions } from "@/lib/permissions";
import { StoryPageClient } from "./story-page-client";

interface StoryPageProps {
  params: Promise<{ treeId: string; memberId: string }>;
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { treeId, memberId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { hasAccess, permissions } = await getTreePermissions(treeId);
  if (!hasAccess) {
    notFound();
  }

  const member = await prisma.familyMember.findFirst({
    where: { id: memberId, treeId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nickname: true,
      gender: true,
      profilePicturePath: true,
      story: true,
    },
  });

  if (!member) {
    notFound();
  }

  const canEdit = permissions.includes("edit") || permissions.includes("manage_members");

  return (
    <StoryPageClient
      treeId={treeId}
      member={member}
      story={member.story}
      canEdit={canEdit}
    />
  );
}
