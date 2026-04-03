import { Node, Edge } from "@xyflow/react";
import type { ParentChildRelation, RelationshipMaps } from "./types";

/**
 * Parse edges to extract relationship information
 */
export function parseRelationships(edges: Edge[]): RelationshipMaps {
  const spousePairs = new Map<string, string>();
  const siblingPairs = new Map<string, Set<string>>();
  const parentChildRels: ParentChildRelation[] = [];

  for (const edge of edges) {
    const data = edge.data as { type?: string } | undefined;
    const type = data?.type;

    if (type === "SPOUSE" || type === "PARTNER" || type === "EX_SPOUSE") {
      spousePairs.set(edge.source, edge.target);
      spousePairs.set(edge.target, edge.source);
    } else if (
      type === "SIBLING" ||
      type === "HALF_SIBLING" ||
      type === "STEP_SIBLING"
    ) {
      if (!siblingPairs.has(edge.source)) siblingPairs.set(edge.source, new Set());
      if (!siblingPairs.has(edge.target)) siblingPairs.set(edge.target, new Set());
      siblingPairs.get(edge.source)!.add(edge.target);
      siblingPairs.get(edge.target)!.add(edge.source);
    } else if (
      type === "PARENT_CHILD" ||
      type === "ADOPTIVE_PARENT" ||
      type === "FOSTER_PARENT"
    ) {
      parentChildRels.push({ parentId: edge.source, childId: edge.target });
    } else if (type === "FAMILY_GROUP") {
      const groupData = data as { parentIds?: string[]; childIds?: string[] };
      if (groupData.parentIds && groupData.childIds) {
        for (const parentId of groupData.parentIds) {
          for (const childId of groupData.childIds) {
            parentChildRels.push({ parentId, childId });
          }
        }
        if (groupData.parentIds.length === 2) {
          spousePairs.set(groupData.parentIds[0], groupData.parentIds[1]);
          spousePairs.set(groupData.parentIds[1], groupData.parentIds[0]);
        }
      }
    }
  }

  // Build child -> parents mapping
  const childToParents = new Map<string, Set<string>>();
  for (const rel of parentChildRels) {
    if (!childToParents.has(rel.childId)) {
      childToParents.set(rel.childId, new Set());
    }
    childToParents.get(rel.childId)!.add(rel.parentId);
  }

  // Build parent -> children mapping
  const parentToChildren = new Map<string, Set<string>>();
  for (const rel of parentChildRels) {
    if (!parentToChildren.has(rel.parentId)) {
      parentToChildren.set(rel.parentId, new Set());
    }
    parentToChildren.get(rel.parentId)!.add(rel.childId);
  }

  return { spousePairs, childToParents, parentToChildren, siblingPairs };
}

/**
 * Find disconnected components in the family tree graph using BFS
 */
export function findDisconnectedComponents(
  nodes: Node[],
  spousePairs: Map<string, string>,
  childToParents: Map<string, Set<string>>,
  parentToChildren: Map<string, Set<string>>,
  siblingPairs: Map<string, Set<string>>
): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  function bfsComponent(startId: string): string[] {
    const component: string[] = [];
    const queue = [startId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);

      // Add spouse
      const spouseId = spousePairs.get(current);
      if (spouseId && !visited.has(spouseId)) {
        queue.push(spouseId);
      }

      // Add parents
      const parents = childToParents.get(current);
      if (parents) {
        for (const parentId of parents) {
          if (!visited.has(parentId)) {
            queue.push(parentId);
          }
        }
      }

      // Add children
      const children = parentToChildren.get(current);
      if (children) {
        for (const childId of children) {
          if (!visited.has(childId)) {
            queue.push(childId);
          }
        }
      }

      // Add siblings
      const siblings = siblingPairs.get(current);
      if (siblings) {
        for (const siblingId of siblings) {
          if (!visited.has(siblingId)) {
            queue.push(siblingId);
          }
        }
      }
    }

    return component;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const component = bfsComponent(node.id);
      if (component.length > 0) {
        components.push(component);
      }
    }
  }

  return components;
}
