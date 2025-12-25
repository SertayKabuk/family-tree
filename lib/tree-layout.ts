import ELK, { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk.bundled.js";
import { Node, Edge } from "@xyflow/react";

const elk = new ELK();

const elkOptions = {
  "elk.algorithm": "mrtree",
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
  "elk.spacing.nodeNode": "80",
  "elk.direction": "DOWN",
  "elk.layered.nodePlacement.strategy": "SIMPLE",
};

export async function getLayoutedElements<N extends Node, E extends Edge>(
  nodes: N[],
  edges: E[]
): Promise<{ nodes: N[]; edges: E[] }> {
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  const graph: ElkNode = {
    id: "root",
    layoutOptions: elkOptions,
    children: nodes.map((node) => ({
      id: node.id,
      width: 160,
      height: 120,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })) as ElkExtendedEdge[],
  };

  try {
    const layoutedGraph = await elk.layout(graph);

    const layoutedNodes = nodes.map((node) => {
      const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
      return {
        ...node,
        position: {
          x: layoutedNode?.x ?? node.position.x,
          y: layoutedNode?.y ?? node.position.y,
        },
      } as N;
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error("Layout error:", error);
    return { nodes, edges };
  }
}

// Simple grid layout fallback
export function getGridLayout<N extends Node>(nodes: N[]): N[] {
  const columns = Math.ceil(Math.sqrt(nodes.length));
  const nodeWidth = 180;
  const nodeHeight = 140;
  const padding = 40;

  return nodes.map((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    return {
      ...node,
      position: {
        x: col * (nodeWidth + padding),
        y: row * (nodeHeight + padding),
      },
    } as N;
  });
}
