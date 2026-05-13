"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Fact } from "@prisma/client";

interface EditFactDialogProps {
  treeId: string;
  memberId: string;
  fact: Fact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getFactDateValue(date: Date | string | null): string {
  if (!date) {
    return "";
  }

  return new Date(date).toISOString().split("T")[0];
}

export function EditFactDialog({
  fact,
  ...props
}: EditFactDialogProps) {
  if (!fact) {
    return null;
  }

  return <EditFactDialogContent key={fact.id} fact={fact} {...props} />;
}

function EditFactDialogContent({
  treeId,
  memberId,
  fact,
  open,
  onOpenChange,
}: Omit<EditFactDialogProps, "fact"> & { fact: Fact }) {
  const router = useRouter();
  const t = useTranslations();
  const tFact = useTranslations("editFact");
  const tAdd = useTranslations("addFact");

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(() => fact.title);
  const [content, setContent] = useState(() => fact.content);
  const [date, setDate] = useState(() => getFactDateValue(fact.date));
  const [source, setSource] = useState(() => fact.source ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error(tAdd("errors.required"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/trees/${treeId}/members/${memberId}/facts/${fact.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            date: date || null,
            source: source.trim() || null,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update fact");

      toast.success(tFact("success"));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(tFact("errors.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{tFact("title")}</DialogTitle>
            <DialogDescription>{tFact("description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-fact-title">{tAdd("titleLabel")}</Label>
              <Input
                id="edit-fact-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tAdd("titlePlaceholder")}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-fact-content">{tAdd("contentLabel")}</Label>
              <Textarea
                id="edit-fact-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={tAdd("contentPlaceholder")}
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-fact-date">{tAdd("dateLabel")}</Label>
                <Input
                  id="edit-fact-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-fact-source">{tAdd("sourceLabel")}</Label>
                <Input
                  id="edit-fact-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder={tAdd("sourcePlaceholder")}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tFact("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
