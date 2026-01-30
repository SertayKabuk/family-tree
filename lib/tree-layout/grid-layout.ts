import { Node } from "@xyflow/react";
import { NODE_WIDTH, NODE_HEIGHT } from "./constants";

/**
 * Simple grid layout fallback for when tree layout isn't suitable
 */
export function getGridLayout<N extends Node>(nodes: N[]): N[] {
  const columns = Math.ceil(Math.sqrt(nodes.length));
  const padding = 40;

  return nodes.map((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    return {
      ...node,
      position: {
        x: col * (NODE_WIDTH + padding),
        y: row * (NODE_HEIGHT + padding),
      },
    } as N;
  });
}
