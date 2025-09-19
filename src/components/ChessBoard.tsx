'use client'

import { useState, useCallback, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import type { Square, Piece, Move } from 'chess.js'

interface ChessBoardProps {
  startingFen?: string
  onMove?: (move: LegacyMoveEvent) => void
  isRecording?: boolean
  currentTime?: number
  disabled?: boolean
}

interface LegacyMoveEvent {
  timestamp: number
  san: string
  fen: string
  comment?: string
}

export function ChessBoard({ 
  startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  onMove,
  isRecording = false,
  currentTime = 0,
  disabled = false
}: ChessBoardProps) {
  const [game, setGame] = useState(new Chess(startingFen))
  const [position, setPosition] = useState(game.fen())

  // Reset game when starting FEN changes
  useEffect(() => {
    const newGame = new Chess(startingFen)
    setGame(newGame)
    setPosition(newGame.fen())
  }, [startingFen])

  const onPieceDrop = useCallback(({ piece, sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }) => {
    if (disabled || !targetSquare) return false

    try {
      const move = game.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: piece.pieceType.toLowerCase() === 'p' && 
          (targetSquare.charAt(1) === '8' || targetSquare.charAt(1) === '1') ? 'q' : undefined,
      })

      if (move === null) return false

      const newPosition = game.fen()
      setPosition(newPosition)

      // Record the move with timestamp if recording
      if (onMove && isRecording) {
        onMove({
          timestamp: currentTime,
          san: move.san,
          fen: newPosition,
        })
      }

      return true
    } catch (error) {
      console.error('Invalid move:', error)
      return false
    }
  }, [game, disabled, onMove, isRecording, currentTime])

  const onSquareClick = useCallback(({ square }: { square: string }) => {
    // Optional: Add square click handling for annotations
    console.log('Square clicked:', square)
  }, [])

  return (
    <div className="w-full max-w-md mx-auto">
      <Chessboard
        options={{
          position: position,
          onSquareClick: onSquareClick,
          onPieceDrop: onPieceDrop,
          boardStyle: {
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
          darkSquareStyle: { backgroundColor: '#b58863' },
          lightSquareStyle: { backgroundColor: '#f0d9b5' },
          allowDragging: !disabled,
          allowDrawingArrows: false,
          showNotation: true,
          animationDurationInMs: 200,
        }}
      />
    </div>
  )
}
