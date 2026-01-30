/**
 * Functions for assigning generation numbers to family members
 * Generation 0 = oldest ancestors, higher numbers = younger generations
 */

/**
 * Assign generation numbers to nodes in a component
 * Uses both upward (to ancestors) and downward (to descendants) traversal
 */
export function assignGenerationsForComponent(
  component: string[],
  componentNodeIds: Set<string>,
  spousePairs: Map<string, string>,
  childToParents: Map<string, Set<string>>,
  parentToChildren: Map<string, Set<string>>,
  allNodeIds: Set<string>
): Map<string, number> {
  const nodeGenerations = new Map<string, number>();

  // Find the "deepest" node (most ancestors) to start from
  let maxAncestorDepth = -1;
  let startNode = component[0];

  for (const nodeId of component) {
    const depth = countAncestorDepth(
      nodeId,
      childToParents,
      componentNodeIds,
      new Set()
    );
    if (depth > maxAncestorDepth) {
      maxAncestorDepth = depth;
      startNode = nodeId;
    }
  }

  // Traverse upward from the deepest node to find oldest generation
  const ancestorChain = getAncestorChain(
    startNode,
    childToParents,
    componentNodeIds
  );

  // Find the root ancestor (start of chain)
  const rootAncestor =
    ancestorChain.length > 0
      ? ancestorChain[ancestorChain.length - 1]
      : startNode;

  // BFS from root ancestor, going both up and down
  const queue: { id: string; gen: number }[] = [
    { id: rootAncestor, gen: 0 },
  ];

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;

    if (!componentNodeIds.has(id)) continue;

    if (nodeGenerations.has(id)) {
      // Already assigned - keep minimum (oldest generation)
      if (gen < nodeGenerations.get(id)!) {
        nodeGenerations.set(id, gen);
      } else {
        continue;
      }
    } else {
      nodeGenerations.set(id, gen);
    }

    // Spouse should be on same generation
    const spouseId = spousePairs.get(id);
    if (
      spouseId &&
      componentNodeIds.has(spouseId) &&
      allNodeIds.has(spouseId)
    ) {
      if (!nodeGenerations.has(spouseId)) {
        queue.push({ id: spouseId, gen });
      }
    }

    // Children should be one generation below (higher number)
    const children = parentToChildren.get(id);
    if (children) {
      for (const childId of children) {
        if (componentNodeIds.has(childId) && allNodeIds.has(childId)) {
          queue.push({ id: childId, gen: gen + 1 });
        }
      }
    }

    // Parents should be one generation above (lower number)
    const parents = childToParents.get(id);
    if (parents) {
      for (const parentId of parents) {
        if (componentNodeIds.has(parentId) && allNodeIds.has(parentId)) {
          if (
            !nodeGenerations.has(parentId) ||
            gen - 1 < nodeGenerations.get(parentId)!
          ) {
            queue.push({ id: parentId, gen: gen - 1 });
          }
        }
      }
    }
  }

  // Handle any unassigned nodes
  for (const nodeId of component) {
    if (!nodeGenerations.has(nodeId)) {
      nodeGenerations.set(nodeId, 0);
    }
  }

  // Normalize generations so minimum is 0
  let minGen = Infinity;
  for (const gen of nodeGenerations.values()) {
    minGen = Math.min(minGen, gen);
  }
  if (minGen !== 0 && minGen !== Infinity) {
    for (const [nodeId, gen] of nodeGenerations) {
      nodeGenerations.set(nodeId, gen - minGen);
    }
  }

  return nodeGenerations;
}

/**
 * Count how many ancestor generations a node has
 */
export function countAncestorDepth(
  nodeId: string,
  childToParents: Map<string, Set<string>>,
  componentNodeIds: Set<string>,
  visited: Set<string>
): number {
  if (visited.has(nodeId)) return 0;
  visited.add(nodeId);

  const parents = childToParents.get(nodeId);
  if (!parents || parents.size === 0) return 0;

  let maxParentDepth = 0;
  for (const parentId of parents) {
    if (componentNodeIds.has(parentId)) {
      const depth = countAncestorDepth(
        parentId,
        childToParents,
        componentNodeIds,
        visited
      );
      maxParentDepth = Math.max(maxParentDepth, depth + 1);
    }
  }

  return maxParentDepth;
}

/**
 * Get chain of ancestors from a node (going upward)
 */
export function getAncestorChain(
  nodeId: string,
  childToParents: Map<string, Set<string>>,
  componentNodeIds: Set<string>
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  let current = nodeId;

  while (true) {
    if (visited.has(current)) break;
    visited.add(current);

    const parents = childToParents.get(current);
    if (!parents || parents.size === 0) break;

    // Get first parent that's in this component
    let nextParent: string | null = null;
    for (const parentId of parents) {
      if (componentNodeIds.has(parentId)) {
        nextParent = parentId;
        break;
      }
    }

    if (!nextParent) break;
    chain.push(nextParent);
    current = nextParent;
  }

  return chain;
}
