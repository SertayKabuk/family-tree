"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoryStatus } from "@prisma/client";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  RefreshCw,
  AlertCircle,
  Volume2,
  TreePine,
} from "lucide-react";
import { toast } from "sonner";
import { StoryStyleSelector } from "@/components/story/story-style-selector";
import { type StoryStyle, DEFAULT_STORY_STYLE } from "@/lib/story-styles";

interface TreeStoryPageClientProps {
  treeId: string;
  treeName: string;
  memberCount: number;
  story: {
    id: string;
    content: string;
    audioPath: string | null;
    status: StoryStatus;
    error: string | null;
    storyStyle: string;
    customPrompt: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  canEdit: boolean;
}

export function TreeStoryPageClient({ treeId, treeName, memberCount, story: initialStory, canEdit }: TreeStoryPageClientProps) {
  const t = useTranslations("treeStory");
  const router = useRouter();

  const [story, setStory] = useState(initialStory);
  const [isGenerating, setIsGenerating] = useState(false);
  const [polling, setPolling] = useState(
    initialStory?.status === "GENERATING" || initialStory?.status === "PENDING"
  );
  const [selectedStyle, setSelectedStyle] = useState<StoryStyle>(
    (initialStory?.storyStyle as StoryStyle) || DEFAULT_STORY_STYLE
  );
  const [customPrompt, setCustomPrompt] = useState(initialStory?.customPrompt || "");

  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/trees/${treeId}/story`);
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
  }, [polling, treeId, t]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/trees/${treeId}/story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyStyle: selectedStyle, customPrompt: customPrompt || null }),
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
                storyStyle: selectedStyle,
                customPrompt: customPrompt || null,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
        );
        toast.info(t("generating"));
      } else {
        const data = await res.json().catch(() => null);
        if (res.status === 400 && data?.error === "Tree has no members") {
          toast.error(t("noMembers"));
        } else {
          toast.error(t("failed"));
        }
        setIsGenerating(false);
      }
    } catch {
      toast.error(t("failed"));
      setIsGenerating(false);
    }
  }, [treeId, t, selectedStyle, customPrompt]);

  const isLoading = story?.status === "GENERATING" || story?.status === "PENDING" || isGenerating;

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 px-3 sm:px-4 overflow-x-hidden">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => router.push(`/trees/${treeId}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("backToTree")}
      </Button>

      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 min-w-0">
        <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <TreePine className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{treeName}</h1>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>{t("title")}</span>
            <span className="text-xs">({t("memberCount", { count: memberCount })})</span>
          </div>
        </div>
      </div>

      {!story && !isLoading && (
        <Card className="mb-6">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center mb-6">
              <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t("empty")}</p>
            </div>
            {canEdit && (
              <div className="space-y-6">
                <StoryStyleSelector
                  selectedStyle={selectedStyle}
                  customPrompt={customPrompt}
                  onStyleChange={setSelectedStyle}
                  onCustomPromptChange={setCustomPrompt}
                />
                <div className="flex justify-center">
                  <Button onClick={handleGenerate} disabled={memberCount === 0}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    {t("generate")}
                  </Button>
                </div>
              </div>
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
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center mb-6">
              <AlertCircle className="h-8 w-8 text-destructive mb-4" />
              <p className="text-destructive mb-2">{t("failed")}</p>
              {story.error && (
                <p className="text-xs text-muted-foreground">{story.error}</p>
              )}
            </div>
            {canEdit && (
              <div className="space-y-6">
                <StoryStyleSelector
                  selectedStyle={selectedStyle}
                  customPrompt={customPrompt}
                  onStyleChange={setSelectedStyle}
                  onCustomPromptChange={setCustomPrompt}
                />
                <div className="flex justify-center">
                  <Button onClick={handleGenerate} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t("regenerate")}
                  </Button>
                </div>
              </div>
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

          {canEdit && (
            <Card className="mb-6">
              <CardContent className="py-6 space-y-4">
                <StoryStyleSelector
                  selectedStyle={selectedStyle}
                  customPrompt={customPrompt}
                  onStyleChange={setSelectedStyle}
                  onCustomPromptChange={setCustomPrompt}
                />
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
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
