"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TreePine, Users, Clock, Crown, Eye, Edit } from "lucide-react";
import { MemberRole } from "@prisma/client";

interface TreeWithCount {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { familyMembers: number };
}

interface SharedTree extends TreeWithCount {
  role: MemberRole;
  owner: { name: string | null; email: string };
}

interface TreesListProps {
  ownedTrees: TreeWithCount[];
  sharedTrees: SharedTree[];
}

function TreeCard({
  tree,
  role,
  ownerName,
}: {
  tree: TreeWithCount;
  role?: MemberRole;
  ownerName?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const roleIcons = {
    OWNER: Crown,
    EDITOR: Edit,
    VIEWER: Eye,
  };
  const RoleIcon = role ? roleIcons[role] : Crown;

  const roleLabels: Record<MemberRole, string> = {
    OWNER: t("roles.owner"),
    EDITOR: t("roles.editor"),
    VIEWER: t("roles.viewer"),
  };

  return (
    <Link href={`/trees/${tree.id}`}>
      <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <TreePine className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{tree.name}</CardTitle>
            </div>
            {role && (
              <Badge variant={role === "OWNER" ? "default" : "secondary"}>
                <RoleIcon className="h-3 w-3 mr-1" />
                {roleLabels[role]}
              </Badge>
            )}
          </div>
          {tree.description && (
            <CardDescription className="line-clamp-2">
              {tree.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{t("dashboard.members", { count: tree._count.familyMembers })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {t("dashboard.updated", { date: new Date(tree.updatedAt).toLocaleDateString(locale) })}
              </span>
            </div>
          </div>
          {ownerName && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("dashboard.ownedBy", { name: ownerName })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function TreesList({ ownedTrees, sharedTrees }: TreesListProps) {
  const t = useTranslations();
  const hasNoTrees = ownedTrees.length === 0 && sharedTrees.length === 0;

  if (hasNoTrees) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <TreePine className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("dashboard.noTrees.title")}</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            {t("dashboard.noTrees.description")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {ownedTrees.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">{t("dashboard.yourTrees")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedTrees.map((tree) => (
              <TreeCard key={tree.id} tree={tree} role="OWNER" />
            ))}
          </div>
        </section>
      )}

      {sharedTrees.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">{t("dashboard.sharedWithYou")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sharedTrees.map((tree) => (
              <TreeCard
                key={tree.id}
                tree={tree}
                role={tree.role}
                ownerName={tree.owner.name || tree.owner.email}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
