import { useState, useMemo, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { ChessmeldMeldFormatCMFV001, PositionNode, ChildReference } from '@/lib/cmf';
import { getMainlinePath, getVariationsAtNode, getNextMainlineMove, getPreviousMove } from '@/lib/renderer';

export interface GraphNavigationState {
  currentNodeFen: string;
  currentPath: string[]; // Array of FEN strings representing the current path
  availableMoves: ChildReference[];
  canGoBack: boolean;
  canGoForward: boolean;
  isAtRoot: boolean;
  isAtLeaf: boolean;
  moveNumber: number;
  depth: number;
  mainlinePath: string[]; // The detected mainline path
  mainlineMoves: string[]; // The moves in the mainline path
}

export interface GraphNavigationActions {
  goToNode: (fen: string) => void;
  goToMove: (move: string) => void;
  goBack: () => void;
  goForward: () => void;
  goToRoot: () => void;
  goToMainline: () => void;
  goToVariation: (move: string) => void;
  reset: () => void;
  goToNodeWithAudio: (fen: string, onAudioSeek?: (timestamp: number) => void) => void;
}

export interface UseGraphNavigationOptions {
  /** Only show strictly legal moves in navigation */
  strictLegalOnly?: boolean;
  /** Start at a specific node instead of root */
  initialNodeFen?: string;
  /** Callback when navigation state changes */
  onNavigationChange?: (state: GraphNavigationState) => void;
  /** Current audio timeline position for dynamic mainline calculation */
  currentTimeMs?: number;
}

export function useGraphNavigation(
  meld: ChessmeldMeldFormatCMFV001,
  options: UseGraphNavigationOptions = {}
): [GraphNavigationState, GraphNavigationActions] {
  const { strictLegalOnly = true, initialNodeFen, onNavigationChange, currentTimeMs } = options;
  
  // Initialize with root node or specified initial node
  const [currentNodeFen, setCurrentNodeFen] = useState<string>(
    initialNodeFen || meld.rootNodeId
  );

  // Calculate mainline path based on audio time spent
  const mainlineData = useMemo(() => {
    if (currentTimeMs !== undefined) {
      return calculateDynamicMainlinePath(meld, currentTimeMs);
    }
    return calculateMainlinePath(meld);
  }, [meld, currentTimeMs]);

  // Calculate current navigation state
  const navigationState = useMemo((): GraphNavigationState => {
    const currentNode = meld.nodes[currentNodeFen];
    if (!currentNode) {
      throw new Error(`Node ${currentNodeFen} not found in meld`);
    }

    // Get available moves from current node
    let availableMoves = getVariationsAtNode(meld, currentNodeFen);
    
    // Filter by legal policy if required
    if (strictLegalOnly) {
      availableMoves = availableMoves.filter(child => {
        // Find the move event for this child
        const moveEvent = meld.events.find(event => 
          event.type === 'move' && 
          'fen' in event && 
          event.fen === child.fen
        );
        
        // Only include strictly legal moves
        return moveEvent && moveEvent.type === 'move' && moveEvent.legalPolicy === 'strict';
      });
    }

    // Calculate current path by traversing from root
    const currentPath = calculatePathToNode(meld, currentNodeFen);
    
    // Check navigation capabilities
    const canGoBack = currentPath.length > 1;
    const canGoForward = availableMoves.length > 0;
    const isAtRoot = currentNodeFen === meld.rootNodeId;
    const isAtLeaf = availableMoves.length === 0;
    
    // Calculate move number and depth
    const moveNumber = currentNode.moveNumber || 0;
    const depth = currentPath.length - 1;

    return {
      currentNodeFen,
      currentPath,
      availableMoves,
      canGoBack,
      canGoForward,
      isAtRoot,
      isAtLeaf,
      moveNumber,
      depth,
      mainlinePath: mainlineData.path,
      mainlineMoves: mainlineData.moves
    };
  }, [meld.nodes, meld.events, meld.rootNodeId, currentNodeFen, strictLegalOnly, mainlineData]);

  // Navigation actions
  const goToNode = useCallback((fen: string) => {
    if (meld.nodes[fen]) {
      setCurrentNodeFen(fen);
    }
  }, [meld]);

  const goToNodeWithAudio = useCallback((fen: string, onAudioSeek?: (timestamp: number) => void) => {
    if (meld.nodes[fen]) {
      setCurrentNodeFen(fen);
      
      // Find the timestamp for this move and seek audio
      const timestamp = findMoveTimestamp(meld, fen);
      if (timestamp !== null && onAudioSeek) {
        onAudioSeek(timestamp);
      }
    }
  }, [meld]);

  const goToMove = useCallback((move: string) => {
    const currentNode = meld.nodes[currentNodeFen];
    if (!currentNode || !currentNode.children) return;

    const child = currentNode.children.find(c => c.move === move);
    if (child) {
      setCurrentNodeFen(child.fen);
    }
  }, [meld, currentNodeFen]);

  const goBack = useCallback(() => {
    const previousMove = getPreviousMove(meld, currentNodeFen);
    if (previousMove) {
      setCurrentNodeFen(previousMove.node.fen);
    }
  }, [meld, currentNodeFen]);

  const goForward = useCallback(() => {
    const nextMove = getNextMainlineMove(meld, currentNodeFen);
    if (nextMove) {
      setCurrentNodeFen(nextMove.fen);
    }
  }, [meld, currentNodeFen]);

  const goToRoot = useCallback(() => {
    setCurrentNodeFen(meld.rootNodeId);
  }, [meld.rootNodeId]);

  const goToMainline = useCallback(() => {
    // Find the mainline path and navigate to the corresponding position
    const mainlinePath = getMainlinePath(meld);
    const currentDepth = navigationState.depth;
    
    if (currentDepth < mainlinePath.nodeIds.length) {
      setCurrentNodeFen(mainlinePath.nodeIds[currentDepth]);
    }
  }, [meld, navigationState.depth]);

  const goToVariation = useCallback((move: string) => {
    goToMove(move);
  }, [goToMove]);

  const reset = useCallback(() => {
    setCurrentNodeFen(meld.rootNodeId);
  }, [meld.rootNodeId]);

  // Call onNavigationChange when state changes
  useEffect(() => {
    onNavigationChange?.(navigationState);
  }, [navigationState, onNavigationChange]);

  const actions: GraphNavigationActions = {
    goToNode,
    goToMove,
    goBack,
    goForward,
    goToRoot,
    goToMainline,
    goToVariation,
    reset,
    goToNodeWithAudio
  };

  return [navigationState, actions];
}

/**
 * Calculate the path from root to a specific node
 */
function calculatePathToNode(meld: ChessmeldMeldFormatCMFV001, targetFen: string): string[] {
  const path: string[] = [];
  const visited = new Set<string>();

  function findPath(currentFen: string, currentPath: string[]): boolean {
    if (visited.has(currentFen)) return false;
    visited.add(currentFen);

    if (currentFen === targetFen) {
      path.push(...currentPath, currentFen);
      return true;
    }

    const node = meld.nodes[currentFen];
    if (!node || !node.children) return false;

    for (const child of node.children) {
      if (findPath(child.fen, [...currentPath, currentFen])) {
        return true;
      }
    }

    return false;
  }

  findPath(meld.rootNodeId, []);
  return path;
}

/**
 * Get the FEN position for a given node
 */
export function getFenForNode(meld: ChessmeldMeldFormatCMFV001, nodeFen: string): string {
  const node = meld.nodes[nodeFen];
  return node?.fen || nodeFen;
}

/**
 * Get the current board position as a Chess.js game instance
 */
export function getChessPosition(meld: ChessmeldMeldFormatCMFV001, nodeFen: string): Chess {
  const fen = getFenForNode(meld, nodeFen);
  return new Chess(fen);
}

/**
 * Check if a move is legal in the current position
 */
export function isMoveLegal(meld: ChessmeldMeldFormatCMFV001, nodeFen: string, move: string): boolean {
  try {
    const chess = getChessPosition(meld, nodeFen);
    const result = chess.move(move);
    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Get all legal moves from a position
 */
export function getLegalMoves(meld: ChessmeldMeldFormatCMFV001, nodeFen: string): string[] {
  try {
    const chess = getChessPosition(meld, nodeFen);
    return chess.moves();
  } catch {
    return [];
  }
}

/**
 * Find the first occurrence timestamp for a move to a specific FEN
 */
export function findMoveTimestamp(meld: ChessmeldMeldFormatCMFV001, targetFen: string): number | null {
  // Find the first move event that leads to this FEN
  const moveEvent = meld.events.find(event => 
    event.type === 'move' && 
    'fen' in event && 
    event.fen === targetFen
  );
  
  return moveEvent ? moveEvent.t : null;
}

/**
 * Calculate the dynamic mainline path based on current audio timeline position
 * This shows the complete path from current position to the end of the game
 */
export function calculateDynamicMainlinePath(meld: ChessmeldMeldFormatCMFV001, currentTimeMs: number): { path: string[]; moves: string[] } {
  // Get all move events up to the current time, sorted by timestamp
  const moveEventsUpToTime = meld.events
    .filter(event => event.type === 'move' && event.t <= currentTimeMs)
    .sort((a, b) => a.t - b.t);

  if (moveEventsUpToTime.length === 0) {
    // No moves yet, return the complete mainline from root
    return calculateMainlinePath(meld);
  }

  // Find the current position based on the last move event up to current time
  const lastMoveEvent = moveEventsUpToTime[moveEventsUpToTime.length - 1];
  if (!lastMoveEvent || lastMoveEvent.type !== 'move' || !('fen' in lastMoveEvent)) {
    return calculateMainlinePath(meld);
  }

  const currentPositionFen = lastMoveEvent.fen;
  
  // Now find the complete mainline path from this current position to the end
  return calculateMainlineFromPosition(meld, currentPositionFen);
}

/**
 * Calculate the mainline path from a specific position to the end of the game
 */
function calculateMainlineFromPosition(meld: ChessmeldMeldFormatCMFV001, startFen: string): { path: string[]; moves: string[] } {
  const path: string[] = [];
  const moves: string[] = [];
  
  // First, find the path from root to the start position
  const pathToStart = calculatePathToNode(meld, startFen);
  
  // Add the path to start position
  path.push(...pathToStart);
  
  // Convert path to moves
  for (let i = 1; i < pathToStart.length; i++) {
    const currentNode = meld.nodes[pathToStart[i - 1]];
    if (currentNode?.children) {
      const child = currentNode.children.find(c => c.fen === pathToStart[i]);
      if (child) {
        moves.push(child.move);
      }
    }
  }
  
  // Now continue from the start position to find the mainline to the end
  let currentFen = startFen;
  
  while (true) {
    const currentNode = meld.nodes[currentFen];
    if (!currentNode?.children || currentNode.children.length === 0) {
      // Reached the end of the game
      break;
    }
    
    // Find the mainline continuation by looking for the move with the most audio time
    let bestChild: ChildReference | null = null;
    let maxAudioTime = 0;
    
    for (const child of currentNode.children) {
      // Calculate audio time spent at this child position
      const childEvents = meld.events.filter(event => 
        event.type === 'move' && 
        'fen' in event && 
        event.fen === child.fen
      );
      
      let childAudioTime = 0;
      if (childEvents.length > 0) {
        // Find the next move after this child to calculate duration
        const nextMoveEvent = meld.events.find(event => 
          event.type === 'move' && 
          'fen' in event && 
          event.fen !== child.fen &&
          event.t > childEvents[0].t
        );
        
        if (nextMoveEvent) {
          childAudioTime = nextMoveEvent.t - childEvents[0].t;
        } else {
          // This is the last move, use remaining audio time
          childAudioTime = meld.meta.durationMs - childEvents[0].t;
        }
      }
      
      if (childAudioTime > maxAudioTime) {
        maxAudioTime = childAudioTime;
        bestChild = child;
      }
    }
    
    if (bestChild) {
      path.push(bestChild.fen);
      moves.push(bestChild.move);
      currentFen = bestChild.fen;
    } else {
      // No valid continuation found
      break;
    }
  }
  
  return { path, moves };
}

/**
 * Calculate the mainline path based on audio time spent and event count
 */
export function calculateMainlinePath(meld: ChessmeldMeldFormatCMFV001): { path: string[]; moves: string[] } {
  const allPaths: Array<{ path: string[]; moves: string[]; audioTime: number; eventCount: number }> = [];
  
  // Find all possible paths through the game tree
  function findPaths(currentFen: string, currentPath: string[], currentMoves: string[]): void {
    const node = meld.nodes[currentFen];
    if (!node || !node.children || node.children.length === 0) {
      // This is a leaf node, add the path
      allPaths.push({
        path: [...currentPath, currentFen],
        moves: [...currentMoves],
        audioTime: 0,
        eventCount: 0
      });
      return;
    }
    
    // Continue with each child
    for (const child of node.children) {
      findPaths(child.fen, [...currentPath, currentFen], [...currentMoves, child.move]);
    }
  }
  
  // Start from root
  findPaths(meld.rootNodeId, [], []);
  
  // Calculate audio time and event count for each path
  for (const pathData of allPaths) {
    let totalAudioTime = 0;
    let totalEventCount = 0;
    
    // Calculate time spent at each node in the path
    for (let i = 0; i < pathData.path.length - 1; i++) {
      const currentNodeFen = pathData.path[i];
      const nextNodeFen = pathData.path[i + 1];
      
      // Find events for current node
      const nodeEvents = meld.events.filter(event => 
        event.type === 'move' && 
        'fen' in event && 
        event.fen === currentNodeFen
      );
      
      totalEventCount += nodeEvents.length;
      
      // Calculate time spent at this node (duration until next move)
      if (nodeEvents.length > 0) {
        const lastEventAtNode = nodeEvents[nodeEvents.length - 1];
        const nextMoveEvent = meld.events.find(event => 
          event.type === 'move' && 
          'fen' in event && 
          event.fen === nextNodeFen
        );
        
        if (nextMoveEvent) {
          totalAudioTime += nextMoveEvent.t - lastEventAtNode.t;
        }
      }
    }
    
    // Add events for the last node
    const lastNodeFen = pathData.path[pathData.path.length - 1];
    const lastNodeEvents = meld.events.filter(event => 
      event.type === 'move' && 
      'fen' in event && 
      event.fen === lastNodeFen
    );
    totalEventCount += lastNodeEvents.length;
    
    pathData.audioTime = totalAudioTime;
    pathData.eventCount = totalEventCount;
  }
  
  // Find the best path
  // Primary: longest audio time
  // Secondary: most events
  // Tertiary: longest path
  const bestPath = allPaths.reduce((best, current) => {
    if (current.audioTime > best.audioTime) return current;
    if (current.audioTime === best.audioTime && current.eventCount > best.eventCount) return current;
    if (current.audioTime === best.audioTime && current.eventCount === best.eventCount && current.path.length > best.path.length) return current;
    return best;
  });
  
  return {
    path: bestPath.path,
    moves: bestPath.moves
  };
}
