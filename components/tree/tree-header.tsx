"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, Bot, ChevronLeft, MoreVertical, Settings, Share2, Users } from "lucide-react";
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
  const membersBadge = (
    <Badge variant="secondary" className="gap-1">
      <Users className="h-3 w-3" />
      {t("treeHeader.members", { count: tree._count.familyMembers })}
    </Badge>
  );

  return (
    <div className="border-b bg-background px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start justify-between gap-3 sm:items-center sm:justify-start">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <Link href="/dashboard" className="shrink-0">
              <Button variant="ghost" size="sm" className="h-9 px-2 sm:px-3">
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">{t("common.back")}</span>
              </Button>
            </Link>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-semibold">{tree.name}</h1>
                <div className="sm:hidden">{membersBadge}</div>
              </div>
              {tree.description && (
                <p className="max-w-full truncate text-xs text-muted-foreground sm:max-w-[300px]">
                  {tree.description}
                </p>
              )}
            </div>
          </div>

          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={t("common.moreActions")}
                  />
                }
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem render={<Link href={`/trees/${tree.id}/chat`} />}>
                  <Bot className="mr-2 h-4 w-4" />
                  {t("treeHeader.aiChat")}
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href={`/trees/${tree.id}/story`} />}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  {t("treeStory.title")}
                </DropdownMenuItem>
                {canEdit && (
                  <>
                    <DropdownMenuItem render={<Link href={`/trees/${tree.id}/settings`} />}>
                      <Share2 className="mr-2 h-4 w-4" />
                      {t("treeHeader.share")}
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href={`/trees/${tree.id}/settings`} />}>
                      <Settings className="mr-2 h-4 w-4" />
                      {t("settings.title")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {membersBadge}

          <Link href={`/trees/${tree.id}/chat`}>
            <Button variant="outline" size="sm">
              <Bot className="mr-1 h-4 w-4" />
              {t("treeHeader.aiChat")}
            </Button>
          </Link>

          <Link href={`/trees/${tree.id}/story`}>
            <Button variant="outline" size="sm">
              <BookOpen className="mr-1 h-4 w-4" />
              {t("treeStory.title")}
            </Button>
          </Link>

          {canEdit && (
            <>
              <Link href={`/trees/${tree.id}/settings`}>
                <Button variant="outline" size="sm">
                  <Share2 className="mr-1 h-4 w-4" />
                  {t("treeHeader.share")}
                </Button>
              </Link>

              <Link href={`/trees/${tree.id}/settings`}>
                <Button variant="ghost" size="icon" aria-label={t("settings.title")}>
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
