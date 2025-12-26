"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Settings, Share2, Users } from "lucide-react";
import { FamilyTree, User } from "@prisma/client";

interface TreeHeaderProps {
  tree: FamilyTree & {
    owner: Pick<User, "id" | "name" | "email">;
    _count: { familyMembers: number; memberships: number };
  };
  canEdit: boolean;
}

export function TreeHeader({ tree, canEdit }: TreeHeaderProps) {
  const t = useTranslations();

  return (
    <div className="border-b bg-background px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("common.back")}
          </Button>
        </Link>

        <div>
          <h1 className="font-semibold">{tree.name}</h1>
          {tree.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
              {tree.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {t("treeHeader.members", { count: tree._count.familyMembers })}
        </Badge>

        {canEdit && (
          <>
            <Link href={`/trees/${tree.id}/settings`}>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                {t("treeHeader.share")}
              </Button>
            </Link>

            <Link href={`/trees/${tree.id}/settings`}>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
