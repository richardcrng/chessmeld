// Main exports for the renderer-core package
export type {
  MeldV0_0_1,
  TimelineState,
  MoveIndexEntry,
  AudioClock,
  PlayerState
} from './types';

export type {
  ChessmeldMeldFormatCMFV001,
  PositionNode,
  ChildReference,
  ParentReference,
  Event,
  MoveEvent,
  AnnotateEvent,
  TextEvent,
  PausePointEvent,
  ClearAnnotationsEvent,
  ColoredArrow,
  ColoredSquare,
  PrecomputedEval
} from '@/lib/cmf';

export type {
  GraphPath,
  GraphState,
  GraphMoveIndex,
  GraphSearchResult,
  GraphNavigationOptions,
  ActiveAnnotation,
  GraphStats,
  NodeAnalysis
} from './graph-traversal';

export { buildMoveIndex } from './buildMoveIndex';
export { computeStateAtTime } from './computeStateAtTime';

// Graph-based functions for v0.0.1
export {
  buildGraphMoveIndex,
  getNodeById,
  findNodeByPath,
  getAllPaths,
  computeStateAtNode,
  getMainlinePath,
  getVariationsAtNode,
  getNextMainlineMove,
  getPreviousMove,
  searchNodes,
  analyzeGraph,
  analyzeNode
} from './graph-traversal';
