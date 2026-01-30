import {
  NODE_WIDTH,
  NODE_HEIGHT,
  HORIZONTAL_GAP,
  VERTICAL_GAP,
} from "./constants";
import type { Position, TargetPosition } from "./types";

/**
 * Position nodes within a component with collision avoidance
 */
export function positionComponent(
  sortedGens: number[],
  generationGroups: Map<number, string[]>,
  spousePairs: Map<string, string>,
  childToParents: Map<string, Set<string>>
): Map<string, Position> {
  const positions = new Map<string, Position>();

  for (const gen of sortedGens) {
    const nodesInGen = generationGroups.get(gen)!;
    const y = gen * (NODE_HEIGHT + VERTICAL_GAP);

    // Group nodes into couples and singles
    const groups = groupNodesIntoCouples(nodesInGen, spousePairs);

    // Sort groups to position children near their parents
    sortGroupsByParentPosition(groups, childToParents, positions);

    // Calculate initial positions
    const targetPositions = calculateInitialPositions(
      groups,
      childToParents,
      positions
    );

    // Apply collision avoidance
    resolveCollisions(targetPositions);

    // Store final positions
    for (const { nodeId, x } of targetPositions) {
      positions.set(nodeId, { x, y });
    }
  }

  return positions;
}

/**
 * Group nodes into couples (spouses together) and singles
 */
function groupNodesIntoCouples(
  nodesInGen: string[],
  spousePairs: Map<string, string>
): string[][] {
  const processed = new Set<string>();
  const groups: string[][] = [];

  for (const nodeId of nodesInGen) {
    if (processed.has(nodeId)) continue;

    const spouseId = spousePairs.get(nodeId);
    if (
      spouseId &&
      nodesInGen.includes(spouseId) &&
      !processed.has(spouseId)
    ) {
      // Couple - sort by ID for consistent ordering (affects edge handle direction)
      const couple = [nodeId, spouseId].sort();
      groups.push(couple);
      processed.add(nodeId);
      processed.add(spouseId);
    } else {
      // Single
      groups.push([nodeId]);
      processed.add(nodeId);
    }
  }

  return groups;
}

/**
 * Sort groups so children are positioned near their parents
 */
function sortGroupsByParentPosition(
  groups: string[][],
  childToParents: Map<string, Set<string>>,
  positions: Map<string, Position>
): void {
  groups.sort((a, b) => {
    const aParents = childToParents.get(a[0]);
    const bParents = childToParents.get(b[0]);

    if (aParents && aParents.size > 0 && bParents && bParents.size > 0) {
      // Both have parents - sort by parent X position
      const aParentX = getParentCenterX(a[0], positions, childToParents);
      const bParentX = getParentCenterX(b[0], positions, childToParents);
      return aParentX - bParentX;
    } else if (aParents && aParents.size > 0) {
      return 1; // a has parents, b doesn't -> b comes first
    } else if (bParents && bParents.size > 0) {
      return -1;
    }
    return 0;
  });
}

/**
 * Calculate initial positions for all nodes in a generation
 */
function calculateInitialPositions(
  groups: string[][],
  childToParents: Map<string, Set<string>>,
  positions: Map<string, Position>
): TargetPosition[] {
  // Calculate total width needed
  let totalWidth = 0;
  for (const group of groups) {
    totalWidth +=
      group.length * NODE_WIDTH + (group.length - 1) * (HORIZONTAL_GAP / 2);
  }
  totalWidth += (groups.length - 1) * HORIZONTAL_GAP;

  // Initial X position (centered around 0)
  let currentX = -totalWidth / 2;
  const targetPositions: TargetPosition[] = [];

  for (const group of groups) {
    // Try to center under parents if this is a child
    const childId = group[0];
    const parents = childToParents.get(childId);

    let groupStartX = currentX;

    if (parents && parents.size > 0) {
      const parentCenterX = getParentCenterX(childId, positions, childToParents);
      if (parentCenterX !== 0) {
        // Center this group under parents
        const groupWidth =
          group.length * NODE_WIDTH + (group.length - 1) * (HORIZONTAL_GAP / 2);
        groupStartX = parentCenterX - groupWidth / 2;
      }
    }

    for (let i = 0; i < group.length; i++) {
      const nodeId = group[i];
      targetPositions.push({
        nodeId,
        x: groupStartX + i * (NODE_WIDTH + HORIZONTAL_GAP / 2),
      });
    }

    currentX +=
      group.length * NODE_WIDTH +
      (group.length - 1) * (HORIZONTAL_GAP / 2) +
      HORIZONTAL_GAP;
  }

  return targetPositions;
}

/**
 * Push overlapping nodes to the right to resolve collisions
 */
function resolveCollisions(targetPositions: TargetPosition[]): void {
  targetPositions.sort((a, b) => a.x - b.x);

  for (let i = 1; i < targetPositions.length; i++) {
    const prev = targetPositions[i - 1];
    const curr = targetPositions[i];
    const minX = prev.x + NODE_WIDTH + HORIZONTAL_GAP / 2;

    if (curr.x < minX) {
      // Push this node and all following nodes right
      const pushAmount = minX - curr.x;
      for (let j = i; j < targetPositions.length; j++) {
        targetPositions[j].x += pushAmount;
      }
    }
  }
}

/**
 * Calculate the center X position of a child's parents
 */
export function getParentCenterX(
  childId: string,
  positions: Map<string, Position>,
  childToParents: Map<string, Set<string>>
): number {
  const parents = childToParents.get(childId);
  if (!parents || parents.size === 0) return 0;

  let totalX = 0;
  let count = 0;

  for (const parentId of parents) {
    const pos = positions.get(parentId);
    if (pos) {
      totalX += pos.x + NODE_WIDTH / 2;
      count++;
    }
  }

  return count > 0 ? totalX / count : 0;
}
