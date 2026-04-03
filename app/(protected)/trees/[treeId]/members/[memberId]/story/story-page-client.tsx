"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GENDER_COLORS } from "@/lib/tree-colors";
import { Gender, StoryStatus } from "@prisma/client";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  RefreshCw,
  AlertCircle,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

interface StoryPageClientProps {
  treeId: string;
  member: {
    id: string;
    firstName: string;
    lastName: string | null;
    nickname: string | null;
    gender: Gender;
    profilePicturePath: string | null;
  };
  story: {
    id: string;
    content: string;
    audioPath: string | null;
    status: StoryStatus;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  canEdit: boolean;
}

export function StoryPageClient({ treeId, member, story: initialStory, canEdit }: StoryPageClientProps) {
  const t = useTranslations("story");
  const router = useRouter();
  const colors = GENDER_COLORS[member.gender];
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");
  const initials = `${member.firstName[0]}${member.lastName?.[0] || ""}`.toUpperCase();

  const [story, setStory] = useState(initialStory);
  const [isGenerating, setIsGenerating] = useState(false);
  const [polling, setPolling] = useState(
    initialStory?.status === "GENERATING" || initialStory?.status === "PENDING"
  );

  // Poll for story status when generating
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/trees/${treeId}/members/${member.id}/story`);
        if (res.ok) {
          const data = await res.json();
          setStory(data);
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            setPolling(false);
            setIsGenerating(false);
            if (data.status === "COMPLETED") {
              toast.success(t("generated"));
            }
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [polling, treeId, member.id, t]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/trees/${treeId}/members/${member.id}/story`, {
        method: "POST",
      });
      if (res.ok) {
        setPolling(true);
        setStory((prev) =>
          prev
            ? { ...prev, status: "GENERATING" as StoryStatus }
            : {
                id: "",
                content: "",
                audioPath: null,
                status: "GENERATING" as StoryStatus,
                error: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
        );
        toast.info(t("generating"));
      } else {
        toast.error(t("failed"));
        setIsGenerating(false);
      }
    } catch {
      toast.error(t("failed"));
      setIsGenerating(false);
    }
  }, [treeId, member.id, t]);

  const isLoading = story?.status === "GENERATING" || story?.status === "PENDING" || isGenerating;

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => router.push(`/trees/${treeId}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("backToTree")}
      </Button>

      {/* Member header */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar
          className="h-16 w-16 border-2"
          style={{ borderColor: colors.border }}
        >
          {member.profilePicturePath ? (
            <AvatarImage
              src={`/api/files/${member.profilePicturePath}`}
              alt={fullName}
            />
          ) : null}
          <AvatarFallback
            style={{ backgroundColor: colors.border, color: "white" }}
            className="text-xl font-semibold"
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{fullName}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>{t("title")}</span>
          </div>
        </div>
      </div>

      {/* Story content */}
      {!story && !isLoading && (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">{t("empty")}</p>
            {canEdit && (
              <Button onClick={handleGenerate}>
                <BookOpen className="h-4 w-4 mr-2" />
                {t("generate")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{t("generating")}</p>
          </CardContent>
        </Card>
      )}

      {story?.status === "FAILED" && (
        <Card className="mb-6 border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-4" />
            <p className="text-destructive mb-2">{t("failed")}</p>
            {story.error && (
              <p className="text-xs text-muted-foreground mb-4">{story.error}</p>
            )}
            {canEdit && (
              <Button onClick={handleGenerate} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("regenerate")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {story?.status === "COMPLETED" && story.content && (
        <>
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed text-base">
                  {story.content}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Audio player */}
          {story.audioPath && (
            <Card className="mb-6">
              <CardContent className="py-6">
                <div className="flex items-center gap-3 mb-3">
                  <Volume2 className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">{t("listen")}</h3>
                </div>
                <audio
                  controls
                  className="w-full"
                  src={`/api/files/${story.audioPath}`}
                >
                  {t("audioNotSupported")}
                </audio>
              </CardContent>
            </Card>
          )}

          {/* Regenerate button */}
          {canEdit && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{t("autoGenerated")}</p>
              <Button
                onClick={handleGenerate}
                variant="outline"
                size="sm"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {t("regenerate")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
