"use client";

import { useState, useRef } from "react";
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
import { Loader2, Upload, X, Image, FileText, Mic } from "lucide-react";
import { toast } from "sonner";

interface MediaUploadDialogProps {
  treeId: string;
  memberId: string;
  type: "photos" | "documents" | "audio" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_CONFIG = {
  photos: {
    accept: "image/jpeg,image/png,image/gif,image/webp",
    icon: Image,
  },
  documents: {
    accept: "application/pdf,.doc,.docx",
    icon: FileText,
  },
  audio: {
    accept: "audio/mpeg,audio/wav,audio/webm,audio/ogg",
    icon: Mic,
  },
};

export function MediaUploadDialog({
  treeId,
  memberId,
  type,
  open,
  onOpenChange,
}: MediaUploadDialogProps) {
  const router = useRouter();
  const t = useTranslations("mediaUpload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");

  if (!type) return null;

  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t("errors.selectFile"));
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", type);
      formData.append("title", title || selectedFile.name);

      const response = await fetch(
        `/api/trees/${treeId}/members/${memberId}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      toast.success(t("success"));
      setSelectedFile(null);
      setTitle("");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setTitle("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(`types.${type}.title`)}</DialogTitle>
          <DialogDescription>{t(`types.${type}.description`)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={config.accept}
            onChange={handleFileSelect}
            className="hidden"
          />

          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {t("dropzone")}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
              <Icon className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="title">{t("fileTitle")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("fileTitlePlaceholder")}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("uploading")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t("upload")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
