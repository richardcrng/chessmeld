import { Chess } from 'chess.js';
import type { ChessmeldMeldFormatCMFV001 } from '@/lib/cmf';
import type { MoveIndexEntry } from './types';
import { getMainlinePath } from './graph-traversal';

/**
 * Builds a move index by walking through the mainline timeline and applying moves.
 * This creates a fast lookup table for FEN positions at any given time.
 */
export function buildMoveIndex(meld: ChessmeldMeldFormatCMFV001): MoveIndexEntry[] {
  const chess = new Chess(meld.meta.startingFen);
  const index: MoveIndexEntry[] = [
    { t: 0, fen: chess.fen(), moveNumber: 0 }
  ];

  let halfMoveCount = 0;

  // Get the mainline path from the graph
  const mainlinePath = getMainlinePath(meld);
  
  // Walk through the mainline path and apply moves
  for (let i = 1; i < mainlinePath.nodeIds.length; i++) {
    const nodeId = mainlinePath.nodeIds[i];
    const node = meld.nodes[nodeId];
    
    if (!node) {
      throw new Error(`Node ${nodeId} not found in graph`);
    }
    
    // Find move events for this node (filtered from the flat events array)
    // Sort events by timestamp to ensure chronological order
    const nodeEvents = meld.events
      .filter((event) => 
        event.type === 'move' && 'fen' in event && event.fen === nodeId
      )
      .sort((a, b) => a.t - b.t);
    for (const event of nodeEvents) {
      if (event.type === 'move') {
        try {
          let result;
          if ('from' in event && 'to' in event) {
            // Handle consolidated MoveEvent with explicit from/to coordinates
            result = chess.move({ from: event.from, to: event.to, promotion: event.promo || 'q' });
            if (!result) {
              throw new Error(`Illegal move in node ${nodeId}: ${event.from}-${event.to}`);
            }
          } else if ('san' in event && (event as any).san) {
            // Fallback to SAN notation for legacy compatibility
            result = chess.move((event as any).san);
            if (!result) {
              throw new Error(`Illegal SAN in node ${nodeId}: ${(event as any).san}`);
            }
          } else {
            continue; // Skip events without valid move data
          }
          
          halfMoveCount++;
          // In chess, a move number represents a full turn (white + black)
          // So we calculate the full move number from half-moves
          const moveNumber = Math.floor(halfMoveCount / 2) + 1;
          
          index.push({
            t: event.t,
            fen: chess.fen(),
            moveNumber
          });
        } catch (error) {
          const moveDesc = 'from' in event ? `${event.from}-${event.to}` : (event as any).san;
          throw new Error(`Failed to apply move in node ${nodeId}: ${moveDesc}. ${error}`);
        }
      }
    }
  }

  // Sort by timestamp to ensure chronological order
  return index.sort((a, b) => a.t - b.t);
}
