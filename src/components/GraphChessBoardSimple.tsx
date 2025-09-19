'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, GitBranch, Home, SkipBack, SkipForward } from 'lucide-react'
import { useRecordingStore } from '@/stores/recordingStore'
import { useStudioAnnotations, annotationsToArrows, annotationsToSquareStyles, getStudioColorValue } from '@/lib/annotations'
import { LegalPolicyValidator } from '@/utils/legalPolicyValidator'
import type { 
  PositionNode, 
  ChildReference,
  Event
} from '@/lib/cmf'
import type { LegacyEvent } from '@/types/graph-studio'
import type { GraphPath } from '@/lib/renderer-core'
import type { 
  AnnotationState, 
  AnnotationEvent,
  LegalPolicy
} from '@/types/graph-studio'

interface GraphChessBoardSimpleProps {
  startingFen?: string
  currentNode: PositionNode
  currentPath: GraphPath
  variations: ChildReference[]
  events: Event[]
  legalPolicy: LegalPolicy
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
}

export function GraphChessBoardSimple({
  startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  currentNode,
  currentPath,
  variations,
  events,
  legalPolicy,
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
  onAnnotationEvent
}: GraphChessBoardSimpleProps) {
  // Use the unified recording store for timing
  const { isRecording: globalIsRecording, isInteractive: globalIsInteractive, currentTime: globalCurrentTime } = useRecordingStore()
  const [game, setGame] = useState(new Chess(currentNode.fen))
  const [position, setPosition] = useState(currentNode.fen)
  const chessboardRef = useRef<HTMLDivElement>(null)
  
  // Legal policy validator
  const validator = useMemo(() => new LegalPolicyValidator(currentNode.fen), [currentNode.fen])

  // Use studio annotations hook
  const {
    annotations,
    annotationState,
    handleSquareClick: handleAnnotationClick,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    handleMouseMove,
    handleSquareRightClick,
    handleRightClickDragStart,
    handleRightClickDragEnd,
    handleRightClickDragCancel,
  } = useStudioAnnotations(
    undefined, // Don't send clear events from the hook - let the effect handle it
    () => globalCurrentTime // Provide recording time function
  )

  // Track annotation changes and send events
  const [lastAnnotations, setLastAnnotations] = useState<typeof annotations>([])
  useEffect(() => {
    if (!globalIsInteractive || !onAnnotationEvent) return

    // Find new annotations (added since last time)
    const newAnnotations = annotations.filter(
      annotation => !lastAnnotations.find(last => last.id === annotation.id)
    )

    // Find removed annotations (were present last time but not now)
    const removedAnnotations = lastAnnotations.filter(
      lastAnnotation => !annotations.find(annotation => annotation.id === lastAnnotation.id)
    )

    // Send events for new annotations
    newAnnotations.forEach(annotation => {
      const event: any = {
        timestamp: globalCurrentTime,
        mode: annotation.type,
        color: annotation.color,
      }

      if (annotation.type === 'arrow' && annotation.from && annotation.to) {
        event.from = annotation.from
        event.to = annotation.to
      } else if (annotation.square) {
        event.square = annotation.square
      }

      onAnnotationEvent(event)
    })

    // Send clear events for removed annotations
    if (removedAnnotations.length > 0) {
      const clearEvent: any = {
        timestamp: globalCurrentTime,
        type: 'clear'
      }
      onAnnotationEvent(clearEvent)
    }

    setLastAnnotations(annotations)
  }, [annotations, globalIsInteractive, onAnnotationEvent, globalCurrentTime, lastAnnotations])

  // Update position when current node changes
  useEffect(() => {
    const newGame = new Chess(currentNode.fen)
    setGame(newGame)
    setPosition(newGame.fen())
  }, [currentNode.fen])

  // Convert annotations to react-chessboard format
  const chessboardArrows = useMemo(() => annotationsToArrows(annotations, annotationState), [annotations, annotationState])
  
  const squareStyles = useMemo(() => {
    const baseStyles = annotationsToSquareStyles(annotations)
    
    // Add visual feedback for drag start square
    if (annotationState.isDragging && annotationState.dragStartSquare) {
      return {
        ...baseStyles,
        [annotationState.dragStartSquare]: {
          ...baseStyles[annotationState.dragStartSquare],
          backgroundColor: 'rgba(255, 255, 0, 0.3)',
          border: '2px solid #fbbf24',
        }
      }
    }
    
    return baseStyles
  }, [annotations, annotationState.isDragging, annotationState.dragStartSquare])

  // Move handler with legal policy validation
  const handlePieceDrop = useCallback(({ piece, sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }) => {
    if (disabled || !globalIsInteractive || !targetSquare) return false

    // Update validator with current position
    validator.updateBoard(currentNode.fen)

    // Validate move based on legal policy
    const validationResult = validator.validateMove(sourceSquare, targetSquare, 'q', legalPolicy)

    if (!validationResult.isValid) {
      console.warn('Invalid move:', validationResult.error)
      return false
    }

    // Apply the move based on legal policy
    if (legalPolicy === 'strict') {
      // Use chess.js for strict validation
      try {
        const move = game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q'
        })

        if (move) {
          const newFen = game.fen()
          // Calculate move number based on current path length
          const currentMoveCount = currentPath.moves.length
          const moveNumber = Math.floor(currentMoveCount / 2) + 1
          
          const moveEvent = {
            san: move.san,
            fen: newFen,
            timestamp: globalCurrentTime,
            color: move.color, // Include the color from the chess.js move
            moveNumber: moveNumber, // Include the calculated move number
          }
          onMove(moveEvent)
          return true
        }
      } catch (error) {
        console.error('Chess.js validation failed:', error)
        return false
      }
    } else {
      // For pieceLegal and none modes, manually update the board state
      try {
        // Create a temporary chess instance to apply the move
        const tempGame = new Chess(currentNode.fen)
        
        // Get the piece at source square
        const piece = tempGame.get(sourceSquare as any)
        if (!piece) {
          console.warn('No piece at source square')
          return false
        }

        // Remove piece from source and place at destination
        tempGame.remove(sourceSquare as any)
        tempGame.put(piece, targetSquare as any)

        // Update local state
        const newFen = tempGame.fen()
        setGame(tempGame)
        setPosition(newFen)

        // Generate proper SAN using chess.js
        let san: string
        try {
          // Try to generate SAN by making the move in a fresh chess instance
          const sanGame = new Chess(currentNode.fen)
          
          // For non-strict modes, we need to ensure the turn is correct
          // The piece color should match the current turn
          const piece = sanGame.get(sourceSquare as any)
          if (piece && piece.color !== sanGame.turn()) {
            // If it's not the piece's turn, we need to create a new FEN with the correct turn
            const fenParts = currentNode.fen.split(' ')
            fenParts[1] = piece.color // Set the turn to the piece's color
            const correctedFen = fenParts.join(' ')
            const correctedGame = new Chess(correctedFen)
            
            const move = correctedGame.move({
              from: sourceSquare as any,
              to: targetSquare as any,
              promotion: 'q'
            })
            san = move ? move.san : `${sourceSquare}-${targetSquare}`
          } else {
            const move = sanGame.move({
              from: sourceSquare as any,
              to: targetSquare as any,
              promotion: 'q'
            })
            san = move ? move.san : `${sourceSquare}-${targetSquare}`
          }
        } catch (error) {
          console.warn('SAN generation failed, using fallback:', error)
          // Fallback to simple notation if SAN generation fails
          san = `${sourceSquare}-${targetSquare}`
        }

        // Create move event
        // Calculate move number based on current path length
        const currentMoveCount = currentPath.moves.length
        const moveNumber = Math.floor(currentMoveCount / 2) + 1
        
        const moveEvent = {
          san,
          fen: newFen,
          timestamp: globalCurrentTime,
          color: piece.color, // Include the color from the piece
          moveNumber: moveNumber, // Include the calculated move number
        }
        console.log('Generated move event:', moveEvent)
        onMove(moveEvent)
        return true
      } catch (error) {
        console.error('Failed to apply move in non-strict mode:', error)
        return false
      }
    }
    
    return false
  }, [disabled, globalIsInteractive, game, globalCurrentTime, onMove, validator, currentNode.fen, legalPolicy])

  // Handle square click for annotations
  const handleSquareClick = ({ square }: { square: string }) => {
    if (!globalIsInteractive) return
    
    // Handle annotations if in annotation mode, or if clicking any square in move mode
    if (annotationState.activeMode !== null) {
      handleAnnotationClick(square)
    } else {
      // In move mode, clicking any square removes ALL annotations
      handleAnnotationClick(square)
    }
  }

  const handleSquareMouseDown = ({ square }: { square: string }, e: React.MouseEvent) => {
    // Prevent context menu on right-click
    if (e.button === 2) {
      e.preventDefault()
    }

    // Handle right-click drag start
    if (e.button === 2) {
      handleRightClickDragStart(square)
      return
    }

    // Only handle drag start for arrow mode on left-click
    if (annotationState.activeMode === 'arrow' && e.button === 0) {
      handleDragStart(square)
    }
  }

  const handleSquareMouseUp = ({ square }: { square: string }, e: React.MouseEvent) => {
    // Handle right-click drag end
    if (e.button === 2) {
      handleRightClickDragEnd(square)
      return
    }

    // Only handle drag end for arrow mode on left-click
    if (annotationState.activeMode === 'arrow' && e.button === 0) {
      handleDragEnd(square)
    }
  }


  // Global mouse move handler for preview arrow
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (annotationState.activeMode === 'arrow' && annotationState.isDragging) {
        // Find which square the mouse is over
        const chessboardElement = chessboardRef.current
        
        if (chessboardElement) {
          const rect = chessboardElement.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          
          // Calculate which square the mouse is over
          const squareSize = rect.width / 8
          const file = Math.floor(x / squareSize)
          const rank = 7 - Math.floor(y / squareSize) // Invert rank for chess notation
          
          if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
            const square = String.fromCharCode(97 + file) + (rank + 1) // Convert to chess notation
            handleMouseMove(square)
          }
        }
      }
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove)
  }, [annotationState.activeMode, annotationState.isDragging, handleMouseMove])

  // Global mouse up event to handle drag cancellation
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (annotationState.isDragging) {
        handleDragCancel()
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [annotationState.isDragging, handleDragCancel])

  // Right-click context menu handler
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault() // Prevent default context menu
      
      if (!globalIsRecording) return

      // Find the square that was right-clicked
      const chessboardElement = chessboardRef.current
      if (chessboardElement) {
        const rect = chessboardElement.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        
        // Calculate which square the mouse is over
        const squareSize = rect.width / 8
        const file = Math.floor(x / squareSize)
        const rank = 7 - Math.floor(y / squareSize) // Invert rank for chess notation
        
        if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
          const square = String.fromCharCode(97 + file) + (rank + 1) // Convert to chess notation
          handleSquareRightClick(square)
        }
      }
    }

    const chessboardElement = chessboardRef.current
    if (chessboardElement) {
      chessboardElement.addEventListener('contextmenu', handleContextMenu)
    }

    return () => {
      if (chessboardElement) {
        chessboardElement.removeEventListener('contextmenu', handleContextMenu)
      }
    }
  }, [globalIsInteractive, handleSquareRightClick])

  // Get move number display - in chess, a move is a full turn (white + black)
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
            {globalIsRecording && (
              <Badge variant="destructive">
                Recording: {Math.floor(globalCurrentTime / 1000)}s
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Annotation Mode Indicator */}
      <div className="flex justify-center mb-2">
        <div className="inline-flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1">
          <span className="text-sm font-medium text-gray-700">Mode:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            annotationState.activeMode === null ? 'bg-blue-100 text-blue-800' :
            annotationState.activeMode === 'circle' ? 'bg-yellow-100 text-yellow-800' :
            annotationState.activeMode === 'highlight' ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'
          }`}>
            {annotationState.activeMode === null ? 'MOVE' : annotationState.activeMode.toUpperCase()}
          </span>
          {annotationState.activeMode && (
            <span className="text-sm font-medium text-gray-700">Color:</span>
          )}
          {annotationState.activeMode && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              annotationState.activeMode === 'arrow' ? 'bg-green-100 text-green-800' :
              annotationState.activeMode === 'circle' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {annotationState.activeMode === 'arrow' ? 'GREEN' :
               annotationState.activeMode === 'circle' ? 'YELLOW' : 'BLUE'}
            </span>
          )}
        </div>
      </div>

      {/* Chess Board */}
      <div ref={chessboardRef} className="flex justify-center">
        <Chessboard
          options={{
            position: position,
            onPieceDrop: handlePieceDrop,
            onSquareClick: handleSquareClick,
            onSquareMouseDown: handleSquareMouseDown,
            onSquareMouseUp: handleSquareMouseUp,
            boardStyle: {
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            darkSquareStyle: { backgroundColor: '#b58863' },
            lightSquareStyle: { backgroundColor: '#f0d9b5' },
            allowDragging: globalIsRecording && !disabled && annotationState.activeMode === null,
            allowDrawingArrows: false,
            showNotation: true,
            animationDurationInMs: 200,
            squareStyles,
            arrows: chessboardArrows,
          }}
        />
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="text-center text-xs text-gray-500 mt-2">
        <div>Hold H (highlight), C (circle), A (arrow) to activate annotation modes</div>
        <div>Right-click square to highlight • Right-click and drag to draw arrow</div>
        <div>Press X to clear all annotations, or click any square in move mode to clear all</div>
        <div className="mt-1 text-yellow-600 font-medium">
          Arrow mode: Click or drag to create arrows (piece dragging disabled)
        </div>
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
        {globalIsRecording && (
          <p>Recording Time: {globalCurrentTime}ms</p>
        )}
      </div>
    </div>
  )
}
