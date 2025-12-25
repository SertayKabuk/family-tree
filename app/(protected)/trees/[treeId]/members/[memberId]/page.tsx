import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getTreePermissions } from "@/lib/permissions";
import { MemberProfile } from "@/components/members/member-profile";

interface MemberPageProps {
  params: Promise<{ treeId: string; memberId: string }>;
}

export default async function MemberPage({ params }: MemberPageProps) {
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
    include: {
      tree: { select: { id: true, name: true } },
      relationshipsFrom: {
        include: {
          toMember: {
            select: { id: true, firstName: true, lastName: true, gender: true },
          },
        },
      },
      relationshipsTo: {
        include: {
          fromMember: {
            select: { id: true, firstName: true, lastName: true, gender: true },
          },
        },
      },
      photos: { orderBy: { uploadedAt: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      audioClips: { orderBy: { uploadedAt: "desc" } },
      facts: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!member) {
    notFound();
  }

  const canEdit = permissions.includes("manage_members");

  return (
    <MemberProfile
      member={member}
      treeId={treeId}
      treeName={member.tree.name}
      canEdit={canEdit}
    />
  );
}
