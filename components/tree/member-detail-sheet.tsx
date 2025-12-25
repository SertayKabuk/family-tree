"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  Calendar,
  MapPin,
  Briefcase,
  User,
  ExternalLink,
  Trash2,
  Loader2,
} from "lucide-react";
import { FamilyMember, Gender } from "@prisma/client";
import { GENDER_COLORS } from "@/lib/tree-colors";
import { toast } from "sonner";

interface MemberDetailSheetProps {
  member: FamilyMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treeId: string;
  canEdit: boolean;
}

export function MemberDetailSheet({
  member,
  open,
  onOpenChange,
  treeId,
  canEdit,
}: MemberDetailSheetProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (!member) return null;

  const colors = GENDER_COLORS[member.gender];
  const initials = `${member.firstName[0]}${member.lastName?.[0] || ""}`.toUpperCase();
  const displayName = member.nickname
    ? `${member.nickname} (${member.firstName})`
    : member.firstName;
  const fullName = `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`;

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/trees/${treeId}/members/${member.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete member");
      }

      toast.success("Family member deleted");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to delete family member");
    } finally {
      setDeleting(false);
    }
  };

  const genderLabel = {
    MALE: "Male",
    FEMALE: "Female",
    OTHER: "Other",
    UNKNOWN: "Unknown",
  }[member.gender];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-4">
            <Avatar
              className="h-16 w-16 border-2"
              style={{ borderColor: colors.border }}
            >
              {member.profilePicturePath ? (
                <AvatarImage
                  src={`/api/files/${member.profilePicturePath}`}
                  alt={displayName}
                />
              ) : null}
              <AvatarFallback
                className="text-xl font-semibold"
                style={{ backgroundColor: colors.border, color: "white" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-left">{fullName}</SheetTitle>
              {member.nickname && (
                <SheetDescription className="text-left">
                  "{member.nickname}"
                </SheetDescription>
              )}
              <Badge
                variant="secondary"
                className="mt-2"
                style={{
                  backgroundColor: colors.background,
                  color: colors.text,
                }}
              >
                {genderLabel}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Info */}
          <div className="space-y-3">
            {member.birthDate && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Born {formatDate(member.birthDate)}
                  {member.birthPlace && ` in ${member.birthPlace}`}
                </span>
              </div>
            )}

            {member.deathDate && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Died {formatDate(member.deathDate)}
                  {member.deathPlace && ` in ${member.deathPlace}`}
                </span>
              </div>
            )}

            {member.occupation && (
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{member.occupation}</span>
              </div>
            )}
          </div>

          {member.bio && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Biography</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {member.bio}
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Link href={`/trees/${treeId}/members/${member.id}`}>
              <Button variant="outline" className="w-full justify-start">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </Link>

            {canEdit && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-start text-destructive hover:text-destructive"
                      disabled={deleting}
                    />
                  }
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Member
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Family Member</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {fullName}? This will also
                      remove all their relationships, photos, documents, and other
                      data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
