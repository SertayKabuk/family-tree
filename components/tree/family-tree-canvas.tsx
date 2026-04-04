"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useTranslations } from "next-intl";
import { FamilyMember, Relationship, RelationshipType } from "@prisma/client";
import { FamilyMemberNode, FamilyMemberNodeData } from "@/components/nodes/family-member-node";
import { RelationshipEdge, RelationshipEdgeData } from "@/components/edges/relationship-edge";
import { FamilyGroupEdge, FamilyGroupEdgeData } from "@/components/edges/family-group-edge";
import { TreeToolbar } from "@/components/tree/tree-toolbar";
import { MemberDetailSheet } from "@/components/tree/member-detail-sheet";
import { AddMemberDialog } from "@/components/tree/add-member-dialog";
import { AddRelationshipDialog } from "@/components/tree/add-relationship-dialog";
import { getLayoutedElements } from "@/lib/tree-layout";
import { GENDER_COLORS } from "@/lib/tree-colors";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const nodeTypes: NodeTypes = {
  familyMember: FamilyMemberNode,
};

const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdge,
  familyGroup: FamilyGroupEdge,
};

interface FamilyTreeCanvasProps {
  treeId: string;
  members: FamilyMember[];
  relationships: Relationship[];
  canEdit: boolean;
}

// Interface for spouse cascade deletion dialog state
interface SpouseCascadeState {
  open: boolean;
  edgeId: string;
  fromMemberId: string;
  toMemberId: string;
  type: RelationshipType;
  deletedSpouseName: string;
  sharedChildren: { id: string; name: string; relationTypes: RelationshipType[] }[];
  cascadeDelete: boolean;
}

function transformMembersToNodes(members: FamilyMember[]): Node<FamilyMemberNodeData>[] {
  return members.map((member, index) => ({
    id: member.id,
    type: "familyMember",
    position: {
      x: member.positionX ?? index * 200,
      y: member.positionY ?? 0,
    },
    data: {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      nickname: member.nickname,
      gender: member.gender,
      profilePicturePath: member.profilePicturePath,
      birthDate: member.birthDate?.toISOString() ?? null,
      deathDate: member.deathDate?.toISOString() ?? null,
      occupation: member.occupation,
      hasStory: !!(member as unknown as { story?: { id: string; status: string } }).story,
    },
  }));
}

function transformRelationshipsToEdges(
  relationships: Relationship[],
  members: FamilyMember[],
  canEdit: boolean,
  onDelete?: (edgeId: string, fromMemberId: string, toMemberId: string, type: RelationshipType) => void,
  onDeleteFamilyGroup?: (childId: string, parentIds: string[], parentRelTypes: Map<string, RelationshipType>) => void
): Edge<RelationshipEdgeData | FamilyGroupEdgeData>[] {
  const memberMap = new Map(members.map((m) => [m.id, m]));

  // Separate parent-child relationships from others
  const parentChildRels: Relationship[] = [];
  const otherRels: Relationship[] = [];

  for (const rel of relationships) {
    if (rel.type === "PARENT_CHILD" || rel.type === "ADOPTIVE_PARENT" || rel.type === "FOSTER_PARENT") {
      parentChildRels.push(rel);
    } else {
      otherRels.push(rel);
    }
  }

  // Group parent-child relationships by child to find parent pairs
  // Also track the relationship type for each parent
  const childToParents = new Map<string, { parentId: string; type: RelationshipType }[]>();
  for (const rel of parentChildRels) {
    const existing = childToParents.get(rel.toMemberId) || [];
    existing.push({ parentId: rel.fromMemberId, type: rel.type });
    childToParents.set(rel.toMemberId, existing);
  }

  // Group children by parent pair (sorted parent IDs as key)
  // Include the relationship types for each parent
  const parentPairToChildren = new Map<string, {
    childId: string;
    parentIds: string[];
    parentRelTypes: Map<string, RelationshipType>;
  }[]>();

  for (const [childId, parents] of childToParents.entries()) {
    // Sort parent IDs to create consistent key
    const parentIds = parents.map(p => p.parentId).sort();
    const key = parentIds.join("-");

    // Build map of parent ID -> relationship type
    const parentRelTypes = new Map<string, RelationshipType>();
    for (const p of parents) {
      parentRelTypes.set(p.parentId, p.type);
    }

    const existing = parentPairToChildren.get(key) || [];
    existing.push({ childId, parentIds, parentRelTypes });
    parentPairToChildren.set(key, existing);
  }

  const edges: Edge<RelationshipEdgeData | FamilyGroupEdgeData>[] = [];

  // Create family group edges for parent-child relationships
  for (const [parentPairKey, children] of parentPairToChildren.entries()) {
    const parentIds = children[0].parentIds;
    const childIds = children.map(c => c.childId);

    // Merge all parent relationship types from all children
    // (they should be the same, but this handles potential edge cases)
    const mergedParentRelTypes = new Map<string, RelationshipType>();
    for (const child of children) {
      for (const [parentId, type] of child.parentRelTypes) {
        mergedParentRelTypes.set(parentId, type);
      }
    }

    edges.push({
      id: `family-group-${parentPairKey}`,
      source: parentIds[0], // Required by React Flow
      target: childIds[0],  // Required by React Flow
      type: "familyGroup",
      data: {
        type: "FAMILY_GROUP",
        parentIds,
        childIds,
        parentRelTypes: Object.fromEntries(mergedParentRelTypes), // Convert Map to plain object for serialization
        canEdit,
        onDeleteChild: onDeleteFamilyGroup,
      },
    });
  }

  // Create regular edges for other relationship types
  for (const rel of otherRels) {
    const fromMember = memberMap.get(rel.fromMemberId);
    const toMember = memberMap.get(rel.toMemberId);

    // Determine handle positions based on relationship type
    const isHorizontal =
      rel.type === "SPOUSE" ||
      rel.type === "PARTNER" ||
      rel.type === "EX_SPOUSE" ||
      rel.type === "SIBLING" ||
      rel.type === "HALF_SIBLING" ||
      rel.type === "STEP_SIBLING";

    // Dynamic handle selection based on relative X positions
    // Edge should connect the inner sides of the two nodes
    let sourceHandle: string | undefined;
    let targetHandle: string | undefined;

    if (isHorizontal) {
      const fromX = fromMember?.positionX ?? 0;
      const toX = toMember?.positionX ?? 0;

      if (fromX < toX) {
        // Source is to the left of target
        // Connect: source's right side -> target's left side
        sourceHandle = "right-source";
        targetHandle = "left-target";
      } else {
        // Source is to the right of target (or same position)
        // Connect: source's left side -> target's right side
        sourceHandle = "left-source";
        targetHandle = "right-target";
      }
    }

    edges.push({
      id: `${rel.fromMemberId}-${rel.toMemberId}-${rel.type}`,
      source: rel.fromMemberId,
      target: rel.toMemberId,
      sourceHandle,
      targetHandle,
      type: "relationship",
      data: {
        type: rel.type,
        fromGender: fromMember?.gender,
        toGender: toMember?.gender,
        marriageDate: rel.marriageDate?.toISOString() ?? null,
        divorceDate: rel.divorceDate?.toISOString() ?? null,
        customColor: rel.customColor,
        canEdit,
        onDelete,
      },
    });
  }

  return edges;
}

function FamilyTreeCanvasInner({
  treeId,
  members,
  relationships,
  canEdit,
}: FamilyTreeCanvasProps) {
  const { fitView } = useReactFlow();
  const router = useRouter();
  const t = useTranslations();

  const initialNodes = useMemo(() => transformMembersToNodes(members), [members]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<RelationshipEdgeData | FamilyGroupEdgeData>>([]);

  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addRelationshipOpen, setAddRelationshipOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

  // Spouse cascade deletion state
  const [spouseCascade, setSpouseCascade] = useState<SpouseCascadeState>({
    open: false,
    edgeId: "",
    fromMemberId: "",
    toMemberId: "",
    type: "SPOUSE",
    deletedSpouseName: "",
    sharedChildren: [],
    cascadeDelete: false,
  });

  // Find shared children between two spouses/partners
  const findSharedChildren = useCallback(
    (personAId: string, personBId: string): { id: string; name: string; relationTypes: RelationshipType[] }[] => {
      const result: { id: string; name: string; relationTypes: RelationshipType[] }[] = [];

      // Find all children where the deleted spouse (personB) is a parent
      const personBChildRels = relationships.filter(
        (r) =>
          r.fromMemberId === personBId &&
          (r.type === "PARENT_CHILD" || r.type === "ADOPTIVE_PARENT" || r.type === "FOSTER_PARENT")
      );

      // For each child, check if personA is also a parent
      for (const childRel of personBChildRels) {
        const personAParentRel = relationships.find(
          (r) =>
            r.fromMemberId === personAId &&
            r.toMemberId === childRel.toMemberId &&
            (r.type === "PARENT_CHILD" || r.type === "ADOPTIVE_PARENT" || r.type === "FOSTER_PARENT")
        );

        if (personAParentRel) {
          // This is a shared child
          const childMember = members.find((m) => m.id === childRel.toMemberId);
          if (childMember) {
            result.push({
              id: childMember.id,
              name: `${childMember.firstName} ${childMember.lastName || ""}`.trim(),
              relationTypes: [childRel.type], // The relationship type from the deleted spouse
            });
          }
        }
      }

      return result;
    },
    [relationships, members]
  );

  // Handle relationship deletion with spouse cascade support
  const handleDeleteRelationship = useCallback(
    async (edgeId: string, fromMemberId: string, toMemberId: string, type: RelationshipType) => {
      const isSpouseType = type === "SPOUSE" || type === "PARTNER" || type === "EX_SPOUSE";

      if (isSpouseType) {
        // Check for shared children
        const sharedChildren = findSharedChildren(fromMemberId, toMemberId);

        if (sharedChildren.length > 0) {
          // Find the name of the spouse being "removed"
          const deletedSpouse = members.find((m) => m.id === toMemberId);
          const deletedSpouseName = deletedSpouse
            ? `${deletedSpouse.firstName} ${deletedSpouse.lastName || ""}`.trim()
            : t("relationships.delete.theSpouse");

          // Show cascade dialog
          setSpouseCascade({
            open: true,
            edgeId,
            fromMemberId,
            toMemberId,
            type,
            deletedSpouseName,
            sharedChildren,
            cascadeDelete: false,
          });
          return;
        }
      }

      // Simple deletion without cascade - use optimistic UI
      const previousEdges = edges;
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));

      try {
        const response = await fetch(`/api/trees/${treeId}/relationships`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromMemberId, toMemberId, type }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete");
        }

        toast.success(t("relationships.delete.success"));
      } catch (error) {
        console.error("Failed to delete relationship:", error);
        // Rollback on failure
        setEdges(previousEdges);
        toast.error(t("relationships.delete.error"));
      }
    },
    [treeId, edges, setEdges, t, findSharedChildren, members]
  );

  // Execute spouse cascade deletion
  const executeSpouseCascadeDelete = useCallback(async () => {
    const { edgeId, fromMemberId, toMemberId, type, sharedChildren, cascadeDelete } = spouseCascade;

    // Build relationships to delete
    const relationshipsToDelete: { fromMemberId: string; toMemberId: string; type: RelationshipType }[] = [
      { fromMemberId, toMemberId, type },
    ];

    // If cascade is enabled, add the deleted spouse's parent relationships to shared children
    if (cascadeDelete) {
      for (const child of sharedChildren) {
        for (const relType of child.relationTypes) {
          relationshipsToDelete.push({
            fromMemberId: toMemberId, // The "deleted" spouse
            toMemberId: child.id,
            type: relType,
          });
        }
      }
    }

    // Optimistic UI - compute which edges to remove
    const previousEdges = edges;
    const edgeIdsToRemove = new Set<string>();
    edgeIdsToRemove.add(edgeId);

    if (cascadeDelete) {
      // Also compute family-group edges that need updating
      for (const child of sharedChildren) {
        // Find the family-group edge containing this child where toMemberId is a parent
        for (const edge of edges) {
          if (edge.type === "familyGroup") {
            const data = edge.data as FamilyGroupEdgeData;
            if (data.childIds?.includes(child.id) && data.parentIds?.includes(toMemberId)) {
              edgeIdsToRemove.add(edge.id);
            }
          }
        }
      }
    }

    setEdges((eds) => eds.filter((e) => !edgeIdsToRemove.has(e.id)));
    setSpouseCascade((prev) => ({ ...prev, open: false }));

    try {
      const response = await fetch(`/api/trees/${treeId}/relationships/batch`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationships: relationshipsToDelete }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      toast.success(t("relationships.delete.success"));
      // Refresh to get clean state since family-group edges may need recalculation
      router.refresh();
    } catch (error) {
      console.error("Failed to delete relationships:", error);
      // Rollback on failure
      setEdges(previousEdges);
      toast.error(t("relationships.delete.error"));
    }
  }, [spouseCascade, edges, setEdges, treeId, t, router]);

  // Handle family group child deletion (removes parent-child relationships for a child)
  // Now uses batch delete with proper relationship types and optimistic UI
  const handleDeleteFamilyGroupChild = useCallback(
    async (childId: string, parentIds: string[], parentRelTypes: Map<string, RelationshipType>) => {
      // Build relationships array with proper types
      const relationshipsToDelete = parentIds.map((parentId) => ({
        fromMemberId: parentId,
        toMemberId: childId,
        // Use the actual relationship type from parentRelTypes, or default to PARENT_CHILD
        type: parentRelTypes.get(parentId) || ("PARENT_CHILD" as RelationshipType),
      }));

      // Optimistic UI - save and update edges
      const previousEdges = edges;

      // Filter edges: remove family-group edges that would lose this child
      setEdges((eds) =>
        eds.filter((edge) => {
          if (edge.type === "familyGroup") {
            const data = edge.data as FamilyGroupEdgeData;
            // Check if this edge is affected
            const isAffected =
              data.childIds?.includes(childId) &&
              parentIds.every((pId) => data.parentIds?.includes(pId));

            if (isAffected) {
              // If this was the only child, remove the edge entirely
              if (data.childIds?.length === 1) {
                return false;
              }
              // Otherwise the edge will be regenerated on refresh
              // For now, just remove it since we're refreshing anyway
              return false;
            }
          }
          return true;
        })
      );

      try {
        const response = await fetch(`/api/trees/${treeId}/relationships/batch`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationships: relationshipsToDelete }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete");
        }

        toast.success(t("relationships.delete.success"));
        // Refresh to get updated edges
        router.refresh();
      } catch (error) {
        console.error("Failed to delete family relationship:", error);
        // Rollback on failure
        setEdges(previousEdges);
        toast.error(t("relationships.delete.error"));
      }
    },
    [treeId, edges, setEdges, t, router]
  );

  // Update nodes/edges when data changes
  // Note: handleDeleteRelationship and handleDeleteFamilyGroupChild are intentionally
  // excluded from deps to avoid infinite loops - they depend on `edges` which this effect sets.
  // The callbacks are stable references for the edge data, not triggers for re-running.
  useEffect(() => {
    setNodes(transformMembersToNodes(members));
    setEdges(transformRelationshipsToEdges(
      relationships,
      members,
      canEdit,
      handleDeleteRelationship,
      handleDeleteFamilyGroupChild
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, relationships, setNodes, setEdges, canEdit]);

  // Handle node click to show member details
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const member = members.find((m) => m.id === node.id);
      if (member) {
        setSelectedMember(member);
        setModalOpen(true);
      }
    },
    [members]
  );

  // Handle selecting a related member from within the modal
  const handleMemberSelect = useCallback(
    (memberId: string) => {
      const member = members.find((m) => m.id === memberId);
      if (member) {
        setSelectedMember(member);
      }
    },
    [members]
  );

  // Handle connection for creating relationships
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canEdit) return;

      // Open dialog to select relationship type
      setPendingConnection(connection);
      setAddRelationshipOpen(true);
    },
    [canEdit]
  );

  // Save positions when nodes are moved
  const onNodeDragStop = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      if (!canEdit) return;

      try {
        await fetch(`/api/trees/${treeId}/positions`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positions: [
              {
                id: node.id,
                positionX: node.position.x,
                positionY: node.position.y,
              },
            ],
          }),
        });
      } catch (error) {
        console.error("Failed to save position:", error);
      }
    },
    [treeId, canEdit]
  );

  // Auto-layout function
  const onAutoLayout = useCallback(async () => {
    try {
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
        nodes,
        edges
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      // Save all positions
      if (canEdit && layoutedNodes.length > 0) {
        await fetch(`/api/trees/${treeId}/positions`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positions: layoutedNodes.map((n) => ({
              id: n.id,
              positionX: n.position.x,
              positionY: n.position.y,
            })),
          }),
        });
      }

      // Fit view after layout
      window.requestAnimationFrame(() => {
        fitView({ padding: 0.2 });
      });

      toast.success("Layout applied");
    } catch (error) {
      console.error("Layout error:", error);
      toast.error("Failed to apply layout");
    }
  }, [nodes, edges, setNodes, setEdges, treeId, canEdit, fitView]);

  // MiniMap node color based on gender
  const nodeColor = useCallback((node: Node<FamilyMemberNodeData>) => {
    return GENDER_COLORS[node.data.gender]?.border || "#6b7280";
  }, []);

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={canEdit}
        nodesConnectable={canEdit}
        elementsSelectable={true}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "relationship",
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls
          className="!bg-background/95 !border-border !shadow-lg [&_button]:!bg-background [&_button]:!border-border [&_button]:!text-foreground [&_button:hover]:!bg-muted [&_button_svg]:!fill-foreground"
        />
        <MiniMap
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-background/80 !border-border"
        />
      </ReactFlow>

      {canEdit && (
        <TreeToolbar
          onAddMember={() => setAddMemberOpen(true)}
          onAutoLayout={onAutoLayout}
        />
      )}

      <MemberDetailSheet
        member={selectedMember}
        open={modalOpen}
        onOpenChange={setModalOpen}
        treeId={treeId}
        canEdit={canEdit}
        onMemberSelect={handleMemberSelect}
      />

      <AddMemberDialog
        treeId={treeId}
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
      />

      <AddRelationshipDialog
        treeId={treeId}
        open={addRelationshipOpen}
        onOpenChange={setAddRelationshipOpen}
        connection={pendingConnection}
        members={members}
        relationships={relationships}
        onClose={() => setPendingConnection(null)}
      />

      {/* Spouse Cascade Deletion Dialog */}
      <AlertDialog
        open={spouseCascade.open}
        onOpenChange={(open) => setSpouseCascade((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("relationships.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("relationships.delete.spouseDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {spouseCascade.sharedChildren.length > 0 && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-2">
                {t("relationships.delete.sharedChildren", {
                  name: spouseCascade.deletedSpouseName,
                  count: spouseCascade.sharedChildren.length,
                })}
              </p>
              <ul className="list-disc list-inside text-muted-foreground">
                {spouseCascade.sharedChildren.map((child) => (
                  <li key={child.id}>{child.name}</li>
                ))}
              </ul>
            </div>
          )}
          {spouseCascade.sharedChildren.length > 0 && (
            <div className="flex items-start gap-2 py-2">
              <Checkbox
                id="cascade-delete"
                checked={spouseCascade.cascadeDelete}
                onCheckedChange={(checked) =>
                  setSpouseCascade((prev) => ({ ...prev, cascadeDelete: checked === true }))
                }
              />
              <Label
                htmlFor="cascade-delete"
                className="text-sm font-normal leading-tight cursor-pointer"
              >
                {t("relationships.delete.cascadeOption", {
                  name: spouseCascade.deletedSpouseName,
                })}
              </Label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeSpouseCascadeDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("relationships.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function FamilyTreeCanvas(props: FamilyTreeCanvasProps) {
  return (
    <ReactFlowProvider>
      <FamilyTreeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
