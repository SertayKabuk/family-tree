"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/counter.css";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, ZoomIn } from "lucide-react";

export interface PhotoItem {
  id: string;
  src: string;
  title?: string | null;
  alt?: string;
}

interface PhotoGalleryProps {
  photos: PhotoItem[];
  canEdit?: boolean;
  onDelete?: (id: string) => Promise<void>;
  deletingId?: string | null;
}

export function PhotoGallery({
  photos,
  canEdit = false,
  onDelete,
  deletingId,
}: PhotoGalleryProps) {
  const t = useTranslations();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const slides = photos.map((photo) => ({
    src: photo.src,
    alt: photo.alt || photo.title || "Photo",
    title: photo.title || undefined,
  }));

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (photos.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">{t("profile.photos.empty")}</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="aspect-square rounded-lg overflow-hidden bg-muted relative group cursor-pointer"
            onClick={() => openLightbox(index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={photo.alt || photo.title || "Photo"}
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            {/* Hover overlay with zoom icon */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
            {/* Delete button in corner */}
            {canEdit && onDelete && (
              <div
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8 shadow-lg"
                        disabled={deletingId === photo.id}
                      />
                    }
                  >
                    {deletingId === photo.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("profile.photos.deleteTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("profile.photos.deleteDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(photo.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("common.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ))}
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={slides}
        plugins={[Zoom, Fullscreen, Thumbnails, Counter]}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
        }}
        thumbnails={{
          position: "bottom",
          width: 80,
          height: 60,
          gap: 8,
        }}
        counter={{
          container: { style: { top: "unset", bottom: 0 } },
        }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.9)" },
        }}
        carousel={{
          finite: photos.length <= 1,
        }}
      />
    </>
  );
}
