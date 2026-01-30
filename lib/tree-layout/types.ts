/**
 * Type definitions for tree layout calculations
 */

export interface Position {
  x: number;
  y: number;
}

export interface ParentChildRelation {
  parentId: string;
  childId: string;
}

export interface RelationshipMaps {
  spousePairs: Map<string, string>;
  childToParents: Map<string, Set<string>>;
  parentToChildren: Map<string, Set<string>>;
}

export interface TargetPosition {
  nodeId: string;
  x: number;
}
