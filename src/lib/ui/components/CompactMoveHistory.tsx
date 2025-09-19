import React, { useState, useMemo, useCallback } from 'react';
import type { ChessmeldMeldFormatCMFV001, ChildReference } from '@/lib/cmf';

interface CompactMoveHistoryProps {
  /** The complete meld data */
  meld: ChessmeldMeldFormatCMFV001;
  /** Currently selected node FEN */
  currentFen: string;
  /** Callback when a node is clicked */
  onNodeClick: (fen: string) => void;
  /** The detected mainline path */
  mainlinePath: string[];
  /** The moves in the mainline path */
  mainlineMoves: string[];
  /** Available moves from current position */
  availableMoves: ChildReference[];
  /** Whether to show only strictly legal moves */
  strictLegalOnly?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Callback for audio navigation (optional) */
  onAudioSeek?: (timestamp: number) => void;
}

interface CompactMoveHistoryState {
  isExpanded: boolean;
}

export function CompactMoveHistory({
  meld,
  currentFen,
  onNodeClick,
  mainlinePath,
  mainlineMoves,
  availableMoves,
  strictLegalOnly = true,
  className = '',
  onAudioSeek
}: CompactMoveHistoryProps) {
  const [state, setState] = useState<CompactMoveHistoryState>({
    isExpanded: false
  });

  // Filter available moves by legal policy
  const filteredMoves = useMemo(() => {
    if (!strictLegalOnly) return availableMoves;

    return availableMoves.filter(child => {
      // Find the move event for this child
      const moveEvent = meld.events.find(event => 
        event.type === 'move' && 
        'fen' in event && 
        event.fen === child.fen
      );
      
      // Only include strictly legal moves
      return moveEvent && moveEvent.type === 'move' && moveEvent.legalPolicy === 'strict';
    });
  }, [availableMoves, strictLegalOnly, meld.events]);

  // Get current position in mainline
  const currentMainlineIndex = useMemo(() => {
    // The currentFen represents the position after a move
    // mainlinePath contains positions after each move
    // We need to find the index of the move that led to this position
    const positionIndex = mainlinePath.findIndex(fen => fen === currentFen);
    
    // If we found the position, the move that led to it is at positionIndex - 1
    // But we want to highlight the move, so we return positionIndex - 1
    // If we're at the initial position (index 0), return -1 (no move to highlight)
    return positionIndex > 0 ? positionIndex - 1 : -1;
  }, [mainlinePath, currentFen]);

  // Get current breadcrumb (path from root to current position)
  const currentBreadcrumb = useMemo(() => {
    const path = calculatePathToNode(meld, currentFen);
    const moves: string[] = [];
    
    // Convert path to moves
    for (let i = 1; i < path.length; i++) {
      const currentNode = meld.nodes[path[i - 1]];
      if (currentNode?.children) {
        const child = currentNode.children.find(c => c.fen === path[i]);
        if (child) {
          moves.push(child.move);
        }
      }
    }
    
    return moves;
  }, [meld, currentFen]);

  // Get current move context for variations
  const currentMoveContext = useMemo(() => {
    if (currentBreadcrumb.length === 0) return 'Initial Position';
    
    const moveNumber = Math.ceil(currentBreadcrumb.length / 2);
    const isWhiteMove = currentBreadcrumb.length % 2 === 1;
    
    if (isWhiteMove) {
      return `${moveNumber}.${currentBreadcrumb[currentBreadcrumb.length - 1]}`;
    } else {
      return `${moveNumber}...${currentBreadcrumb[currentBreadcrumb.length - 1]}`;
    }
  }, [currentBreadcrumb]);

  // Toggle expansion
  const toggleExpansion = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  // Find the first occurrence timestamp for a move to a specific FEN
  const findMoveTimestamp = useCallback((targetFen: string): number | null => {
    const moveEvent = meld.events.find(event => 
      event.type === 'move' && 
      'fen' in event && 
      event.fen === targetFen
    );
    
    return moveEvent ? moveEvent.t : null;
  }, [meld.events]);

  // Handle mainline move click with audio navigation
  const handleMainlineMoveClick = useCallback((index: number) => {
    // mainlineMoves[index] is the move we clicked on
    // mainlinePath[index + 1] is the position after that move
    const targetIndex = index + 1;
    if (targetIndex < mainlinePath.length) {
      const targetFen = mainlinePath[targetIndex];
      onNodeClick(targetFen);
      
      // Also seek audio to this position
      if (onAudioSeek) {
        const timestamp = findMoveTimestamp(targetFen);
        if (timestamp !== null) {
          onAudioSeek(timestamp);
        }
      }
    }
  }, [mainlinePath, onNodeClick, onAudioSeek, findMoveTimestamp]);

  // Handle variation move click with audio navigation
  const handleVariationClick = useCallback((fen: string) => {
    onNodeClick(fen);
    
    // Also seek audio to this position
    if (onAudioSeek) {
      const timestamp = findMoveTimestamp(fen);
      if (timestamp !== null) {
        onAudioSeek(timestamp);
      }
    }
  }, [onNodeClick, onAudioSeek, findMoveTimestamp]);

  // Format breadcrumb for display
  const formatBreadcrumb = (moves: string[]): string => {
    if (moves.length === 0) return 'Initial Position';
    
    const formatted: string[] = [];
    for (let i = 0; i < moves.length; i++) {
      const moveNumber = Math.floor(i / 2) + 1;
      const isWhiteMove = i % 2 === 0;
      
      if (isWhiteMove) {
        formatted.push(`${moveNumber}.${moves[i]}`);
      } else {
        formatted.push(moves[i]);
      }
    }
    
    return formatted.join(' ');
  };

  return (
    <div className={`compact-move-history ${className}`}>
      {/* Collapsed State */}
      {!state.isExpanded && (
        <div 
          className="compact-move-history__collapsed"
          onClick={toggleExpansion}
          role="button"
          tabIndex={0}
          aria-label="Expand move history"
        >
          <div className="compact-move-history__header">
            <span className="compact-move-history__icon">♟️</span>
            <span className="compact-move-history__title">
              Move History
            </span>
            <span className="compact-move-history__expand">▼</span>
          </div>
          <div className="compact-move-history__breadcrumb">
            {formatBreadcrumb(currentBreadcrumb)}
          </div>
        </div>
      )}

      {/* Expanded State */}
      {state.isExpanded && (
        <div className="compact-move-history__expanded">
          <div className="compact-move-history__header">
            <span className="compact-move-history__title">Move History</span>
            <button 
              className="compact-move-history__collapse"
              onClick={toggleExpansion}
              aria-label="Collapse move history"
            >
              ▲
            </button>
          </div>

          {/* Mainline Moves */}
          <div className="compact-move-history__mainline">
            <div className="compact-move-history__mainline-scroll">
              {mainlineMoves.map((move, index) => {
                const isCurrent = index === currentMainlineIndex;
                const moveNumber = Math.floor(index / 2) + 1;
                const isWhiteMove = index % 2 === 0;
                
                return (
                  <button
                    key={`${index}-${move}`}
                    className={`compact-move-history__mainline-move ${isCurrent ? 'current' : ''}`}
                    onClick={() => handleMainlineMoveClick(index)}
                    aria-label={`Go to move ${moveNumber}${isWhiteMove ? '' : '...'}${move}`}
                  >
                    {isWhiteMove && <span className="move-number">{moveNumber}.</span>}
                    <span className="move-notation">{move}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Position */}
          <div className="compact-move-history__current">
            <span className="compact-move-history__current-label">Current:</span>
            <span className="compact-move-history__current-path">
              {formatBreadcrumb(currentBreadcrumb)}
            </span>
          </div>

          {/* Variations */}
          {filteredMoves.length > 0 && (
            <div className="compact-move-history__variations">
              <div className="compact-move-history__variations-label">
                Variations at {currentMoveContext}:
              </div>
              <div className="compact-move-history__variations-list">
                {filteredMoves.map((variation, index) => {
                  const isMainline = mainlinePath.includes(variation.fen);
                  
                  return (
                    <button
                      key={`${variation.fen}-${index}`}
                      className={`compact-move-history__variation ${isMainline ? 'mainline' : ''}`}
                      onClick={() => handleVariationClick(variation.fen)}
                      aria-label={`Explore variation ${variation.move}`}
                    >
                      {variation.move}
                      {isMainline && <span className="mainline-indicator">(main)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="compact-move-history__legend">
            <div className="legend-item">
              <span className="legend-symbol">(main)</span>
              <span>Mainline move</span>
            </div>
            <div className="legend-item">
              <span className="legend-symbol">⚡</span>
              <span>Piece-legal move</span>
            </div>
            <div className="legend-item">
              <span className="legend-symbol">🔓</span>
              <span>Free move</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
