"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
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

import { FamilyMember, Relationship, Gender, RelationshipType } from "@prisma/client";
import { FamilyMemberNode, FamilyMemberNodeData } from "@/components/nodes/family-member-node";
import { RelationshipEdge, RelationshipEdgeData } from "@/components/edges/relationship-edge";
import { TreeToolbar } from "@/components/tree/tree-toolbar";
import { MemberDetailSheet } from "@/components/tree/member-detail-sheet";
import { AddMemberDialog } from "@/components/tree/add-member-dialog";
import { AddRelationshipDialog } from "@/components/tree/add-relationship-dialog";
import { getLayoutedElements, getGridLayout } from "@/lib/tree-layout";
import { GENDER_COLORS } from "@/lib/tree-colors";
import { toast } from "sonner";

const nodeTypes: NodeTypes = {
  familyMember: FamilyMemberNode,
};

const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdge,
};

interface FamilyTreeCanvasProps {
  treeId: string;
  members: FamilyMember[];
  relationships: Relationship[];
  canEdit: boolean;
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
    },
  }));
}

function transformRelationshipsToEdges(
  relationships: Relationship[],
  members: FamilyMember[]
): Edge<RelationshipEdgeData>[] {
  const memberMap = new Map(members.map((m) => [m.id, m]));

  return relationships.map((rel) => {
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

    return {
      id: `${rel.fromMemberId}-${rel.toMemberId}-${rel.type}`,
      source: rel.fromMemberId,
      target: rel.toMemberId,
      sourceHandle: isHorizontal ? "left" : undefined,
      targetHandle: isHorizontal ? "right" : undefined,
      type: "relationship",
      data: {
        type: rel.type,
        fromGender: fromMember?.gender,
        toGender: toMember?.gender,
        marriageDate: rel.marriageDate?.toISOString() ?? null,
        divorceDate: rel.divorceDate?.toISOString() ?? null,
        customColor: rel.customColor,
      },
    };
  });
}

function FamilyTreeCanvasInner({
  treeId,
  members,
  relationships,
  canEdit,
}: FamilyTreeCanvasProps) {
  const { fitView } = useReactFlow();

  const initialNodes = useMemo(() => transformMembersToNodes(members), [members]);
  const initialEdges = useMemo(
    () => transformRelationshipsToEdges(relationships, members),
    [relationships, members]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addRelationshipOpen, setAddRelationshipOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

  // Update nodes/edges when data changes
  useEffect(() => {
    setNodes(transformMembersToNodes(members));
    setEdges(transformRelationshipsToEdges(relationships, members));
  }, [members, relationships, setNodes, setEdges]);

  // Handle node click to show member details
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const member = members.find((m) => m.id === node.id);
      if (member) {
        setSelectedMember(member);
        setSheetOpen(true);
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
        <Controls />
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
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        treeId={treeId}
        canEdit={canEdit}
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
        onClose={() => setPendingConnection(null)}
      />
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
