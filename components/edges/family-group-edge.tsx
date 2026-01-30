"use client";

import { memo, useState, useMemo } from "react";
import {
  BaseEdge,
  EdgeProps,
  EdgeLabelRenderer,
  Edge,
  useStore,
} from "@xyflow/react";
import { RELATIONSHIP_COLORS } from "@/lib/tree-colors";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FamilyMemberNodeData } from "@/components/nodes/family-member-node";

import { RelationshipType } from "@prisma/client";

/**
 * FamilyGroupEdge renders parent-child relationships with a cleaner visualization:
 * - A single vertical line descends from the midpoint between parents (or from single parent)
 * - The line forks horizontally to connect to multiple children
 * 
 * This replaces individual edges from each parent to each child.
 */

export interface FamilyGroupEdgeData extends Record<string, unknown> {
  type: "FAMILY_GROUP";
  parentIds: string[];
  childIds: string[];
  parentRelTypes?: Record<string, RelationshipType>; // Mapping of parentId -> their relationship type
  canEdit?: boolean;
  onDeleteChild?: (childId: string, parentIds: string[], parentRelTypes: Map<string, RelationshipType>) => void;
}

export type FamilyGroupEdge = Edge<FamilyGroupEdgeData, "familyGroup">;

const NODE_WIDTH = 160;
const NODE_HEIGHT = 120;

// Calculate the SVG path for the family tree fork
function calculateForkPath(
  parentNodes: { x: number; y: number; width: number; height: number }[],
  childNodes: { x: number; y: number; width: number; height: number }[]
): string {
  if (childNodes.length === 0 || parentNodes.length === 0) return "";

  // Sort parents by X position to identify left and right parent
  const sortedParents = [...parentNodes].sort((a, b) => a.x - b.x);
  
  let parentMidX: number;
  let parentMidY: number;
  
  if (sortedParents.length === 2) {
    // Two parents: calculate midpoint between right edge of left parent and left edge of right parent
    // This matches where the spouse line runs
    const leftParent = sortedParents[0];
    const rightParent = sortedParents[1];
    
    const leftParentRightEdge = leftParent.x + leftParent.width;
    const rightParentLeftEdge = rightParent.x;
    
    parentMidX = (leftParentRightEdge + rightParentLeftEdge) / 2;
    parentMidY = (leftParent.y + rightParent.y) / 2;
  } else {
    // Single parent: use center of parent
    const parent = sortedParents[0];
    parentMidX = parent.x + parent.width / 2;
    parentMidY = parent.y;
  }

  // Get average height for Y calculation
  const avgHeight = parentNodes.reduce((sum, p) => sum + p.height, 0) / parentNodes.length;
  
  // Parent connection point - at the vertical center of parent nodes
  // This is where the spouse line connects, so the fork should start here
  const startY = parentMidY + avgHeight / 2;
  
  // Calculate the vertical drop point (midway between parents and children)
  const childrenMinY = Math.min(...childNodes.map((c) => c.y));
  const forkY = startY + (childrenMinY - startY) / 2;

  // Start from parent midpoint
  let path = `M ${parentMidX} ${startY}`;
  
  // Draw vertical line down to fork point
  path += ` L ${parentMidX} ${forkY}`;

  if (childNodes.length === 1) {
    // Single child - straight line down
    const child = childNodes[0];
    const childTopY = child.y;
    const childCenterX = child.x + child.width / 2;
    
    path += ` L ${childCenterX} ${forkY}`;
    path += ` L ${childCenterX} ${childTopY}`;
  } else {
    // Multiple children - fork horizontally
    const sortedChildren = [...childNodes].sort((a, b) => a.x - b.x);
    const leftmostX = sortedChildren[0].x + sortedChildren[0].width / 2;
    const rightmostX = sortedChildren[sortedChildren.length - 1].x + sortedChildren[sortedChildren.length - 1].width / 2;
    
    // Calculate the center point of the children span for a balanced T-junction
    const childrenCenterX = (leftmostX + rightmostX) / 2;
    
    // Draw horizontal line from parent down point to children center (if not aligned)
    path += ` L ${childrenCenterX} ${forkY}`;
    
    // Draw horizontal line spanning all children (left then right from center)
    path += ` M ${childrenCenterX} ${forkY}`;
    path += ` L ${leftmostX} ${forkY}`;
    path += ` M ${childrenCenterX} ${forkY}`;
    path += ` L ${rightmostX} ${forkY}`;

    // Draw vertical drops to each child
    for (const child of sortedChildren) {
      const childTopY = child.y;
      const childCenterX = child.x + child.width / 2;
      
      // Move to the position on the horizontal line
      path += ` M ${childCenterX} ${forkY}`;
      // Draw down to the child
      path += ` L ${childCenterX} ${childTopY}`;
    }
  }

  return path;
}

function FamilyGroupEdgeComponent({
  id,
  data,
  selected,
}: EdgeProps<FamilyGroupEdge>) {
  const t = useTranslations();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedChildName, setSelectedChildName] = useState<string>("");

  // Get live node positions, dimensions, and data from the store
  const { nodeData, childrenInfo } = useStore((store) => {
    const nodeData: Record<string, { x: number; y: number; width: number; height: number }> = {};
    const childrenInfo: { id: string; name: string }[] = [];
    
    for (const node of store.nodes) {
      nodeData[node.id] = {
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width ?? NODE_WIDTH,
        height: node.measured?.height ?? NODE_HEIGHT,
      };
      
      // Get child names for the dropdown
      if (data?.childIds?.includes(node.id)) {
        const nodeDataTyped = node.data as FamilyMemberNodeData;
        childrenInfo.push({
          id: node.id,
          name: nodeDataTyped.firstName + (nodeDataTyped.lastName ? ` ${nodeDataTyped.lastName}` : ""),
        });
      }
    }
    return { nodeData, childrenInfo };
  });

  const edgeColor = RELATIONSHIP_COLORS.PARENT_CHILD;

  // Calculate path using live positions
  const { path, labelX, labelY } = useMemo(() => {
    if (!data?.parentIds || !data?.childIds) {
      return { path: "", labelX: 0, labelY: 0 };
    }

    const parentNodes = data.parentIds
      .map((id) => nodeData[id])
      .filter(Boolean);
    
    const childNodes = data.childIds
      .map((id) => nodeData[id])
      .filter(Boolean);

    if (parentNodes.length === 0 || childNodes.length === 0) {
      return { path: "", labelX: 0, labelY: 0 };
    }

    const calculatedPath = calculateForkPath(parentNodes, childNodes);

    // Calculate label position - match the same logic as calculateForkPath
    const sortedParents = [...parentNodes].sort((a, b) => a.x - b.x);
    let parentMidX: number;
    let parentMidY: number;
    
    if (sortedParents.length === 2) {
      const leftParent = sortedParents[0];
      const rightParent = sortedParents[1];
      parentMidX = (leftParent.x + leftParent.width + rightParent.x) / 2;
      parentMidY = (leftParent.y + rightParent.y) / 2;
    } else {
      const parent = sortedParents[0];
      parentMidX = parent.x + parent.width / 2;
      parentMidY = parent.y;
    }

    const avgHeight = parentNodes.reduce((sum, p) => sum + p.height, 0) / parentNodes.length;
    const childrenMinY = Math.min(...childNodes.map((c) => c.y));
    // Label position: between the start point (mid-height of parents) and children
    const startY = parentMidY + avgHeight / 2;
    const calcLabelY = startY + (childrenMinY - startY) / 3;

    return { path: calculatedPath, labelX: parentMidX, labelY: calcLabelY };
  }, [data, nodeData]);

  const handleConfirmDelete = () => {
    if (data?.onDeleteChild && selectedChildId && data?.parentIds) {
      // Convert parentRelTypes object back to Map for the callback
      const parentRelTypesMap = new Map<string, RelationshipType>(
        Object.entries(data.parentRelTypes || {}) as [string, RelationshipType][]
      );
      data.onDeleteChild(selectedChildId, data.parentIds, parentRelTypesMap);
    }
    setDeleteDialogOpen(false);
    setSelectedChildId(null);
  };

  if (!path) return null;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: edgeColor,
          strokeWidth: selected ? 3 : 2,
          fill: "none",
        }}
      />
      
      {/* Show label with delete option when selected */}
      {selected && data?.canEdit && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="text-xs"
          >
            <span
              className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm border inline-flex items-center gap-1"
              style={{
                color: edgeColor,
                borderColor: edgeColor,
              }}
            >
              {data?.childIds?.length || 0} {t("relationships.children")}
              {childrenInfo.length === 1 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChildId(childrenInfo[0].id);
                    setSelectedChildName(childrenInfo[0].name);
                    setDeleteDialogOpen(true);
                  }}
                  className="ml-1 p-0.5 rounded-full hover:bg-red-100 text-red-500 transition-colors"
                  title={t("relationships.delete.title")}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="ml-1 p-0.5 rounded-full hover:bg-red-100 text-red-500 transition-colors"
                        title={t("relationships.delete.title")}
                      />
                    }
                  >
                    <X className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    {childrenInfo.map((child) => (
                      <DropdownMenuItem
                        key={child.id}
                        onClick={() => {
                          setSelectedChildId(child.id);
                          setSelectedChildName(child.name);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        {t("relationships.delete.removeChild", { name: child.name })}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("relationships.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("relationships.delete.childDescriptionNamed", { name: selectedChildName })}
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
  );
}

export const FamilyGroupEdge = memo(FamilyGroupEdgeComponent);
