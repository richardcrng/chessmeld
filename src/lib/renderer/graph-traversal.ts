import { Chess } from 'chess.js';
import type {
  ChessmeldMeldFormatCMFV001,
  PositionNode,
  ChildReference,
  ParentReference,
  Event
} from '@/lib/cmf';

// Additional types for graph traversal (not in schema)
export interface GraphPath {
  nodeIds: string[]; // FEN strings
  moves: string[];
}

export interface GraphState {
  currentNode: PositionNode;
  path: GraphPath;
  fen: string;
  moveNumber: number;
  activeAnnotations: ActiveAnnotation[];
  lastTextEvent?: string;
  isPaused: boolean;
  pausePrompt?: string;
}

export interface GraphMoveIndex {
  [fen: string]: {
    fen: string;
    moveNumber: number;
    path: GraphPath;
  };
}

export interface GraphSearchResult {
  node: PositionNode;
  path: GraphPath;
  depth: number;
}

export interface GraphNavigationOptions {
  maxDepth?: number;
  includeVariations?: boolean;
}

export interface ActiveAnnotation {
  type: 'arrow' | 'circle' | 'highlight';
  from?: string; // for arrows
  to?: string; // for arrows
  square?: string; // for circles and highlights
  color?: string;
}

export interface GraphStats {
  totalNodes: number;
  totalMoves: number;
  maxDepth: number;
  branchingFactor: number;
  mainlineLength: number;
}

export interface NodeAnalysis {
  node: PositionNode;
  reachableFrom: string[]; // FEN strings that can reach this node
  reachableTo: string[]; // FEN strings reachable from this node
  depth: number;
  isLeaf: boolean;
  isBranchPoint: boolean;
  variationCount: number;
}

/**
 * Builds a move index for the entire graph by traversing all possible paths.
 * This creates a fast lookup table for FEN positions at any node.
 */
export function buildGraphMoveIndex(meld: ChessmeldMeldFormatCMFV001): GraphMoveIndex {
  const index: GraphMoveIndex = {};
  const visited = new Set<string>();

  function traverseNode(fen: string, path: GraphPath, currentFen: string) {
    if (visited.has(fen)) {
      return; // Avoid infinite loops in cyclic graphs
    }
    visited.add(fen);

    const node = meld.nodes[fen];
    if (!node) {
      console.warn(`Node ${fen} not found in graph`);
      return;
    }

    // Add current node to index
    // Calculate correct move number from half-moves
    const halfMoves = path.moves.length
    const moveNumber = Math.floor(halfMoves / 2) + 1
    
    index[currentFen] = {
      fen: currentFen,
      moveNumber,
      path: { ...path }
    };

    // Traverse children
    if (node.children) {
      for (const child of node.children) {
        const chess = new Chess(currentFen);
        try {
          const result = chess.move(child.move);
          if (result) {
            const newPath: GraphPath = {
              nodeIds: [...path.nodeIds, child.fen],
              moves: [...path.moves, child.move]
            };
            traverseNode(child.fen, newPath, chess.fen());
          }
        } catch (error) {
          console.warn(`Invalid move ${child.move} at node ${fen}:`, error);
        }
      }
    }
  }

  // Start traversal from root
  const rootNode = meld.nodes[meld.rootNodeId];
  if (!rootNode) {
    throw new Error(`Root node ${meld.rootNodeId} not found`);
  }

  traverseNode(meld.rootNodeId, { nodeIds: [meld.rootNodeId], moves: [] }, meld.meta.startingFen);
  
  return index;
}

/**
 * Gets a node by its FEN string.
 */
export function getNodeById(meld: ChessmeldMeldFormatCMFV001, fen: string): PositionNode | null {
  return meld.nodes[fen] || null;
}

/**
 * Finds a node by following a path of moves from the root.
 */
export function findNodeByPath(meld: ChessmeldMeldFormatCMFV001, moves: string[]): PositionNode | null {
  let currentNodeId = meld.rootNodeId;
  
  for (const move of moves) {
    const node = meld.nodes[currentNodeId];
    if (!node || !node.children) {
      return null;
    }
    
    const child = node.children.find((c) => c.move === move);
    if (!child) {
      return null;
    }
    
    currentNodeId = child.fen;
  }
  
  return meld.nodes[currentNodeId] || null;
}

/**
 * Gets all possible paths through the graph (for navigation UI).
 */
export function getAllPaths(meld: ChessmeldMeldFormatCMFV001, options: GraphNavigationOptions = {}): GraphPath[] {
  const paths: GraphPath[] = [];
  const { maxDepth = 100, includeVariations = true } = options;
  const visited = new Set<string>();

  function traverse(fen: string, currentPath: GraphPath, depth: number) {
    if (depth >= maxDepth || visited.has(fen)) return;
    visited.add(fen);

    const node = meld.nodes[fen];
    if (!node) return;

    // Add current path if it's a leaf or if we want all variations
    if (!node.children || node.children.length === 0 || includeVariations) {
      paths.push({ ...currentPath });
    }

    // Continue with children
    if (node.children) {
      const childrenToTraverse = includeVariations ? node.children : node.children.slice(0, 1); // Take first child as "mainline"
      
      for (const child of childrenToTraverse) {
        const newPath: GraphPath = {
          nodeIds: [...currentPath.nodeIds, child.fen],
          moves: [...currentPath.moves, child.move]
        };
        traverse(child.fen, newPath, depth + 1);
      }
    }
  }

  traverse(meld.rootNodeId, { nodeIds: [meld.rootNodeId], moves: [] }, 0);
  return paths;
}

/**
 * Computes the state at a specific node, including active annotations and events.
 */
export function computeStateAtNode(
  meld: ChessmeldMeldFormatCMFV001,
  node: PositionNode,
  path: GraphPath,
  timeMs: number
): GraphState {
  // Collect active annotations from all events up to this time
  const activeAnnotations: ActiveAnnotation[] = [];
  let lastTextEvent: string | undefined;
  let isPaused = false;
  let pausePrompt: string | undefined;

  // Process events for this node (filtered from the flat events array)
  // Sort events by timestamp to ensure chronological order
  const nodeEvents = meld.events
    .filter((event) => 
      event.type === 'annotate' && 'fen' in event && event.fen === node.fen
    )
    .sort((a, b) => a.t - b.t);
  for (const event of nodeEvents) {
    if (event.t > timeMs) break;

    switch (event.type) {
      case 'annotate':
        // Add arrows
        if (event.arrows) {
          for (const arrow of event.arrows) {
            activeAnnotations.push({
              type: 'arrow',
              from: arrow.from,
              to: arrow.to,
              color: arrow.color || 'yellow'
            });
          }
        }
        
        // Add circles
        if (event.circles) {
          for (const circle of event.circles) {
            activeAnnotations.push({
              type: 'circle',
              square: circle.square,
              color: circle.color || 'yellow'
            });
          }
        }

        // Add highlights
        if (event.highlights) {
          for (const highlight of event.highlights) {
            activeAnnotations.push({
              type: 'highlight',
              square: highlight.square,
              color: highlight.color || 'yellow'
            });
          }
        }
        break;

      case 'clear':
        // Clear all accumulated annotations
        activeAnnotations.length = 0;
        break;

      case 'text':
        lastTextEvent = event.text;
        break;

      case 'pausepoint':
        if (event.t <= timeMs) {
          isPaused = true;
          pausePrompt = event.prompt;
        }
        break;
    }
  }

  // Calculate correct move number from half-moves
  const halfMoves = path.moves.length
  const moveNumber = Math.floor(halfMoves / 2) + 1

  return {
    currentNode: node,
    path,
    fen: node.fen,
    moveNumber,
    activeAnnotations,
    lastTextEvent,
    isPaused,
    pausePrompt
  };
}

/**
 * Gets the mainline path (following isMainline flags).
 */
export function getMainlinePath(meld: ChessmeldMeldFormatCMFV001): GraphPath {
  const path: GraphPath = { nodeIds: [meld.rootNodeId], moves: [] };
  let currentNodeId = meld.rootNodeId;

  while (true) {
    const node = meld.nodes[currentNodeId];
    if (!node || !node.children) {
      break;
    }
    
    const mainlineChild = node.children[0]; // Take first child as "mainline"
    if (!mainlineChild) {
      break;
    }
    
    path.nodeIds.push(mainlineChild.fen);
    path.moves.push(mainlineChild.move);
    currentNodeId = mainlineChild.fen;
  }

  return path;
}

/**
 * Gets all variations at a specific node.
 */
export function getVariationsAtNode(meld: ChessmeldMeldFormatCMFV001, fen: string): ChildReference[] {
  const node = meld.nodes[fen];
  return node?.children || [];
}

/**
 * Gets the next move in the mainline from a given node.
 */
export function getNextMainlineMove(meld: ChessmeldMeldFormatCMFV001, fen: string): ChildReference | null {
  const node = meld.nodes[fen];
  if (!node || !node.children) {
    return null;
  }
  
  return node.children[0] || null; // Take first child as "mainline"
}

/**
 * Gets the previous move by following parent references.
 */
export function getPreviousMove(meld: ChessmeldMeldFormatCMFV001, fen: string): { node: PositionNode; move: string } | null {
  const node = meld.nodes[fen];
  if (!node || !node.parents || node.parents.length === 0) {
    return null;
  }

  // For now, return the first parent (could be enhanced to handle multiple parents)
  const parent = node.parents[0];
  const parentNode = meld.nodes[parent.fen];
  
  if (!parentNode) {
    return null;
  }

  return { node: parentNode, move: parent.move };
}

/**
 * Searches for nodes containing specific text in events.
 */
export function searchNodes(
  meld: ChessmeldMeldFormatCMFV001, 
  searchText: string, 
  options: GraphNavigationOptions = {}
): GraphSearchResult[] {
  const results: GraphSearchResult[] = [];
  const { maxDepth = 100 } = options;
  const visited = new Set<string>();

  function traverse(fen: string, currentPath: GraphPath, depth: number) {
    if (depth >= maxDepth || visited.has(fen)) return;
    visited.add(fen);

    const node = meld.nodes[fen];
    if (!node) return;

    // Check events for search text
    const nodeEvents = meld.events.filter((event) => 
      event.type === 'text' && 'fen' in event && event.fen === fen
    );
    for (const event of nodeEvents) {
      if (event.type === 'text' && event.text.toLowerCase().includes(searchText.toLowerCase())) {
        results.push({
          node,
          path: { ...currentPath },
          depth
        });
        break; // Only add each node once
      }
    }

    // Continue traversal
    if (node.children) {
      for (const child of node.children) {
        const newPath: GraphPath = {
          nodeIds: [...currentPath.nodeIds, child.fen],
          moves: [...currentPath.moves, child.move]
        };
        traverse(child.fen, newPath, depth + 1);
      }
    }
  }

  traverse(meld.rootNodeId, { nodeIds: [meld.rootNodeId], moves: [] }, 0);
  return results;
}

/**
 * Analyzes the graph structure and returns statistics.
 */
export function analyzeGraph(meld: ChessmeldMeldFormatCMFV001): GraphStats {
  const nodeIds = Object.keys(meld.nodes);
  const totalNodes = nodeIds.length;
  
  let totalMoves = 0;
  let maxDepth = 0;
  let totalBranches = 0;
  let mainlineLength = 0;

  const visited = new Set<string>();

  function traverse(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    maxDepth = Math.max(maxDepth, depth);
    
    const node = meld.nodes[nodeId];
    if (!node) return;

    if (node.children) {
      totalMoves += node.children.length;
      totalBranches += Math.max(0, node.children.length - 1);
      
      // Count mainline length by following first child path
      if (node.children && node.children.length > 0) {
        mainlineLength++;
      }

      for (const child of node.children) {
        traverse(child.fen, depth + 1);
      }
    }
  }

  traverse(meld.rootNodeId, 0);

  return {
    totalNodes,
    totalMoves,
    maxDepth,
    branchingFactor: totalNodes > 0 ? totalBranches / totalNodes : 0,
    mainlineLength
  };
}

/**
 * Analyzes a specific node and returns detailed information.
 */
export function analyzeNode(meld: ChessmeldMeldFormatCMFV001, nodeId: string): NodeAnalysis | null {
  const node = meld.nodes[nodeId];
  if (!node) return null;

  const reachableFrom: string[] = [];
  const reachableTo: string[] = [];
  const visited = new Set<string>();

  // Find all nodes that can reach this node (parents)
  function findReachableFrom(currentNodeId: string) {
    if (visited.has(currentNodeId)) return;
    visited.add(currentNodeId);

    const currentNode = meld.nodes[currentNodeId];
    if (!currentNode) return;

    if (currentNode.children) {
      for (const child of currentNode.children) {
        if (child.fen === nodeId) {
          reachableFrom.push(currentNodeId);
        } else {
          findReachableFrom(child.fen);
        }
      }
    }
  }

  // Find all nodes reachable from this node (children)
  function findReachableTo(currentNodeId: string) {
    if (visited.has(currentNodeId)) return;
    visited.add(currentNodeId);

    const currentNode = meld.nodes[currentNodeId];
    if (!currentNode) return;

    if (currentNode.children) {
      for (const child of currentNode.children) {
        reachableTo.push(child.fen);
        findReachableTo(child.fen);
      }
    }
  }

  findReachableFrom(meld.rootNodeId);
  visited.clear();
  findReachableTo(nodeId);

  // Calculate depth by finding shortest path from root
  const depth = calculateDepth(meld, nodeId);

  return {
    node,
    reachableFrom,
    reachableTo,
    depth,
    isLeaf: !node.children || node.children.length === 0,
    isBranchPoint: node.children ? node.children.length > 1 : false,
    variationCount: node.children ? node.children.length : 0
  };
}

/**
 * Calculates the depth of a node (shortest path from root).
 */
function calculateDepth(meld: ChessmeldMeldFormatCMFV001, nodeId: string): number {
  const queue: { nodeId: string; depth: number }[] = [{ nodeId: meld.rootNodeId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { nodeId: currentId, depth } = queue.shift()!;
    
    if (currentId === nodeId) {
      return depth;
    }

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = meld.nodes[currentId];
    if (node && node.children) {
      for (const child of node.children) {
        queue.push({ nodeId: child.fen, depth: depth + 1 });
      }
    }
  }

  return -1; // Node not found
}
