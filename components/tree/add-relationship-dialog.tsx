"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FamilyMember, RelationshipType } from "@prisma/client";
import { Connection } from "@xyflow/react";

interface AddRelationshipDialogProps {
  treeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: Connection | null;
  members: FamilyMember[];
  onClose: () => void;
}

export function AddRelationshipDialog({
  treeId,
  open,
  onOpenChange,
  connection,
  members,
  onClose,
}: AddRelationshipDialogProps) {
  const router = useRouter();
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("PARENT_CHILD");
  const [marriageDate, setMarriageDate] = useState("");

  const fromMember = members.find((m) => m.id === connection?.source);
  const toMember = members.find((m) => m.id === connection?.target);

  const relationshipOptions: { value: RelationshipType; labelKey: string; descKey: string }[] = [
    { value: "PARENT_CHILD", labelKey: "relationships.types.parentChild.label", descKey: "relationships.types.parentChild.description" },
    { value: "SPOUSE", labelKey: "relationships.types.spouse.label", descKey: "relationships.types.spouse.description" },
    { value: "PARTNER", labelKey: "relationships.types.partner.label", descKey: "relationships.types.partner.description" },
    { value: "EX_SPOUSE", labelKey: "relationships.types.exSpouse.label", descKey: "relationships.types.exSpouse.description" },
    { value: "SIBLING", labelKey: "relationships.types.sibling.label", descKey: "relationships.types.sibling.description" },
    { value: "HALF_SIBLING", labelKey: "relationships.types.halfSibling.label", descKey: "relationships.types.halfSibling.description" },
    { value: "STEP_SIBLING", labelKey: "relationships.types.stepSibling.label", descKey: "relationships.types.stepSibling.description" },
    { value: "ADOPTIVE_PARENT", labelKey: "relationships.types.adoptiveParent.label", descKey: "relationships.types.adoptiveParent.description" },
    { value: "FOSTER_PARENT", labelKey: "relationships.types.fosterParent.label", descKey: "relationships.types.fosterParent.description" },
    { value: "GODPARENT", labelKey: "relationships.types.godparent.label", descKey: "relationships.types.godparent.description" },
  ];

  useEffect(() => {
    if (!open) {
      setRelationshipType("PARENT_CHILD");
      setMarriageDate("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connection?.source || !connection?.target) {
      toast.error(t("relationships.errors.invalid"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMemberId: connection.source,
          toMemberId: connection.target,
          type: relationshipType,
          marriageDate: marriageDate || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("relationships.errors.failed"));
      }

      toast.success(t("relationships.success"));
      onOpenChange(false);
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("relationships.errors.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose();
  };

  const isMarriageType = relationshipType === "SPOUSE" || relationshipType === "PARTNER" || relationshipType === "EX_SPOUSE";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("relationships.title")}</DialogTitle>
            <DialogDescription>
              {t("relationships.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-center">
                <span className="font-semibold">
                  {fromMember?.firstName} {fromMember?.lastName}
                </span>
                <span className="mx-2 text-muted-foreground">→</span>
                <span className="font-semibold">
                  {toMember?.firstName} {toMember?.lastName}
                </span>
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">{t("relationships.typeLabel")}</Label>
              <Select
                value={relationshipType}
                onValueChange={(value) => value && setRelationshipType(value as RelationshipType)}
                disabled={loading}
              >
                <SelectTrigger id="type">
                  <SelectValue>
                    {t(relationshipOptions.find(o => o.value === relationshipType)?.labelKey || "")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {relationshipOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col items-start">
                        <span>{t(option.labelKey)}</span>
                        <span className="text-xs text-muted-foreground">
                          {t(option.descKey)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isMarriageType && (
              <div className="grid gap-2">
                <Label htmlFor="marriageDate">
                  {relationshipType === "EX_SPOUSE" ? t("relationships.marriageDate") : t("relationships.marriagePartnershipDate")}
                </Label>
                <Input
                  id="marriageDate"
                  type="date"
                  value={marriageDate}
                  onChange={(e) => setMarriageDate(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("relationships.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
