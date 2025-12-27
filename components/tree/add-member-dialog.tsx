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
import { Gender } from "@prisma/client";

interface AddMemberDialogProps {
  treeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({ treeId, open, onOpenChange }: AddMemberDialogProps) {
  const router = useRouter();
  const t = useTranslations();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    gender: "UNKNOWN" as Gender,
    birthDate: "",
    deathDate: "",
    birthPlace: "",
    occupation: "",
    bio: "",
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      nickname: "",
      gender: "UNKNOWN",
      birthDate: "",
      deathDate: "",
      birthPlace: "",
      occupation: "",
      bio: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim()) {
      toast.error(t("addMember.errors.firstNameRequired"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim() || null,
          nickname: formData.nickname.trim() || null,
          gender: formData.gender,
          birthDate: formData.birthDate || null,
          deathDate: formData.deathDate || null,
          birthPlace: formData.birthPlace.trim() || null,
          occupation: formData.occupation.trim() || null,
          bio: formData.bio.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add member");
      }

      toast.success(t("addMember.success"));
      resetForm();
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t("addMember.errors.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("addMember.title")}</DialogTitle>
            <DialogDescription>
              {t("addMember.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">{t("addMember.firstNameRequired")}</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  disabled={loading}
                  placeholder={t("addMember.placeholders.firstName")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">{t("addMember.lastName")}</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  disabled={loading}
                  placeholder={t("addMember.placeholders.lastName")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nickname">{t("addMember.nickname")}</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) =>
                    setFormData({ ...formData, nickname: e.target.value })
                  }
                  disabled={loading}
                  placeholder={t("addMember.placeholders.nickname")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gender">{t("addMember.genderRequired")}</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    value && setFormData({ ...formData, gender: value as Gender })
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="gender">
                    <SelectValue>
                      {formData.gender === "MALE" && t("gender.male")}
                      {formData.gender === "FEMALE" && t("gender.female")}
                      {formData.gender === "OTHER" && t("gender.other")}
                      {formData.gender === "UNKNOWN" && t("gender.unknown")}
                    </SelectValue>
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
                <Label htmlFor="birthDate">{t("addMember.birthDate")}</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) =>
                    setFormData({ ...formData, birthDate: e.target.value })
                  }
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deathDate">{t("addMember.deathDate")}</Label>
                <Input
                  id="deathDate"
                  type="date"
                  value={formData.deathDate}
                  onChange={(e) =>
                    setFormData({ ...formData, deathDate: e.target.value })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="birthPlace">{t("addMember.birthPlace")}</Label>
                <Input
                  id="birthPlace"
                  value={formData.birthPlace}
                  onChange={(e) =>
                    setFormData({ ...formData, birthPlace: e.target.value })
                  }
                  disabled={loading}
                  placeholder={t("addMember.placeholders.birthPlace")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="occupation">{t("addMember.occupation")}</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) =>
                    setFormData({ ...formData, occupation: e.target.value })
                  }
                  disabled={loading}
                  placeholder={t("addMember.placeholders.occupation")}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">{t("addMember.bio")}</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                disabled={loading}
                placeholder={t("addMember.placeholders.bio")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("addMember.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
