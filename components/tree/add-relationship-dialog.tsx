"use client";

import { useState, useEffect, useMemo } from "react";
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
import { FamilyMember, RelationshipType, Relationship } from "@prisma/client";
import { Connection } from "@xyflow/react";

interface AddRelationshipDialogProps {
  treeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: Connection | null;
  members: FamilyMember[];
  relationships?: Relationship[];
  onClose: () => void;
}

export function AddRelationshipDialog({
  treeId,
  open,
  onOpenChange,
  connection,
  members,
  relationships = [],
  onClose,
}: AddRelationshipDialogProps) {
  const router = useRouter();
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("PARENT_CHILD");
  const [marriageDate, setMarriageDate] = useState("");
  const [otherParentId, setOtherParentId] = useState<string | null>(null);

  const fromMember = members.find((m) => m.id === connection?.source);
  const toMember = members.find((m) => m.id === connection?.target);

  // Check if we're creating a parent-child relationship
  const isParentChildType = relationshipType === "PARENT_CHILD" || 
    relationshipType === "ADOPTIVE_PARENT" || 
    relationshipType === "FOSTER_PARENT";

  // Find potential other parents (spouses/partners of the parent)
  const potentialOtherParents = useMemo(() => {
    if (!fromMember || !isParentChildType) return [];
    
    // Find all spouse/partner relationships of the "from" member (parent)
    const spouseRelations = relationships.filter(
      (r) => 
        (r.type === "SPOUSE" || r.type === "PARTNER") &&
        (r.fromMemberId === fromMember.id || r.toMemberId === fromMember.id)
    );
    
    // Get the spouse/partner member IDs
    const spouseIds = spouseRelations.map((r) => 
      r.fromMemberId === fromMember.id ? r.toMemberId : r.fromMemberId
    );
    
    // Return the actual member objects (excluding the child being added)
    return members.filter(
      (m) => spouseIds.includes(m.id) && m.id !== toMember?.id
    );
  }, [fromMember, toMember, isParentChildType, relationships, members]);

  // Find existing other parent from existing relationships
  const existingOtherParent = useMemo(() => {
    if (!toMember || !isParentChildType) return null;
    
    // Check if child already has parent relationships
    const existingParentRels = relationships.filter(
      (r) => 
        (r.type === "PARENT_CHILD" || r.type === "ADOPTIVE_PARENT" || r.type === "FOSTER_PARENT") &&
        r.toMemberId === toMember.id &&
        r.fromMemberId !== fromMember?.id
    );
    
    if (existingParentRels.length > 0) {
      const otherParent = members.find((m) => m.id === existingParentRels[0].fromMemberId);
      return otherParent || null;
    }
    return null;
  }, [toMember, fromMember, isParentChildType, relationships, members]);

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
      setOtherParentId(null);
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
      // Build relationships array - includes both parents if otherParentId is set
      const relationshipsToCreate = [
        {
          fromMemberId: connection.source,
          toMemberId: connection.target,
          type: relationshipType,
          marriageDate: marriageDate || null,
        },
      ];

      // If it's a parent-child relationship and we have another parent selected,
      // add the second parent-child relationship to the batch
      if (isParentChildType && otherParentId) {
        relationshipsToCreate.push({
          fromMemberId: otherParentId,
          toMemberId: connection.target,
          type: relationshipType, // Preserve the same relationship type (PARENT_CHILD/ADOPTIVE_PARENT/FOSTER_PARENT)
          marriageDate: null,
        });
      }

      // Use batch endpoint if multiple relationships, otherwise single endpoint
      if (relationshipsToCreate.length > 1) {
        const response = await fetch(`/api/trees/${treeId}/relationships/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationships: relationshipsToCreate }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || t("relationships.errors.failed"));
        }
      } else {
        // Single relationship - use the regular endpoint
        const response = await fetch(`/api/trees/${treeId}/relationships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(relationshipsToCreate[0]),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || t("relationships.errors.failed"));
        }
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

            {/* Other parent selection for parent-child relationships */}
            {isParentChildType && (
              <div className="grid gap-2">
                <Label htmlFor="otherParent">
                  {t("relationships.otherParent.label")}
                </Label>
                {existingOtherParent ? (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="text-muted-foreground">
                      {t("relationships.otherParent.existing")}:
                    </p>
                    <p className="font-medium mt-1">
                      {existingOtherParent.firstName} {existingOtherParent.lastName}
                    </p>
                  </div>
                ) : potentialOtherParents.length > 0 ? (
                  <Select
                    value={otherParentId || "none"}
                    onValueChange={(value) => setOtherParentId(value === "none" ? null : value)}
                    disabled={loading}
                  >
                    <SelectTrigger id="otherParent">
                      <SelectValue>
                        {otherParentId 
                          ? (() => {
                              const selected = potentialOtherParents.find(p => p.id === otherParentId);
                              return selected ? `${selected.firstName} ${selected.lastName ?? ''}` : t("relationships.otherParent.none");
                            })()
                          : t("relationships.otherParent.none")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">
                          {t("relationships.otherParent.none")}
                        </span>
                      </SelectItem>
                      {potentialOtherParents.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.firstName} {parent.lastName ?? ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3">
                    {t("relationships.otherParent.noSpouse")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t("relationships.otherParent.hint")}
                </p>
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
