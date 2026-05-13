"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STORY_STYLES, type StoryStyle } from "@/lib/story-styles";
import { cn } from "@/lib/utils";

interface StoryStyleSelectorProps {
  selectedStyle: StoryStyle;
  customPrompt: string;
  onStyleChange: (style: StoryStyle) => void;
  onCustomPromptChange: (prompt: string) => void;
}

export function StoryStyleSelector({
  selectedStyle,
  customPrompt,
  onStyleChange,
  onCustomPromptChange,
}: StoryStyleSelectorProps) {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">{t("storyStyle.selectStyle")}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(STORY_STYLES) as StoryStyle[]).map((style) => {
            const config = STORY_STYLES[style];
            return (
              <button
                key={style}
                type="button"
                onClick={() => onStyleChange(style)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                  selectedStyle === style
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border"
                )}
              >
                <div className="text-sm font-medium">{t(config.labelKey)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t(config.descriptionKey)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="custom-prompt" className="text-sm font-medium mb-2 block">
          {t("storyStyle.customPrompt")}
        </Label>
        <Textarea
          id="custom-prompt"
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder={t("storyStyle.customPromptPlaceholder")}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("storyStyle.customPromptHint")}
        </p>
      </div>
    </div>
  );
}
