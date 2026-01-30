/**
 * Family Tree Layout Module
 *
 * This module provides algorithms for automatically laying out family tree nodes.
 * It handles:
 * - Spouse positioning (side-by-side)
 * - Generation assignment (grandparents above parents above children)
 * - Centering children under parents
 * - Collision avoidance
 * - Multiple disconnected family trees
 */

// Main layout function
export { getLayoutedElements } from "./layout";

// Grid layout fallback
export { getGridLayout } from "./grid-layout";

// Constants (for external use if needed)
export {
  NODE_WIDTH,
  NODE_HEIGHT,
  HORIZONTAL_GAP,
  VERTICAL_GAP,
  COMPONENT_GAP,
} from "./constants";

// Types
export type { Position, RelationshipMaps } from "./types";
