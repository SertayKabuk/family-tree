"use client";

import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  Edge,
} from "@xyflow/react";
import { RelationshipType, Gender } from "@prisma/client";
import { RELATIONSHIP_COLORS } from "@/lib/tree-colors";
import { useRelationshipLabels } from "@/lib/use-relationship-labels";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface RelationshipEdgeData extends Record<string, unknown> {
  type: RelationshipType;
  fromGender?: Gender;
  toGender?: Gender;
  marriageDate?: string | null;
  divorceDate?: string | null;
  customColor?: string | null;
  canEdit?: boolean;
  onDelete?: (edgeId: string, fromMemberId: string, toMemberId: string, type: RelationshipType) => void;
}

export type RelationshipEdge = Edge<RelationshipEdgeData, "relationship">;

function RelationshipEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<RelationshipEdge>) {
  const { getRelationshipLabel } = useRelationshipLabels();
  const t = useTranslations();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeColor = data?.customColor || RELATIONSHIP_COLORS[data?.type || "PARENT_CHILD"];
  const label = data ? getRelationshipLabel(data.type, data.fromGender, data.toGender) : "";

  // Determine edge style based on relationship type
  const isSpouseOrPartner = data?.type === "SPOUSE" || data?.type === "PARTNER" || data?.type === "EX_SPOUSE";
  const strokeDasharray = data?.type === "EX_SPOUSE" ? "5,5" : undefined;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (data?.onDelete && data?.type) {
      data.onDelete(id, source, target, data.type);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className={`
            text-xs px-2 py-0.5 rounded-full font-medium
            ${selected ? "ring-2 ring-offset-1" : ""}
          `}
        >
          <span
            className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm border inline-flex items-center gap-1"
            style={{
              color: edgeColor,
              borderColor: edgeColor,
            }}
          >
            {label}
            {isSpouseOrPartner && data?.marriageDate && (
              <span className="opacity-70">
                ({new Date(data.marriageDate).getFullYear()})
              </span>
            )}
            {selected && data?.canEdit && (
              <>
                <button
                  onClick={handleDeleteClick}
                  className="ml-1 p-0.5 rounded-full hover:bg-red-100 text-red-500 transition-colors"
                  title={t("relationships.delete.title")}
                >
                  <X className="h-3 w-3" />
                </button>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("relationships.delete.title")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("relationships.delete.description")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleConfirmDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("relationships.delete.confirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const RelationshipEdge = memo(RelationshipEdgeComponent);
