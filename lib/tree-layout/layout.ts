import { Node, Edge } from "@xyflow/react";
import { NODE_WIDTH, COMPONENT_GAP } from "./constants";
import { parseRelationships, findDisconnectedComponents } from "./graph-analysis";
import { assignGenerationsForComponent } from "./generation-assignment";
import { positionComponent } from "./positioning";
import type { Position } from "./types";

/**
 * Custom family tree layout algorithm that:
 * 1. Places spouses side-by-side on the same level
 * 2. Places children below their parents
 * 3. Centers children under their parent couple
 * 4. Handles multiple disconnected family trees
 * 5. Properly assigns generations (grandparents above parents)
 * 6. Prevents overlapping nodes with collision avoidance
 */
export async function getLayoutedElements<N extends Node, E extends Edge>(
  nodes: N[],
  edges: E[]
): Promise<{ nodes: N[]; edges: E[] }> {
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  // Parse relationships from edges
  const { spousePairs, childToParents, parentToChildren, siblingPairs } =
    parseRelationships(edges);

  const nodeIds = new Set(nodes.map((n) => n.id));

  // Find disconnected components
  const components = findDisconnectedComponents(
    nodes,
    spousePairs,
    childToParents,
    parentToChildren,
    siblingPairs
  );

  // Sort components by size (largest first)
  components.sort((a, b) => b.length - a.length);

  // Position each component separately
  const positions = new Map<string, Position>();
  let componentOffsetX = 0;

  for (const component of components) {
    const componentNodeIds = new Set(component);

    // Assign generations within this component
    const nodeGenerations = assignGenerationsForComponent(
      component,
      componentNodeIds,
      spousePairs,
      childToParents,
      parentToChildren,
      nodeIds,
      siblingPairs
    );

    // Group nodes by generation
    const generationGroups = new Map<number, string[]>();
    for (const [nodeId, gen] of nodeGenerations) {
      if (!generationGroups.has(gen)) {
        generationGroups.set(gen, []);
      }
      generationGroups.get(gen)!.push(nodeId);
    }

    // Sort generations
    const sortedGens = Array.from(generationGroups.keys()).sort(
      (a, b) => a - b
    );

    // Position nodes within this component
    const componentPositions = positionComponent(
      sortedGens,
      generationGroups,
      spousePairs,
      childToParents,
      siblingPairs
    );

    // Find component bounds
    let minX = Infinity;
    let maxX = -Infinity;
    for (const pos of componentPositions.values()) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + NODE_WIDTH);
    }

    // Shift component to its position
    for (const [nodeId, pos] of componentPositions) {
      positions.set(nodeId, {
        x: pos.x - minX + componentOffsetX,
        y: pos.y,
      });
    }

    // Update offset for next component
    componentOffsetX += maxX - minX + COMPONENT_GAP;
  }

  // Center the entire layout around 0
  centerLayout(positions);

  // Apply positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const pos = positions.get(node.id);
    return {
      ...node,
      position: pos ?? node.position,
    } as N;
  });

  // Update edge handles based on new node positions so that
  // horizontal edges (spouse/sibling) connect from the correct side
  const layoutedEdges = edges.map((edge) => {
    const data = edge.data as { type?: string } | undefined;
    const type = data?.type;

    const isHorizontal =
      type === "SPOUSE" ||
      type === "PARTNER" ||
      type === "EX_SPOUSE" ||
      type === "SIBLING" ||
      type === "HALF_SIBLING" ||
      type === "STEP_SIBLING";

    if (!isHorizontal) return edge;

    const sourcePos = positions.get(edge.source);
    const targetPos = positions.get(edge.target);
    if (!sourcePos || !targetPos) return edge;

    if (sourcePos.x < targetPos.x) {
      return { ...edge, sourceHandle: "right-source", targetHandle: "left-target" };
    } else {
      return { ...edge, sourceHandle: "left-source", targetHandle: "right-target" };
    }
  }) as E[];

  return { nodes: layoutedNodes, edges: layoutedEdges };
}

/**
 * Center the layout around the origin (0, 0)
 */
function centerLayout(positions: Map<string, Position>): void {
  if (positions.size === 0) return;

  let totalMinX = Infinity;
  let totalMaxX = -Infinity;

  for (const pos of positions.values()) {
    totalMinX = Math.min(totalMinX, pos.x);
    totalMaxX = Math.max(totalMaxX, pos.x + NODE_WIDTH);
  }

  const centerOffset = (totalMinX + totalMaxX) / 2;

  for (const [nodeId, pos] of positions) {
    positions.set(nodeId, { x: pos.x - centerOffset, y: pos.y });
  }
}
