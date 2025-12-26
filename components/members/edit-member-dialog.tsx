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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FamilyMember, Gender } from "@prisma/client";

interface EditMemberDialogProps {
  member: FamilyMember;
  treeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMemberDialog({
  member,
  treeId,
  open,
  onOpenChange,
}: EditMemberDialogProps) {
  const router = useRouter();
  const t = useTranslations();
  const [loading, setLoading] = useState(false);

  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    firstName: member.firstName,
    lastName: member.lastName || "",
    nickname: member.nickname || "",
    gender: member.gender,
    birthDate: formatDateForInput(member.birthDate),
    deathDate: formatDateForInput(member.deathDate),
    birthPlace: member.birthPlace || "",
    deathPlace: member.deathPlace || "",
    occupation: member.occupation || "",
    bio: member.bio || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim()) {
      toast.error(t("editMember.errors.firstNameRequired"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim() || null,
          nickname: formData.nickname.trim() || null,
          gender: formData.gender,
          birthDate: formData.birthDate || null,
          deathDate: formData.deathDate || null,
          birthPlace: formData.birthPlace.trim() || null,
          deathPlace: formData.deathPlace.trim() || null,
          occupation: formData.occupation.trim() || null,
          bio: formData.bio.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update member");
      }

      toast.success(t("editMember.success"));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t("editMember.errors.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("editMember.title")}</DialogTitle>
            <DialogDescription>
              {t("editMember.description", { name: member.firstName })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-firstName">{t("editMember.firstName")} *</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-lastName">{t("editMember.lastName")}</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nickname">{t("editMember.nickname")}</Label>
                <Input
                  id="edit-nickname"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-gender">{t("editMember.gender")}</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => value && setFormData({ ...formData, gender: value as Gender })}
                  disabled={loading}
                >
                  <SelectTrigger id="edit-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t("gender.male")}</SelectItem>
                    <SelectItem value="FEMALE">{t("gender.female")}</SelectItem>
                    <SelectItem value="OTHER">{t("gender.other")}</SelectItem>
                    <SelectItem value="UNKNOWN">{t("gender.unknown")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-birthDate">{t("editMember.birthDate")}</Label>
                <Input
                  id="edit-birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-deathDate">{t("editMember.deathDate")}</Label>
                <Input
                  id="edit-deathDate"
                  type="date"
                  value={formData.deathDate}
                  onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-birthPlace">{t("editMember.birthPlace")}</Label>
                <Input
                  id="edit-birthPlace"
                  value={formData.birthPlace}
                  onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-deathPlace">{t("editMember.deathPlace")}</Label>
                <Input
                  id="edit-deathPlace"
                  value={formData.deathPlace}
                  onChange={(e) => setFormData({ ...formData, deathPlace: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-occupation">{t("editMember.occupation")}</Label>
              <Input
                id="edit-occupation"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-bio">{t("editMember.bio")}</Label>
              <Textarea
                id="edit-bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={loading}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("editMember.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
