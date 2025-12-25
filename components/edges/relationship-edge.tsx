"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  Edge,
} from "@xyflow/react";
import { RelationshipType, Gender } from "@prisma/client";
import { RELATIONSHIP_COLORS, getRelationshipLabel } from "@/lib/tree-colors";

export interface RelationshipEdgeData extends Record<string, unknown> {
  type: RelationshipType;
  fromGender?: Gender;
  toGender?: Gender;
  marriageDate?: string | null;
  divorceDate?: string | null;
  customColor?: string | null;
}

export type RelationshipEdge = Edge<RelationshipEdgeData, "relationship">;

function RelationshipEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<RelationshipEdge>) {
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
            className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm border"
            style={{
              color: edgeColor,
              borderColor: edgeColor,
            }}
          >
            {label}
            {isSpouseOrPartner && data?.marriageDate && (
              <span className="ml-1 opacity-70">
                ({new Date(data.marriageDate).getFullYear()})
              </span>
            )}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const RelationshipEdge = memo(RelationshipEdgeComponent);
