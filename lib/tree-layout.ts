/**
 * Family Tree Layout Module
 *
 * This file re-exports the modular layout functions.
 * The implementation has been split into separate files for better maintainability:
 *
 * - tree-layout/constants.ts    - Layout dimensions and gaps
 * - tree-layout/types.ts        - TypeScript type definitions
 * - tree-layout/graph-analysis.ts - Relationship parsing & component detection
 * - tree-layout/generation-assignment.ts - Generation calculation
 * - tree-layout/positioning.ts  - Node positioning with collision avoidance
 * - tree-layout/layout.ts       - Main orchestration
 * - tree-layout/grid-layout.ts  - Fallback grid layout
 */

export { getLayoutedElements } from "./tree-layout/layout";
export { getGridLayout } from "./tree-layout/grid-layout";
export {
  NODE_WIDTH,
  NODE_HEIGHT,
  HORIZONTAL_GAP,
  VERTICAL_GAP,
  COMPONENT_GAP,
} from "./tree-layout/constants";
export type { Position, RelationshipMaps } from "./tree-layout/types";

