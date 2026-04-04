import {
  NODE_WIDTH,
  NODE_HEIGHT,
  HORIZONTAL_GAP,
  VERTICAL_GAP,
} from "./constants";
import type { Position } from "./types";

interface GroupPosition {
  members: string[];
  x: number;
  width: number;
}

/**
 * Position nodes within a component with collision avoidance.
 * Couples (spouses) are always kept together as a unit.
 */
export function positionComponent(
  sortedGens: number[],
  generationGroups: Map<number, string[]>,
  spousePairs: Map<string, string>,
  childToParents: Map<string, Set<string>>,
  siblingPairs: Map<string, Set<string>>
): Map<string, Position> {
  const positions = new Map<string, Position>();

  for (const gen of sortedGens) {
    const nodesInGen = generationGroups.get(gen)!;
    const y = gen * (NODE_HEIGHT + VERTICAL_GAP);

    // Group nodes into couples and singles
    const groups = groupNodesIntoCouples(nodesInGen, spousePairs);

    // Sort groups to position children near their parents
    sortGroupsByParentPosition(groups, childToParents, positions);

    // Ensure sibling groups are placed adjacent to each other
    sortGroupsBySiblingAdjacency(groups, childToParents, siblingPairs);

    // Calculate group-level positions, centering under the blood-relative's parents
    const groupPositions = calculateGroupPositions(
      groups,
      childToParents,
      siblingPairs,
      positions,
      nodesInGen
    );

    // Resolve collisions at group level (keeps couples together)
    resolveGroupCollisions(groupPositions);

    // Order couple members based on actual resolved positions
    orderCouplesByPosition(groupPositions, childToParents, siblingPairs, nodesInGen);

    // Expand groups to individual node positions
    for (const gp of groupPositions) {
      for (let i = 0; i < gp.members.length; i++) {
        positions.set(gp.members[i], {
          x: gp.x + i * (NODE_WIDTH + HORIZONTAL_GAP / 2),
          y,
        });
      }
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
      // Couple - initial ordering by ID (refined by orderCouplesByPosition later)
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
 * Sort groups so children are positioned near their parents.
 * Checks ALL members in a group for parent info (not just the first).
 */
function sortGroupsByParentPosition(
  groups: string[][],
  childToParents: Map<string, Set<string>>,
  positions: Map<string, Position>
): void {
  groups.sort((a, b) => {
    const aInfo = getGroupParentInfo(a, childToParents, positions);
    const bInfo = getGroupParentInfo(b, childToParents, positions);

    if (aInfo.hasParents && bInfo.hasParents) {
      return aInfo.centerX - bInfo.centerX;
    } else if (aInfo.hasParents) {
      return 1; // a has parents, b doesn't -> b comes first
    } else if (bInfo.hasParents) {
      return -1;
    }
    return 0;
  });
}

/**
 * Check if any member in the group has parents, and return the parent center X.
 */
function getGroupParentInfo(
  group: string[],
  childToParents: Map<string, Set<string>>,
  positions: Map<string, Position>
): { hasParents: boolean; centerX: number } {
  for (const memberId of group) {
    const parents = childToParents.get(memberId);
    if (parents && parents.size > 0) {
      return {
        hasParents: true,
        centerX: getParentCenterX(memberId, positions, childToParents),
      };
    }
  }
  return { hasParents: false, centerX: 0 };
}

/**
 * Reorder groups so that sibling-connected groups are adjacent.
 * Uses greedy chaining: start with first group and always pick
 * a sibling-connected group as the next one if available.
 */
function sortGroupsBySiblingAdjacency(
  groups: string[][],
  childToParents: Map<string, Set<string>>,
  siblingPairs: Map<string, Set<string>>
): void {
  const n = groups.length;
  if (n <= 2) return;

  // Check if two groups share a sibling connection
  function areGroupsSiblings(gA: string[], gB: string[]): boolean {
    for (const a of gA) {
      for (const b of gB) {
        // Direct sibling edge
        if (siblingPairs.get(a)?.has(b)) return true;
        // Shared parent
        const aParents = childToParents.get(a);
        const bParents = childToParents.get(b);
        if (aParents && bParents) {
          for (const p of aParents) {
            if (bParents.has(p)) return true;
          }
        }
      }
    }
    return false;
  }

  const placed: number[] = [0];
  const remaining = new Set<number>();
  for (let i = 1; i < n; i++) remaining.add(i);

  while (remaining.size > 0) {
    const last = placed[placed.length - 1];
    let bestNext: number | null = null;

    for (const idx of remaining) {
      if (areGroupsSiblings(groups[last], groups[idx])) {
        bestNext = idx;
        break;
      }
    }

    if (bestNext === null) {
      bestNext = remaining.values().next().value!;
    }

    placed.push(bestNext);
    remaining.delete(bestNext);
  }

  const reordered = placed.map((i) => [...groups[i]]);
  for (let i = 0; i < n; i++) {
    groups[i] = reordered[i];
  }
}

/**
 * Count how many siblings of `memberId` are in the same generation.
 * Detects siblings both via shared parents AND via direct SIBLING edges.
 */
function countSiblingsInGeneration(
  memberId: string,
  childToParents: Map<string, Set<string>>,
  siblingPairs: Map<string, Set<string>>,
  nodesInGen: string[],
  ...excludeIds: string[]
): number {
  const directSiblings = siblingPairs.get(memberId);
  const parents = childToParents.get(memberId);
  const excludeSet = new Set(excludeIds);
  let count = 0;

  for (const nodeId of nodesInGen) {
    if (nodeId === memberId || excludeSet.has(nodeId)) continue;

    // Check direct sibling edge
    if (directSiblings?.has(nodeId)) {
      count++;
      continue;
    }

    // Check shared parents
    if (parents && parents.size > 0) {
      const nodeParents = childToParents.get(nodeId);
      if (nodeParents) {
        for (const p of parents) {
          if (nodeParents.has(p)) {
            count++;
            break;
          }
        }
      }
    }
  }
  return count;
}

/**
 * Calculate group-level positions. For couples, centers under the
 * "blood-relative" member (the one with sibling connections in this
 * generation) rather than arbitrarily the first member with parents.
 */
function calculateGroupPositions(
  groups: string[][],
  childToParents: Map<string, Set<string>>,
  siblingPairs: Map<string, Set<string>>,
  positions: Map<string, Position>,
  nodesInGen: string[]
): GroupPosition[] {
  const groupWidths = groups.map(
    (g) => g.length * NODE_WIDTH + (g.length - 1) * (HORIZONTAL_GAP / 2)
  );

  let totalWidth = groupWidths.reduce((a, b) => a + b, 0);
  totalWidth += (groups.length - 1) * HORIZONTAL_GAP;

  let currentX = -totalWidth / 2;
  const result: GroupPosition[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    const width = groupWidths[gi];
    let groupX = currentX;

    // For couples: find the blood-relative (member with siblings in this gen)
    // and center under THEIR parents. This ensures the couple is positioned
    // near the sibling, not near the married-in spouse's family.
    const centerMemberIndex = findBloodRelativeIndex(
      group, childToParents, siblingPairs, nodesInGen
    );

    if (centerMemberIndex >= 0) {
      const memberId = group[centerMemberIndex];
      const parentCenterX = getParentCenterX(memberId, positions, childToParents);
      if (parentCenterX !== 0) {
        const memberCenterInGroup =
          centerMemberIndex * (NODE_WIDTH + HORIZONTAL_GAP / 2) + NODE_WIDTH / 2;
        groupX = parentCenterX - memberCenterInGroup;
      }
    } else {
      // Fallback: center under first member with parents
      for (let mi = 0; mi < group.length; mi++) {
        const memberId = group[mi];
        const parents = childToParents.get(memberId);
        if (parents && parents.size > 0) {
          const parentCenterX = getParentCenterX(memberId, positions, childToParents);
          if (parentCenterX !== 0) {
            const memberCenterInGroup =
              mi * (NODE_WIDTH + HORIZONTAL_GAP / 2) + NODE_WIDTH / 2;
            groupX = parentCenterX - memberCenterInGroup;
            break;
          }
        }
      }
    }

    result.push({ members: [...group], x: groupX, width });
    currentX += width + HORIZONTAL_GAP;
  }

  return result;
}

/**
 * Find the index of the "blood-relative" in a group — the member who has
 * siblings (via shared parents or SIBLING edges) in the current generation.
 * Returns -1 if no such member is found.
 */
function findBloodRelativeIndex(
  group: string[],
  childToParents: Map<string, Set<string>>,
  siblingPairs: Map<string, Set<string>>,
  nodesInGen: string[]
): number {
  for (let i = 0; i < group.length; i++) {
    const memberId = group[i];
    const count = countSiblingsInGeneration(
      memberId, childToParents, siblingPairs, nodesInGen,
      // Exclude the other members of this group
      ...group.filter((_, j) => j !== i)
    );
    if (count > 0) {
      // Also verify this member has parents to center under
      const parents = childToParents.get(memberId);
      if (parents && parents.size > 0) return i;
    }
  }
  return -1;
}

/**
 * Order couple members AFTER positions have been resolved.
 * Looks at neighboring groups' actual X positions to decide which side
 * the blood-relative should face.
 */
function orderCouplesByPosition(
  groupPositions: GroupPosition[],
  childToParents: Map<string, Set<string>>,
  siblingPairs: Map<string, Set<string>>,
  nodesInGen: string[]
): void {
  for (let gi = 0; gi < groupPositions.length; gi++) {
    const gp = groupPositions[gi];
    if (gp.members.length !== 2) continue;

    const [a, b] = gp.members;
    const aSibCount = countSiblingsInGeneration(a, childToParents, siblingPairs, nodesInGen, b);
    const bSibCount = countSiblingsInGeneration(b, childToParents, siblingPairs, nodesInGen, a);

    let bloodRelative: string | null = null;
    let otherMember: string | null = null;

    if (aSibCount > 0 && bSibCount === 0) {
      bloodRelative = a;
      otherMember = b;
    } else if (bSibCount > 0 && aSibCount === 0) {
      bloodRelative = b;
      otherMember = a;
    } else {
      continue; // both or neither have siblings, keep current order
    }

    // Find the average X of sibling groups
    const groupCenterX = gp.x + gp.width / 2;
    let siblingTotalX = 0;
    let siblingCount = 0;

    for (let ogi = 0; ogi < groupPositions.length; ogi++) {
      if (ogi === gi) continue;
      const otherGp = groupPositions[ogi];
      const otherCenterX = otherGp.x + otherGp.width / 2;

      for (const otherId of otherGp.members) {
        if (isSibling(bloodRelative, otherId, childToParents, siblingPairs)) {
          siblingTotalX += otherCenterX;
          siblingCount++;
          break;
        }
      }
    }

    if (siblingCount === 0) continue;

    const siblingAvgX = siblingTotalX / siblingCount;

    if (siblingAvgX < groupCenterX) {
      // Siblings are to the LEFT → blood-relative on left
      gp.members = [bloodRelative, otherMember];
    } else {
      // Siblings are to the RIGHT → blood-relative on right
      gp.members = [otherMember, bloodRelative];
    }
  }
}

/**
 * Check if two members are siblings (via shared parents or direct SIBLING edge)
 */
function isSibling(
  a: string,
  b: string,
  childToParents: Map<string, Set<string>>,
  siblingPairs: Map<string, Set<string>>
): boolean {
  if (siblingPairs.get(a)?.has(b)) return true;
  const aParents = childToParents.get(a);
  const bParents = childToParents.get(b);
  if (aParents && bParents) {
    for (const p of aParents) {
      if (bParents.has(p)) return true;
    }
  }
  return false;
}

/**
 * Resolve collisions at the group level — entire couples move
 * together, so non-family members can never end up between spouses.
 */
function resolveGroupCollisions(groupPositions: GroupPosition[]): void {
  groupPositions.sort((a, b) => a.x - b.x);

  for (let i = 1; i < groupPositions.length; i++) {
    const prev = groupPositions[i - 1];
    const curr = groupPositions[i];
    const minX = prev.x + prev.width + HORIZONTAL_GAP;

    if (curr.x < minX) {
      const pushAmount = minX - curr.x;
      for (let j = i; j < groupPositions.length; j++) {
        groupPositions[j].x += pushAmount;
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
