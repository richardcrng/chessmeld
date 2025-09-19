import React, { useEffect, useState } from 'react';
import { Arrow, Chessboard, ChessboardProvider, SparePiece, defaultPieces } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { ActiveAnnotation } from '@/lib/renderer';
import { annotationsToArrows, annotationsToSquareStyles } from '@/lib/annotations';

type InteractionMode = 'learn' | 'explore' | 'sandbox';

interface BoardProps {
  fen: string;
  onMove?: (from: string, to: string, newFen?: string) => void;
  interactive?: boolean;
  mode?: InteractionMode;
  annotations?: ActiveAnnotation[];
}

export function Board({ fen, onMove, interactive = false, mode = 'learn', annotations = [] }: BoardProps) {
  const [game, setGame] = React.useState(() => new Chess(fen));
  const [selectedSquare, setSelectedSquare] = React.useState<string | null>(null);
  const [legalMoves, setLegalMoves] = React.useState<string[]>([]);
  const [draggedSquare, setDraggedSquare] = React.useState<string | null>(null);
  const [dragLegalMoves, setDragLegalMoves] = React.useState<string[]>([]);
  const [squareWidth, setSquareWidth] = useState<number | null>(null);
  const dragTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Update game state when FEN changes
  React.useEffect(() => {
    try {
      game.load(fen);
      setGame(new Chess(fen));
      // Clear selection and drag state when position changes
      setSelectedSquare(null);
      setLegalMoves([]);
      setDraggedSquare(null);
      setDragLegalMoves([]);
    } catch (error) {
      console.error('Invalid FEN:', fen, error);
    }
  }, [fen]);

  // Clear interaction states when mode changes to non-interactive
  React.useEffect(() => {
    if (!interactive) {
      setSelectedSquare(null);
      setLegalMoves([]);
      setDraggedSquare(null);
      setDragLegalMoves([]);
    }
  }, [interactive]);

  // Get the width of a square to use for the spare piece sizes (only in sandbox mode)
  useEffect(() => {
    if (mode === 'sandbox') {
      const square = document
        .querySelector(`[data-column="a"][data-row="1"]`)
        ?.getBoundingClientRect();
      setSquareWidth(square?.width ?? null);
    }
  }, [mode, fen]);

  // Get the piece types for the black and white spare pieces
  const blackPieceTypes: string[] = [];
  const whitePieceTypes: string[] = [];
  for (const pieceType of Object.keys(defaultPieces)) {
    if (pieceType[0] === 'b') {
      blackPieceTypes.push(pieceType as string);
    } else {
      whitePieceTypes.push(pieceType as string);
    }
  }

  // Handle square clicks for piece selection (Explore mode only)
  const handleSquareClick = ({ square }: { square: string }) => {
    if (!interactive || mode !== 'explore') return;
    
    const piece = game.get(square as any);
    
    if (selectedSquare === square) {
      // Deselect if clicking the same square
      setSelectedSquare(null);
      setLegalMoves([]);
    } else if (piece && piece.color === game.turn()) {
      // Select piece if it's the current player's turn
      setSelectedSquare(square);
      const moves = game.moves({ square: square as any, verbose: true });
      setLegalMoves(moves.map((move: any) => move.to));
    } else if (selectedSquare && legalMoves.includes(square)) {
      // Make move if clicking a legal destination
      handleInteractiveMove(selectedSquare, square);
      setSelectedSquare(null);
      setLegalMoves([]);
    } else {
      // Deselect if clicking empty square or opponent piece
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Handle piece drag start
  const handlePieceDragStart = ({ piece, square }: { piece: any; square: string | null }) => {
    if (!interactive || mode !== 'explore' || !square) return;
    
    const pieceObj = game.get(square as any);
    if (pieceObj && pieceObj.color === game.turn()) {
      setDraggedSquare(square);
      const moves = game.moves({ square: square as any, verbose: true });
      setDragLegalMoves(moves.map((move: any) => move.to));
      
      // Clear any existing timeout
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      
      // Set a timeout to clear drag state in case drag is cancelled
      dragTimeoutRef.current = setTimeout(() => {
        clearDragState();
      }, 2000);
    }
  };

  // Handle square mouse down (for drag start detection)
  const handleSquareMouseDown = ({ piece, square }: { piece: any; square: string }, e: React.MouseEvent) => {
    if (!interactive || mode !== 'explore' || !square) return;
    
    const pieceObj = game.get(square as any);
    if (pieceObj && pieceObj.color === game.turn()) {
      // Set up drag highlighting immediately on mouse down
      setDraggedSquare(square);
      const moves = game.moves({ square: square as any, verbose: true });
      setDragLegalMoves(moves.map((move: any) => move.to));
      
      // Clear any existing timeout
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      
      // Set a timeout to clear drag state in case drag is cancelled
      dragTimeoutRef.current = setTimeout(() => {
        clearDragState();
      }, 2000);
    }
  };

  // Clear drag state when piece is dropped or drag is cancelled
  const clearDragState = () => {
    setDraggedSquare(null);
    setDragLegalMoves([]);
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
  };

  // Handle piece drops for interactive mode
  const handlePieceDrop = ({ piece, sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }) => {
    if (!interactive) {
      clearDragState();
      return false;
    }
    
    // Clear drag state
    clearDragState();
    
    try {
      if (mode === 'sandbox') {
        // Sandbox mode: allow any move (even illegal ones)
        
        // If the piece is dropped off the board (targetSquare is null), remove it
        if (!targetSquare) {
          if (sourceSquare && !piece.isSparePiece) {
            game.remove(sourceSquare as any);
            const newFen = game.fen();
            setGame(new Chess(newFen));
            onMove?.(sourceSquare, '', newFen);
          }
          return true;
        }
        
        // If the piece is not a spare piece, remove it from its original square
        if (!piece.isSparePiece && sourceSquare) {
          game.remove(sourceSquare as any);
        }
        
        // Try to place the piece on the board
        const pieceColor = piece.pieceType[0] as 'w' | 'b';
        const pieceType = piece.pieceType[1].toLowerCase() as 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
        
        const success = game.put(
          { color: pieceColor, type: pieceType },
          targetSquare as any
        );
        
        if (success) {
          const newFen = game.fen();
          setGame(new Chess(newFen));
          onMove?.(sourceSquare || '', targetSquare, newFen);
          setSelectedSquare(null);
          setLegalMoves([]);
          return true;
        } else {
          console.warn('Failed to place piece:', piece.pieceType, 'on', targetSquare);
        }
      } else if (mode === 'explore' && onMove && targetSquare) {
        // Explorer mode: only allow legal moves
        const move = game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q' // Always promote to queen for simplicity
        });

        // If move is valid, update game state and call onMove
        if (move) {
          const newFen = game.fen();
          setGame(new Chess(newFen));
          onMove(sourceSquare, targetSquare, newFen);
          // Clear selection after move
          setSelectedSquare(null);
          setLegalMoves([]);
          return true;
        }
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
    
    return false; // Move was invalid
  };

  // Handle interactive moves (for click-to-move)
  const handleInteractiveMove = (from: string, to: string) => {
    if (!onMove) return;
    
    try {
      if (mode === 'sandbox') {
        // Sandbox mode: allow any move (even illegal ones)
        const piece = game.get(from as any);
        if (piece) {
          game.remove(from as any);
          game.put(piece, to as any);
          setGame(new Chess(game.fen()));
          onMove(from, to);
        }
      } else if (mode === 'explore') {
        // Explorer mode: only allow legal moves
        const move = game.move({
          from,
          to,
          promotion: 'q' // Always promote to queen for simplicity
        });
        
        if (move) {
          setGame(new Chess(game.fen()));
          onMove(from, to);
        }
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
  };

  // Convert ActiveAnnotation to our Annotation format
  const convertedAnnotations = React.useMemo(() => {
    return annotations.map(annotation => ({
      id: `annotation_${Math.random().toString(36).substr(2, 9)}`,
      type: annotation.type as 'circle' | 'highlight' | 'arrow',
      square: annotation.square,
      from: annotation.from,
      to: annotation.to,
      color: (annotation.color || 'yellow') as 'green' | 'red' | 'yellow',
      timestamp: Date.now()
    }));
  }, [annotations]);

  // Convert annotations to react-chessboard arrow format using shared utilities
  const chessboardArrows: Arrow[] = React.useMemo(() => {
    return annotationsToArrows(convertedAnnotations);
  }, [convertedAnnotations]);

  // Create custom square styles using shared utilities
  const annotationSquareStyles = React.useMemo(() => {
    return annotationsToSquareStyles(convertedAnnotations);
  }, [convertedAnnotations]);

  // Create custom square styles for highlighting and circle annotations
  const squareStyles = React.useMemo(() => {
    const styles: { [key: string]: React.CSSProperties } = { ...annotationSquareStyles };
    
    // Highlight selected square (click selection)
    if (selectedSquare) {
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
        borderRadius: '50%'
      };
    }
    
    // Highlight dragged square
    if (draggedSquare) {
      styles[draggedSquare] = {
        ...styles[draggedSquare],
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
        borderRadius: '50%'
      };
    }
    
    // Highlight legal move squares (click selection)
    legalMoves.forEach(square => {
      styles[square] = {
        ...styles[square],
        background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%'
      };
    });
    
    // Highlight legal move squares (drag selection)
    dragLegalMoves.forEach(square => {
      styles[square] = {
        ...styles[square],
        background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%'
      };
    });
    
    return styles;
  }, [annotationSquareStyles, selectedSquare, legalMoves, draggedSquare, dragLegalMoves]);

  // Set the chessboard options
  const chessboardOptions = {
    position: fen,
    onPieceDrop: interactive ? handlePieceDrop : undefined,
    onSquareClick: interactive && mode === 'explore' ? handleSquareClick : undefined,
    onPieceDrag: interactive && mode === 'explore' ? handlePieceDragStart : undefined,
    onSquareMouseDown: interactive && mode === 'explore' ? handleSquareMouseDown : undefined,
    allowDragging: interactive,
    squareStyles,
    arrows: chessboardArrows,
    boardStyle: {
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
      width: '100%',
      height: '100%'
    },
    darkSquareStyle: {
      backgroundColor: '#b58863' // Dark brown squares
    },
    lightSquareStyle: {
      backgroundColor: '#f0d9b5' // Light beige squares
    }
  };

  if (mode === 'sandbox') {
    return (
      <div className="board-sandbox">
        <ChessboardProvider options={chessboardOptions}>
          {squareWidth ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                width: 'fit-content',
                margin: '0 auto',
                marginBottom: '10px',
                gap: '2px'
              }}
            >
              {blackPieceTypes.map((pieceType) => (
                <div
                  key={pieceType}
                  style={{
                    width: `${squareWidth}px`,
                    height: `${squareWidth}px`,
                  }}
                >
                  <SparePiece pieceType={pieceType} />
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ width: '100%', height: 'auto' }}>
            <Chessboard />
          </div>

          {squareWidth ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                width: 'fit-content',
                margin: '0 auto',
                marginTop: '10px',
                gap: '2px'
              }}
            >
              {whitePieceTypes.map((pieceType) => (
                <div
                  key={pieceType}
                  style={{
                    width: `${squareWidth}px`,
                    height: `${squareWidth}px`,
                  }}
                >
                  <SparePiece pieceType={pieceType} />
                </div>
              ))}
            </div>
          ) : null}
        </ChessboardProvider>
      </div>
    );
  }

  return (
    <div className="board">
      <Chessboard options={chessboardOptions} />
    </div>
  );
}
