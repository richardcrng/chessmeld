'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, GitBranch, Home, SkipBack, SkipForward } from 'lucide-react'
import type { 
  PositionNode, 
  ChildReference
} from '@/lib/cmf'
import type { LegacyEvent } from '@/types/graph-studio'
import type { GraphPath } from '@/lib/renderer-core'
import type { 
  AnnotationState, 
  AnnotationEvent 
} from '@/types/graph-studio'

interface GraphChessBoardProps {
  startingFen?: string
  currentNode: PositionNode
  currentPath: GraphPath
  variations: ChildReference[]
  events: LegacyEvent[]
  onMove: (move: { san: string; fen: string; timestamp: number; color: 'w' | 'b'; moveNumber?: number; comment?: string }) => void
  onVariation: (move: { san: string; fen: string; timestamp: number; color: 'w' | 'b'; moveNumber?: number; comment?: string }) => void
  onNavigateToNode: (fen: string) => void
  onNavigateToMoveIndex: (moveIndex: number) => void
  onGoBack: () => void
  onGoForward: () => void
  onGoToStart: () => void
  onGoToLatest: () => void
  isRecording?: boolean
  currentTime?: number
  disabled?: boolean
  showNavigation?: boolean
  onAnnotationEvent?: (event: AnnotationEvent) => void
  annotationState?: AnnotationState
}

export function GraphChessBoard({
  startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  currentNode,
  currentPath,
  variations,
  events,
  onMove,
  onVariation,
  onNavigateToNode,
  onNavigateToMoveIndex,
  onGoBack,
  onGoForward,
  onGoToStart,
  onGoToLatest,
  isRecording = false,
  currentTime = 0,
  disabled = false,
  showNavigation = true,
  onAnnotationEvent,
  annotationState
}: GraphChessBoardProps) {
  const [game, setGame] = useState(new Chess(currentNode.fen))
  const [position, setPosition] = useState(currentNode.fen)

  // Update position when current node changes
  useEffect(() => {
    const newGame = new Chess(currentNode.fen)
    setGame(newGame)
    setPosition(newGame.fen())
  }, [currentNode.fen])

  // Convert annotations to react-chessboard format
  // Legacy system doesn't support annotations, so return empty arrows
  const chessboardArrows = useMemo(() => {
    return []
  }, [])

  // Legacy system doesn't support annotations, so return empty styles
  const squareStyles = useMemo(() => {
    return {}
  }, [])

  // Handle piece movement
  const handlePieceDrop = useCallback(({ piece, sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }) => {
    if (disabled || !isRecording || !targetSquare) return false

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      })

      if (move) {
        const newFen = game.fen()
        
        // All moves are treated the same way (no mainline/variation distinction)
        // Calculate move number based on current path length
        const currentMoveCount = currentPath.moves.length
        const moveNumber = Math.floor(currentMoveCount / 2) + 1
        
        onMove({
          san: move.san,
          fen: newFen,
          timestamp: currentTime, // This should be relative to audio start time
          color: move.color, // Include the color from the chess.js move
          moveNumber: moveNumber, // Include the calculated move number
        })
        
        return true
      }
    } catch (error) {
      console.error('Invalid move:', error)
    }
    
    return false
  }, [disabled, isRecording, game, currentTime, onMove])

  // Handle square click for annotations
  const handleSquareClick = ({ square }: { square: string }) => {
    if (!isRecording || !onAnnotationEvent || !annotationState) return

    // Handle annotation logic here
    // This would be similar to the existing annotation system
  }

  // Get color value for annotations
  const getColorValue = (color: string, alpha = 1) => {
    const colors: Record<string, string> = {
      yellow: `rgba(255, 255, 0, ${alpha})`,
      red: `rgba(255, 0, 0, ${alpha})`,
      green: `rgba(0, 255, 0, ${alpha})`,
      blue: `rgba(0, 0, 255, ${alpha})`,
    }
    return colors[color] || colors.yellow
  }

  // Get move number display - in chess, a move is a full turn (white + black)
  // So we need to calculate the full move number from half-moves
  const halfMoves = currentPath.moves.length
  const moveNumber = Math.floor(halfMoves / 2) + 1
  const isWhiteToMove = game.turn() === 'w'

  return (
    <div className="flex flex-col gap-4">
      {/* Navigation Controls */}
      {showNavigation && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToStart}
              disabled={currentNode.fen === startingFen}
              title="Go to start position"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onGoBack}
              disabled={currentPath.moves.length === 0}
              title="Go back one move"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onGoForward}
              disabled={!currentNode.children || currentNode.children.length === 0}
              title="Go forward one move"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToLatest}
              title="Go to latest move"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Move {moveNumber}
            </Badge>
            <Badge variant={isWhiteToMove ? "default" : "secondary"}>
              {isWhiteToMove ? "White" : "Black"} to move
            </Badge>
          </div>
        </div>
      )}

      {/* Chess Board */}
      <div className="flex justify-center">
        <Chessboard
          options={{
            position: position,
            onPieceDrop: handlePieceDrop,
            onSquareClick: handleSquareClick,
            boardStyle: {
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            darkSquareStyle: { backgroundColor: '#b58863' },
            lightSquareStyle: { backgroundColor: '#f0d9b5' },
            allowDragging: isRecording && !disabled,
            allowDrawingArrows: false,
            showNotation: true,
            animationDurationInMs: 200
          }}
        />
      </div>

      {/* Variations */}
      {variations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Variations ({variations.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {variations.map((variation, index) => (
              <Button
                key={variation.fen}
                variant="outline"
                size="sm"
                onClick={() => onNavigateToNode(variation.fen)}
                className="text-xs"
              >
                {variation.move}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Move History */}
      {currentPath.moves.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Path</h4>
          <div className="flex flex-wrap gap-1">
            {currentPath.moves.map((move, index) => {
              // Calculate the correct move number for display
              const moveNumber = Math.floor(index / 2) + 1
              
              // Find the corresponding move event to get the color
              const moveEvent = events.find(event => 
                event.type === 'move' && 
                'san' in event && 
                event.san === move
              ) as any
              
              // Use color from event if available, otherwise fall back to index-based logic
              const isWhiteMove = moveEvent?.color === 'w' || (moveEvent?.color === undefined && index % 2 === 0)
              const displayText = isWhiteMove ? `${moveNumber}. ${move}` : `${moveNumber}... ${move}`
              
              // Check if this move is currently selected (at the end of current path)
              const isCurrentMove = index === currentPath.moves.length - 1
              
              return (
                <Badge 
                  key={index} 
                  variant="outline"
                  className={`text-xs cursor-pointer hover:bg-primary/10 transition-colors ${
                    isWhiteMove 
                      ? 'bg-white text-black border-gray-300 hover:bg-gray-50' 
                      : 'bg-gray-800 text-white border-gray-600 hover:bg-gray-700'
                  }`}
                  onClick={() => onNavigateToMoveIndex(index + 1)}
                >
                  {displayText}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Node Info */}
      <div className="text-xs text-muted-foreground">
        <p>Position: {currentNode.fen}</p>
        <p>FEN: {currentNode.fen}</p>
        <p>Move Number: {Math.floor((currentNode.moveNumber || 0) / 2) + 1}</p>
      </div>
    </div>
  )
}
