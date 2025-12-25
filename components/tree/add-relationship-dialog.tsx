"use client";

import { useState, useEffect } from "react";
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

const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string; description: string }[] = [
  { value: "PARENT_CHILD", label: "Parent → Child", description: "First person is the parent" },
  { value: "SPOUSE", label: "Spouse", description: "Married partners" },
  { value: "PARTNER", label: "Partner", description: "Unmarried partners" },
  { value: "EX_SPOUSE", label: "Ex-Spouse", description: "Previously married" },
  { value: "SIBLING", label: "Sibling", description: "Brothers/Sisters" },
  { value: "HALF_SIBLING", label: "Half-Sibling", description: "Share one parent" },
  { value: "STEP_SIBLING", label: "Step-Sibling", description: "Through remarriage" },
  { value: "ADOPTIVE_PARENT", label: "Adoptive Parent", description: "Adoptive relationship" },
  { value: "FOSTER_PARENT", label: "Foster Parent", description: "Foster relationship" },
  { value: "GODPARENT", label: "Godparent", description: "Religious/ceremonial" },
];

export function AddRelationshipDialog({
  treeId,
  open,
  onOpenChange,
  connection,
  members,
  onClose,
}: AddRelationshipDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("PARENT_CHILD");
  const [marriageDate, setMarriageDate] = useState("");

  const fromMember = members.find((m) => m.id === connection?.source);
  const toMember = members.find((m) => m.id === connection?.target);

  useEffect(() => {
    if (!open) {
      setRelationshipType("PARENT_CHILD");
      setMarriageDate("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connection?.source || !connection?.target) {
      toast.error("Invalid connection");
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
        throw new Error(data.error || "Failed to create relationship");
      }

      toast.success("Relationship created!");
      onOpenChange(false);
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create relationship");
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
            <DialogTitle>Create Relationship</DialogTitle>
            <DialogDescription>
              Define the relationship between these family members.
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
              <Label htmlFor="type">Relationship Type</Label>
              <Select
                value={relationshipType}
                onValueChange={(value) => value && setRelationshipType(value as RelationshipType)}
                disabled={loading}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
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
                  {relationshipType === "EX_SPOUSE" ? "Marriage Date" : "Marriage/Partnership Date"}
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
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Relationship
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
