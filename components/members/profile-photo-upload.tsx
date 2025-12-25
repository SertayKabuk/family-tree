"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Camera, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Gender } from "@prisma/client";
import { GENDER_COLORS } from "@/lib/tree-colors";

interface ProfilePhotoUploadProps {
  treeId: string;
  memberId: string;
  memberName: string;
  currentPhotoPath?: string | null;
  gender: Gender;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfilePhotoUpload({
  treeId,
  memberId,
  memberName,
  currentPhotoPath,
  gender,
  open,
  onOpenChange,
}: ProfilePhotoUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const colors = GENDER_COLORS[gender];
  const initials = memberName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      setSelectedFile(file);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select an image");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", "profile");

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

      toast.success("Profile photo updated");
      handleClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentPhotoPath) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePicturePath: null }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove photo");
      }

      toast.success("Profile photo removed");
      handleClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove photo");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    onOpenChange(false);
  };

  const displayPhotoUrl = previewUrl || (currentPhotoPath ? `/api/files/${currentPhotoPath}` : null);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Photo</DialogTitle>
          <DialogDescription>
            Upload a profile photo for {memberName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Photo Preview */}
          <div className="relative group">
            <Avatar
              className="h-32 w-32 border-4 cursor-pointer"
              style={{ borderColor: colors.border }}
              onClick={() => fileInputRef.current?.click()}
            >
              {displayPhotoUrl ? (
                <AvatarImage src={displayPhotoUrl} alt={memberName} />
              ) : null}
              <AvatarFallback
                className="text-3xl font-bold"
                style={{ backgroundColor: colors.border, color: "white" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Overlay on hover */}
            <div
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-8 w-8 text-white" />
            </div>

            {/* Clear selection button */}
            {selectedFile && (
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                  }
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Selected file info */}
          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}

          {/* Upload button */}
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {currentPhotoPath || selectedFile ? "Change Photo" : "Select Photo"}
          </Button>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentPhotoPath && !selectedFile && (
            <Button
              variant="destructive"
              onClick={handleRemovePhoto}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove Photo
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            {selectedFile && (
              <Button onClick={handleUpload} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
