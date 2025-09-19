import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import type { MoveEvent } from '@/lib/cmf';

interface MoveHistoryProps {
  /** Array of move events from the CMF format */
  moves: MoveEvent[];
  /** Starting FEN position */
  startingFen: string;
  /** Currently selected move index (-1 for initial position, 0 for first move, etc.) */
  currentMoveIndex: number;
  /** Callback when a move is clicked */
  onMoveClick: (moveIndex: number) => void;
  /** Whether to show navigation controls (back/forward buttons) */
  showNavigation?: boolean;
  /** Callback for navigation controls */
  onGoBack?: () => void;
  onGoForward?: () => void;
  /** Whether navigation controls are enabled */
  canGoBack?: boolean;
  canGoForward?: boolean;
  /** Whether the component is in readonly mode */
  readonly?: boolean;
  /** Custom CSS classes */
  className?: string;
}

interface FormattedMove {
  moveNumber: number;
  whiteMove: string | null;
  blackMove: string | null;
  whiteMoveIndex: number;
  blackMoveIndex: number;
}

export function MoveHistory({
  moves,
  startingFen,
  currentMoveIndex,
  onMoveClick,
  showNavigation = false,
  onGoBack,
  onGoForward,
  canGoBack = false,
  canGoForward = false,
  readonly = false,
  className = ''
}: MoveHistoryProps) {
  // Format moves into pairs (white/black moves per move number)
  const formattedMoves = useMemo(() => {
    const result: FormattedMove[] = [];
    let moveNumber = 1;
    let whiteMove: string | null = null;
    let blackMove: string | null = null;
    let whiteMoveIndex = -1;
    let blackMoveIndex = -1;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      
      if (i % 2 === 0) {
        // White move
        whiteMove = move.san || null;
        whiteMoveIndex = i;
      } else {
        // Black move
        blackMove = move.san || null;
        blackMoveIndex = i;
        
        // Add the pair to result
        result.push({
          moveNumber,
          whiteMove,
          blackMove,
          whiteMoveIndex,
          blackMoveIndex
        });
        
        // Reset for next pair
        moveNumber++;
        whiteMove = null;
        blackMove = null;
        whiteMoveIndex = -1;
        blackMoveIndex = -1;
      }
    }

    // Add the last move if it's a white move (odd number of moves)
    if (whiteMove !== null) {
      result.push({
        moveNumber,
        whiteMove,
        blackMove: null,
        whiteMoveIndex,
        blackMoveIndex: -1
      });
    }

    return result;
  }, [moves]);

  // Check if a move is currently selected
  const isMoveSelected = (moveIndex: number): boolean => {
    return moveIndex === currentMoveIndex;
  };

  // Handle move click
  const handleMoveClick = (moveIndex: number) => {
    if (!readonly) {
      onMoveClick(moveIndex);
    }
  };

  // Handle initial position click
  const handleInitialPositionClick = () => {
    if (!readonly) {
      onMoveClick(-1);
    }
  };

  if (moves.length === 0) {
    return (
      <div className={`bg-white border-2 border-gray-200 rounded-lg shadow-md overflow-hidden flex flex-col h-full ${className}`}>
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-800 m-0">Move History</h3>
          {showNavigation && (
            <div className="flex gap-2">
              <button
                className="bg-blue-500 text-white border-none rounded w-8 h-8 flex items-center justify-center cursor-pointer text-base font-bold transition-all duration-200 hover:bg-blue-600 hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                onClick={onGoBack}
                disabled={!canGoBack}
                title="Go back one move"
              >
                ←
              </button>
              <button
                className="bg-blue-500 text-white border-none rounded w-8 h-8 flex items-center justify-center cursor-pointer text-base font-bold transition-all duration-200 hover:bg-blue-600 hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                onClick={onGoForward}
                disabled={!canGoForward}
                title="Go forward one move"
              >
                →
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-gray-500 text-center">
          <div className="text-2xl mb-2">♟️</div>
          <p>No moves yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border-2 border-gray-200 rounded-lg shadow-md overflow-hidden flex flex-col h-full ${className}`}>
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center flex-shrink-0">
        <h3 className="text-base font-semibold text-gray-800 m-0">Move History</h3>
        {showNavigation && (
          <div className="flex gap-2">
            <button
              className="bg-blue-500 text-white border-none rounded w-8 h-8 flex items-center justify-center cursor-pointer text-base font-bold transition-all duration-200 hover:bg-blue-600 hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
              onClick={onGoBack}
              disabled={!canGoBack}
              title="Go back one move"
            >
              ←
            </button>
            <button
              className="bg-blue-500 text-white border-none rounded w-8 h-8 flex items-center justify-center cursor-pointer text-base font-bold transition-all duration-200 hover:bg-blue-600 hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
              onClick={onGoForward}
              disabled={!canGoForward}
              title="Go forward one move"
            >
              →
            </button>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 flex flex-wrap content-start gap-0">
        {/* Initial position */}
        <div
          className={`inline-flex items-center gap-2 px-2 py-1 rounded transition-colors duration-200 mr-3 mb-1 ${
            isMoveSelected(-1) 
              ? 'bg-blue-100 border border-blue-500' 
              : readonly 
                ? 'cursor-default' 
                : 'cursor-pointer hover:bg-gray-50'
          }`}
          onClick={() => handleInitialPositionClick()}
        >
          <div className="bg-gray-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold flex-shrink-0">0</div>
          <div className="flex gap-2 flex-1">
            <span className="bg-blue-100 border border-blue-300 text-blue-800 italic text-sm px-2 py-0.5 rounded min-w-auto whitespace-nowrap">Initial Position</span>
          </div>
        </div>

        {/* Move pairs */}
        {formattedMoves.map((pair) => (
          <div
            key={pair.moveNumber}
            className="inline-flex items-center gap-2 px-2 py-1 rounded transition-colors duration-200 mr-3 mb-1"
          >
            <div className="bg-gray-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold flex-shrink-0">{pair.moveNumber}</div>
            <div className="flex gap-2 flex-1">
              {/* White move */}
              <span
                className={`bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 font-mono text-sm font-medium text-gray-800 transition-all duration-200 min-w-8 text-center whitespace-nowrap ${
                  isMoveSelected(pair.whiteMoveIndex) 
                    ? 'bg-yellow-100 border-yellow-400 text-yellow-800 font-semibold' 
                    : readonly 
                      ? '' 
                      : 'cursor-pointer hover:bg-gray-100 hover:border-blue-400 hover:-translate-y-0.5'
                }`}
                onClick={() => handleMoveClick(pair.whiteMoveIndex)}
              >
                {pair.whiteMove}
              </span>
              
              {/* Black move */}
              {pair.blackMove && (
                <span
                  className={`bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 font-mono text-sm font-medium text-gray-800 transition-all duration-200 min-w-8 text-center whitespace-nowrap ${
                    isMoveSelected(pair.blackMoveIndex) 
                      ? 'bg-yellow-100 border-yellow-400 text-yellow-800 font-semibold' 
                      : readonly 
                        ? '' 
                        : 'cursor-pointer hover:bg-gray-100 hover:border-blue-400 hover:-translate-y-0.5'
                  }`}
                  onClick={() => handleMoveClick(pair.blackMoveIndex)}
                >
                  {pair.blackMove}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
