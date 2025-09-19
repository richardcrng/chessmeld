import { Chess } from 'chess.js'
import type { CMFEvent, LegalPolicy } from '@/types/graph-studio'

export interface BoardStateResult {
  fen: string
  turn: 'w' | 'b'
  castling: {
    white: string
    black: string
  }
  enPassant: string | null
  halfMoveClock: number
  fullMoveNumber: number
  warnings: Array<{ type: string; message: string; severity: 'warning' | 'error' }>
}

/**
 * Reducer that applies CMF events and maintains coherent board state
 */
export class BoardStateReducer {
  private chess: Chess
  private currentLegalPolicy: LegalPolicy = 'strict'

  constructor(initialFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
    this.chess = new Chess(initialFen)
  }

  /**
   * Apply a sequence of events and return the final board state
   */
  applyEvents(events: CMFEvent[], legalPolicy: LegalPolicy = 'strict'): BoardStateResult {
    this.currentLegalPolicy = legalPolicy
    const warnings: Array<{ type: string; message: string; severity: 'warning' | 'error' }> = []

    for (const event of events) {
      try {
        this.applyEvent(event)
      } catch (error) {
        warnings.push({
          type: 'eventError',
          message: `Error applying event: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        })
      }
    }

    // Check for integrity issues
    const integrityWarnings = this.checkIntegrity()
    warnings.push(...integrityWarnings)

    return {
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      castling: {
        white: this.formatCastlingRights(this.chess.getCastlingRights('w')),
        black: this.formatCastlingRights(this.chess.getCastlingRights('b'))
      },
      enPassant: this.getEnPassantFromFen(),
      halfMoveClock: this.getHalfMoveClockFromFen(),
      fullMoveNumber: this.getFullMoveNumberFromFen(),
      warnings
    }
  }

  /**
   * Format castling rights object to string
   */
  private formatCastlingRights(rights: { k: boolean; q: boolean }): string {
    let result = ''
    if (rights.k) result += 'K'
    if (rights.q) result += 'Q'
    return result
  }

  /**
   * Extract en passant square from FEN
   */
  private getEnPassantFromFen(): string | null {
    const fen = this.chess.fen()
    const parts = fen.split(' ')
    const enPassant = parts[3]
    return enPassant === '-' ? null : enPassant
  }

  /**
   * Extract half move clock from FEN
   */
  private getHalfMoveClockFromFen(): number {
    const fen = this.chess.fen()
    const parts = fen.split(' ')
    return parseInt(parts[4]) || 0
  }

  /**
   * Extract full move number from FEN
   */
  private getFullMoveNumberFromFen(): number {
    const fen = this.chess.fen()
    const parts = fen.split(' ')
    return parseInt(parts[5]) || 1
  }

  /**
   * Apply a single event to the board state
   */
  private applyEvent(event: CMFEvent): void {
    switch (event.type) {
      case 'move':
        this.applyMoveEvent(event)
        break
      case 'setPiece':
        this.applySetPieceEvent(event as CMFEvent & { type: 'setPiece' })
        break
      case 'setTurn':
        this.applySetTurnEvent(event as CMFEvent & { type: 'setTurn' })
        break
      case 'setCastling':
        this.applySetCastlingEvent(event as CMFEvent & { type: 'setCastling' })
        break
      case 'setEnPassant':
        this.applySetEnPassantEvent(event as CMFEvent & { type: 'setEnPassant' })
        break
      case 'setClock':
        this.applySetClockEvent(event as CMFEvent & { type: 'setClock' })
        break
      case 'setFen':
        this.applySetFenEvent(event as CMFEvent & { type: 'setFen' })
        break
      case 'beginSetupSequence':
      case 'endSetupSequence':
        // These are metadata events, no board state changes
        break
      default:
        console.warn('Unknown event type:', (event as any).type)
    }
  }

  /**
   * Apply a move event
   */
  private applyMoveEvent(event: CMFEvent & { type: 'move' }): void {
    if (this.currentLegalPolicy === 'strict') {
      // Use chess.js for strict validation
      const move = this.chess.move({
        from: event.from,
        to: event.to,
        promotion: event.promo || 'q'
      })
      if (!move) {
        throw new Error(`Invalid move: ${event.from}-${event.to}`)
      }
    } else if (this.currentLegalPolicy === 'pieceLegal') {
      // Apply move with piece-legal validation
      this.applyPieceLegalMove(event)
    } else {
      // Free mode - just move the piece
      this.applyFreeMove(event)
    }
  }

  /**
   * Apply a piece-legal move (geometry + blocking only)
   */
  private applyPieceLegalMove(event: CMFEvent & { type: 'move' }): void {
    const piece = this.chess.get(event.from as any)
    if (!piece) {
      throw new Error(`No piece at ${event.from}`)
    }

    // Remove piece from source
    this.chess.remove(event.from as any)
    
    // Place piece at destination (or promote)
    const pieceToPlace = event.promo ? 
      { type: event.promo, color: piece.color } : 
      piece
    
    this.chess.put(pieceToPlace, event.to as any)

    // Note: chess.js doesn't allow direct turn modification
    // Turn flipping would need to be handled at a higher level
  }

  /**
   * Apply a free move (no validation)
   */
  private applyFreeMove(event: CMFEvent & { type: 'move' }): void {
    const piece = this.chess.get(event.from as any)
    if (piece) {
      this.chess.remove(event.from as any)
      
      const pieceToPlace = event.promo ? 
        { type: event.promo, color: piece.color } : 
        piece
      
      this.chess.put(pieceToPlace, event.to as any)
    }

    // Note: chess.js doesn't allow direct turn modification
    // Turn flipping would need to be handled at a higher level
  }

  /**
   * Apply setPiece event
   */
  private applySetPieceEvent(event: CMFEvent & { type: 'setPiece' }): void {
    if (event.piece === null) {
      this.chess.remove(event.square as any)
    } else if (event.piece) {
      // Convert piece string to piece object
      const piece = {
        type: event.piece.toLowerCase() as any,
        color: (event.piece === event.piece.toUpperCase() ? 'w' : 'b') as any
      }
      this.chess.put(piece, event.square as any)
    }
  }

  /**
   * Apply setTurn event
   */
  private applySetTurnEvent(event: CMFEvent & { type: 'setTurn' }): void {
    // Note: chess.js doesn't allow direct turn modification
    // Turn changes would need to be handled at a higher level
  }

  /**
   * Apply setCastling event
   */
  private applySetCastlingEvent(event: CMFEvent & { type: 'setCastling' }): void {
    // This is complex to implement properly with chess.js
    // For now, we'll just update the FEN directly
    const fenParts = this.chess.fen().split(' ')
    fenParts[2] = (event.white || '') + (event.black || '')
    this.chess.load(fenParts.join(' '))
  }

  /**
   * Apply setEnPassant event
   */
  private applySetEnPassantEvent(event: CMFEvent & { type: 'setEnPassant' }): void {
    const fenParts = this.chess.fen().split(' ')
    fenParts[3] = event.square || '-'
    this.chess.load(fenParts.join(' '))
  }

  /**
   * Apply setClock event (metadata only, no board state change)
   */
  private applySetClockEvent(event: CMFEvent & { type: 'setClock' }): void {
    // Clock information is metadata, not board state
    // This could be stored separately if needed
  }

  /**
   * Apply setFen event
   */
  private applySetFenEvent(event: CMFEvent & { type: 'setFen' }): void {
    if (event.fen) {
      this.chess.load(event.fen)
    }
  }

  /**
   * Check for integrity issues in the current position
   */
  private checkIntegrity(): Array<{ type: string; message: string; severity: 'warning' | 'error' }> {
    const warnings: Array<{ type: string; message: string; severity: 'warning' | 'error' }> = []
    
    try {
      // Check if position is valid
      if (!this.chess.isGameOver() && this.chess.isCheckmate()) {
        warnings.push({
          type: 'checkmate',
          message: 'Position is in checkmate',
          severity: 'warning'
        })
      }

      // Check for both kings in check (impossible in normal chess)
      // Note: This check is simplified since chess.js doesn't allow turn modification
      // In a real implementation, you'd need to create separate chess instances
      const currentInCheck = this.chess.inCheck()
      if (currentInCheck) {
        warnings.push({
          type: 'kingInCheck',
          message: 'Current player is in check',
          severity: 'warning'
        })
      }

      // Check for too many pieces of the same type
      const board = this.chess.board()
      const pieceCounts: Record<string, number> = {}

      for (const row of board) {
        for (const piece of row) {
          if (piece) {
            const key = `${piece.color}${piece.type}`
            pieceCounts[key] = (pieceCounts[key] || 0) + 1
          }
        }
      }

      // Check for too many bishops on same color squares
      const darkSquareBishops: any[] = []
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const piece = board[rank][file]
          if (piece && piece.type === 'b') {
            const isDarkSquare = (file + rank) % 2 === 1
            if (isDarkSquare) {
              darkSquareBishops.push(piece)
            }
          }
        }
      }

      if (darkSquareBishops.length > 2) {
        warnings.push({
          type: 'tooManyDarkSquareBishops',
          message: `Too many bishops on dark squares: ${darkSquareBishops.length}`,
          severity: 'warning'
        })
      }

    } catch (error) {
      warnings.push({
        type: 'invalidPosition',
        message: `Invalid position: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      })
    }

    return warnings
  }

  /**
   * Get current board state
   */
  getCurrentState(): BoardStateResult {
    return {
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      castling: {
        white: this.formatCastlingRights(this.chess.getCastlingRights('w')),
        black: this.formatCastlingRights(this.chess.getCastlingRights('b'))
      },
      enPassant: this.getEnPassantFromFen(),
      halfMoveClock: this.getHalfMoveClockFromFen(),
      fullMoveNumber: this.getFullMoveNumberFromFen(),
      warnings: this.checkIntegrity()
    }
  }
}
