import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { TreeSettingsForm } from "@/components/tree/tree-settings-form";
import { ShareSection } from "@/components/tree/share-section";
import { DangerZone } from "@/components/tree/danger-zone";
import { getTranslations } from "next-intl/server";

interface SettingsPageProps {
  params: Promise<{ treeId: string }>;
}

export default async function TreeSettingsPage({ params }: SettingsPageProps) {
  const { treeId } = await params;
  const session = await auth();
  const t = await getTranslations("settingsPage");

  if (!session?.user?.id) {
    redirect("/login");
  }

  let role;
  try {
    const result = await requirePermission(treeId, "edit");
    role = result.role;
  } catch {
    notFound();
  }

  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      memberships: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      invitations: {
        where: { usedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tree) {
    notFound();
  }

  const isOwner = role === "OWNER";

  return (
    <div className="container max-w-3xl py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { name: tree.name })}
        </p>
      </div>

      <TreeSettingsForm tree={tree} />

      <ShareSection
        treeId={treeId}
        treeName={tree.name}
        memberships={tree.memberships}
        invitations={tree.invitations}
        isOwner={isOwner}
      />

      {isOwner && <DangerZone treeId={treeId} treeName={tree.name} />}
    </div>
  );
}
