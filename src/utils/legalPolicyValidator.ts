import { Chess } from 'chess.js'
import type { LegalPolicy, Square, Piece } from '@/types/graph-studio'

export interface ValidationResult {
  isValid: boolean
  san?: string
  error?: string
  warning?: string
}

export interface BoardState {
  fen: string
  turn: 'w' | 'b'
  castling: {
    white: string
    black: string
  }
  enPassant: string | null
}

/**
 * Three-layer validation system for different legal policies
 */
export class LegalPolicyValidator {
  private chess: Chess

  constructor(initialFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
    this.chess = new Chess(initialFen)
  }

  /**
   * Update the internal board state
   */
  updateBoard(fen: string): void {
    try {
      this.chess.load(fen)
    } catch (error) {
      console.warn('Invalid FEN provided to validator:', fen)
    }
  }

  /**
   * Validate a move based on the legal policy
   */
  validateMove(
    from: Square, 
    to: Square, 
    promo: 'q' | 'r' | 'b' | 'n' | undefined,
    legalPolicy: LegalPolicy
  ): ValidationResult {
    switch (legalPolicy) {
      case 'strict':
        return this.validateStrict(from, to, promo)
      case 'pieceLegal':
        return this.validatePieceLegal(from, to, promo)
      case 'none':
        return this.validateNone(from, to, promo)
      default:
        return { isValid: false, error: `Unknown legal policy: ${legalPolicy}` }
    }
  }

  /**
   * Strict validation: Full chess legality via chess.js
   */
  private validateStrict(from: Square, to: Square, promo?: 'q' | 'r' | 'b' | 'n'): ValidationResult {
    try {
      const move = this.chess.move({
        from,
        to,
        promotion: promo || 'q'
      })

      if (move) {
        return {
          isValid: true,
          san: move.san
        }
      } else {
        return {
          isValid: false,
          error: 'Invalid move according to chess rules'
        }
      }
    } catch (error) {
      return {
        isValid: false,
        error: `Chess validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Piece-legal validation: Enforce piece geometry + blocking only
   */
  private validatePieceLegal(from: Square, to: Square, promo?: 'q' | 'r' | 'b' | 'n'): ValidationResult {
    // Check if squares are valid
    if (!this.isValidSquare(from) || !this.isValidSquare(to)) {
      return { isValid: false, error: 'Invalid square coordinates' }
    }

    if (from === to) {
      return { isValid: false, error: 'Cannot move to the same square' }
    }

    // Get piece at source square
    const piece = this.chess.get(from as any)
    if (!piece) {
      return { isValid: false, error: 'No piece at source square' }
    }

    // Check piece movement geometry
    const isValidGeometry = this.checkPieceGeometry(piece, from, to)
    if (!isValidGeometry) {
      return { isValid: false, error: `Invalid ${piece.type} movement from ${from} to ${to}` }
    }

    // Check for blocking pieces (except knights)
    if (piece.type !== 'n' && !this.isPathClear(from, to)) {
      return { isValid: false, error: 'Path is blocked by another piece' }
    }

    // Check if destination has own piece
    const destPiece = this.chess.get(to as any)
    if (destPiece && destPiece.color === piece.color) {
      return { isValid: false, error: 'Cannot capture own piece' }
    }

    // Try to generate SAN if possible (for display purposes)
    let san: string | undefined
    try {
      const move = this.chess.move({ from, to, promotion: promo || 'q' })
      if (move) {
        san = move.san
        this.chess.undo() // Undo the move since we're just validating
      }
    } catch {
      // If we can't generate SAN, that's okay in pieceLegal mode
    }

    return {
      isValid: true,
      san,
      warning: 'Move is piece-legal but may not follow all chess rules'
    }
  }

  /**
   * No validation: Bypass all checks
   */
  private validateNone(from: Square, to: Square, promo?: 'q' | 'r' | 'b' | 'n'): ValidationResult {
    // Basic sanity checks only
    if (!this.isValidSquare(from) || !this.isValidSquare(to)) {
      return { isValid: false, error: 'Invalid square coordinates' }
    }

    return {
      isValid: true,
      warning: 'Free mode: No chess rules enforced'
    }
  }

  /**
   * Check if a square is valid
   */
  private isValidSquare(square: string): boolean {
    return /^[a-h][1-8]$/.test(square)
  }

  /**
   * Check piece movement geometry
   */
  private checkPieceGeometry(piece: any, from: Square, to: Square): boolean {
    const fromFile = from.charCodeAt(0) - 97 // a=0, b=1, etc.
    const fromRank = parseInt(from[1]) - 1 // 1=0, 2=1, etc.
    const toFile = to.charCodeAt(0) - 97
    const toRank = parseInt(to[1]) - 1

    const fileDiff = Math.abs(toFile - fromFile)
    const rankDiff = Math.abs(toRank - fromRank)

    switch (piece.type) {
      case 'p':
        // Pawn movement (simplified - includes double pawn move from starting position)
        if (piece.color === 'w') {
          return (fileDiff === 0 && toRank === fromRank + 1) || // Single move forward
                 (fileDiff === 0 && toRank === fromRank + 2 && fromRank === 1) || // Double move from starting position
                 (fileDiff === 1 && toRank === fromRank + 1) // Capture
        } else {
          return (fileDiff === 0 && toRank === fromRank - 1) || // Single move forward
                 (fileDiff === 0 && toRank === fromRank - 2 && fromRank === 6) || // Double move from starting position
                 (fileDiff === 1 && toRank === fromRank - 1) // Capture
        }

      case 'r':
        return (fileDiff === 0 && rankDiff > 0) || (fileDiff > 0 && rankDiff === 0)

      case 'n':
        return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2)

      case 'b':
        return fileDiff === rankDiff && fileDiff > 0

      case 'q':
        return (fileDiff === 0 && rankDiff > 0) || 
               (fileDiff > 0 && rankDiff === 0) || 
               (fileDiff === rankDiff && fileDiff > 0)

      case 'k':
        return fileDiff <= 1 && rankDiff <= 1 && (fileDiff > 0 || rankDiff > 0)

      default:
        return false
    }
  }

  /**
   * Check if path is clear between two squares
   */
  private isPathClear(from: Square, to: Square): boolean {
    const fromFile = from.charCodeAt(0) - 97
    const fromRank = parseInt(from[1]) - 1
    const toFile = to.charCodeAt(0) - 97
    const toRank = parseInt(to[1]) - 1

    const fileStep = toFile === fromFile ? 0 : (toFile - fromFile) / Math.abs(toFile - fromFile)
    const rankStep = toRank === fromRank ? 0 : (toRank - fromRank) / Math.abs(toRank - fromRank)

    let currentFile = fromFile + fileStep
    let currentRank = fromRank + rankStep

    while (currentFile !== toFile || currentRank !== toRank) {
      const square = String.fromCharCode(97 + currentFile) + (currentRank + 1)
      if (this.chess.get(square as any)) {
        return false
      }
      currentFile += fileStep
      currentRank += rankStep
    }

    return true
  }

  /**
   * Get current board state
   */
  getBoardState(): BoardState {
    return {
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      castling: {
        white: this.formatCastlingRights(this.chess.getCastlingRights('w')),
        black: this.formatCastlingRights(this.chess.getCastlingRights('b'))
      },
      enPassant: this.getEnPassantFromFen()
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
   * Check for integrity issues in the current position
   */
  checkIntegrity(): Array<{ type: string; message: string; severity: 'warning' | 'error' }> {
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
}
