'use client'

import { useState, useEffect, useRef } from 'react'
import { Chess, Color, PieceSymbol, Square } from 'chess.js'
import { Chessboard, ChessboardProvider, SparePiece, defaultPieces } from 'react-chessboard'

interface BoardSetupProps {
  initialFen?: string
  onFenChange: (fen: string) => void
  onCancel?: () => void
}

export function BoardSetup({ initialFen, onFenChange, onCancel }: BoardSetupProps) {
  const [chessPosition, setChessPosition] = useState('8/8/8/8/8/8/8/8 w - - 0 1')
  const [squareWidth, setSquareWidth] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activePlayer, setActivePlayer] = useState<'w' | 'b'>('w')
  
  // Create a chess game using a ref to always have access to the latest game state
  const chessGameRef = useRef(new Chess('8/8/8/8/8/8/8/8 w - - 0 1', { skipValidation: true }))
  const chessGame = chessGameRef.current

  // Helper function to generate FEN with correct active player
  const generateFenWithActivePlayer = (fen: string, player: 'w' | 'b'): string => {
    const parts = fen.split(' ')
    if (parts.length >= 6) {
      parts[1] = player // Update the active player field
      return parts.join(' ')
    }
    return fen
  }

  // Initialize with provided FEN or empty board
  useEffect(() => {
    if (initialFen) {
      try {
        chessGame.load(initialFen)
        setChessPosition(chessGame.fen())
        // Extract active player from FEN (second field)
        const fenParts = initialFen.split(' ')
        if (fenParts.length >= 2) {
          setActivePlayer(fenParts[1] as 'w' | 'b')
        }
      } catch (err) {
        console.error('Invalid initial FEN:', err)
        setError('Invalid initial position')
      }
    }
  }, [initialFen])

  // Get the width of a square to use for the spare piece sizes
  useEffect(() => {
    const square = document
      .querySelector(`[data-column="a"][data-row="1"]`)
      ?.getBoundingClientRect()
    setSquareWidth(square?.width ?? null)
  }, [chessPosition])

  // Handle piece drop
  function onPieceDrop({ sourceSquare, targetSquare, piece }: { piece: any; sourceSquare: string; targetSquare: string | null }) {
    setError(null)
    
    const color = piece.pieceType[0]
    const type = piece.pieceType[1].toLowerCase()

    // If the piece is dropped off the board, remove it
    if (!targetSquare) {
      chessGame.remove(sourceSquare as Square)
      const newFen = generateFenWithActivePlayer(chessGame.fen(), activePlayer)
      setChessPosition(newFen)
      onFenChange(newFen)
      return true
    }

    // If the piece is not a spare piece, remove it from its original square
    if (!piece.isSparePiece) {
      chessGame.remove(sourceSquare as Square)
    }

    // Try to place the piece on the board
    const success = chessGame.put(
      { color: color as Color, type: type as PieceSymbol },
      targetSquare as Square,
    )

    if (!success) {
      setError(`Cannot place another ${color === 'w' ? 'white' : 'black'} ${type.toUpperCase()}`)
      return false
    }

    // Update the game state and notify parent with correct active player
    const newFen = generateFenWithActivePlayer(chessGame.fen(), activePlayer)
    setChessPosition(newFen)
    onFenChange(newFen)
    return true
  }

  // Get the piece types for the black and white spare pieces
  const blackPieceTypes: string[] = []
  const whitePieceTypes: string[] = []
  for (const pieceType of Object.keys(defaultPieces)) {
    if (pieceType[0] === 'b') {
      blackPieceTypes.push(pieceType as string)
    } else {
      whitePieceTypes.push(pieceType as string)
    }
  }

  // Set the chessboard options
  const chessboardOptions = {
    position: chessPosition,
    onPieceDrop,
    id: 'board-setup',
    boardOrientation: 'white' as const,
  }

  const handleClearBoard = () => {
    chessGame.clear()
    const newFen = generateFenWithActivePlayer(chessGame.fen(), activePlayer)
    setChessPosition(newFen)
    onFenChange(newFen)
    setError(null)
  }

  const handleLoadStartingPosition = () => {
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    chessGame.load(startingFen)
    const newFen = generateFenWithActivePlayer(chessGame.fen(), activePlayer)
    setChessPosition(newFen)
    onFenChange(newFen)
    setError(null)
  }

  const handleSubmit = () => {
    // Validate that we have at least one piece on the board
    if (chessPosition === '8/8/8/8/8/8/8/8 w - - 0 1') {
      setError('Please place at least one piece on the board')
      return
    }
    
    // Validate the position
    try {
      new Chess(chessPosition)
      setError(null)
      const finalFen = generateFenWithActivePlayer(chessPosition, activePlayer)
      onFenChange(finalFen)
    } catch (err) {
      setError('Invalid position')
    }
  }

  // Handle active player change
  const handleActivePlayerChange = (player: 'w' | 'b') => {
    setActivePlayer(player)
    const newFen = generateFenWithActivePlayer(chessPosition, player)
    setChessPosition(newFen)
    onFenChange(newFen)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Set Up Initial Position</h3>
        <p className="text-sm text-muted-foreground">
          Drag pieces from the spare pieces below onto the board, or drag pieces off the board to remove them.
        </p>
      </div>

      {/* Player Selection */}
      <div className="flex justify-center">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            Player to move
          </label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="activePlayer"
                value="w"
                checked={activePlayer === 'w'}
                onChange={() => handleActivePlayerChange('w')}
                className="mr-2"
              />
              <span className="text-sm font-medium">White</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="activePlayer"
                value="b"
                checked={activePlayer === 'b'}
                onChange={() => handleActivePlayerChange('b')}
                className="mr-2"
              />
              <span className="text-sm font-medium">Black</span>
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-center">
        <ChessboardProvider options={chessboardOptions}>
          <div className="space-y-4">
            {/* Black pieces */}
            {squareWidth && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  width: 'fit-content',
                  margin: '0 auto',
                  gap: '4px'
                }}
              >
                {blackPieceTypes.map((pieceType) => (
                  <div
                    key={pieceType}
                    style={{
                      width: `${squareWidth}px`,
                      height: `${squareWidth}px`,
                    }}
                    className="border border-gray-200 rounded hover:border-gray-300 transition-colors"
                  >
                    <SparePiece pieceType={pieceType} />
                  </div>
                ))}
              </div>
            )}

            {/* Chessboard */}
            <div className="flex justify-center">
              <div style={{ width: '400px', height: '400px' }}>
                <Chessboard />
              </div>
            </div>

            {/* White pieces */}
            {squareWidth && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  width: 'fit-content',
                  margin: '0 auto',
                  gap: '4px'
                }}
              >
                {whitePieceTypes.map((pieceType) => (
                  <div
                    key={pieceType}
                    style={{
                      width: `${squareWidth}px`,
                      height: `${squareWidth}px`,
                    }}
                    className="border border-gray-200 rounded hover:border-gray-300 transition-colors"
                  >
                    <SparePiece pieceType={pieceType} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </ChessboardProvider>
      </div>

      {/* Quick actions */}
      <div className="flex justify-center gap-3">
        <button
          onClick={handleClearBoard}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Clear Board
        </button>
        <button
          onClick={handleLoadStartingPosition}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Starting Position
        </button>
      </div>

      {/* Current FEN display */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Current Position (FEN)
        </label>
        <div className="font-mono text-sm text-gray-600 break-all">
          {chessPosition}
        </div>
      </div>
    </div>
  )
}
