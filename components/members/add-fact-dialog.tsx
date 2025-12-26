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

interface AddFactDialogProps {
  treeId: string;
  memberId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFactDialog({
  treeId,
  memberId,
  open,
  onOpenChange,
}: AddFactDialogProps) {
  const router = useRouter();
  const t = useTranslations();
  const tFact = useTranslations("addFact");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [source, setSource] = useState("");

  const resetForm = () => {
    setTitle("");
    setContent("");
    setDate("");
    setSource("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error(tFact("errors.required"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/trees/${treeId}/members/${memberId}/facts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            date: date || null,
            source: source.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add fact");
      }

      toast.success(tFact("success"));
      resetForm();
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(tFact("errors.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{tFact("title")}</DialogTitle>
            <DialogDescription>
              {tFact("description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fact-title">{tFact("titleLabel")}</Label>
              <Input
                id="fact-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tFact("titlePlaceholder")}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fact-content">{tFact("contentLabel")}</Label>
              <Textarea
                id="fact-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={tFact("contentPlaceholder")}
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fact-date">{tFact("dateLabel")}</Label>
                <Input
                  id="fact-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fact-source">{tFact("sourceLabel")}</Label>
                <Input
                  id="fact-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder={tFact("sourcePlaceholder")}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
