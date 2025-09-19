import type { ChessmeldMeldFormatCMFV001 } from '@/lib/cmf';
import type { MoveIndexEntry, TimelineState } from './types';
import type { ActiveAnnotation } from './graph-traversal';
import { getMainlinePath } from './graph-traversal';
import { Chess } from 'chess.js';

/**
 * Computes the timeline state at a specific time by:
 * 1. Processing all events chronologically up to the target time
 * 2. Handling navigation events by resetting the current position
 * 3. Applying move events to the current position (building on navigation)
 * 4. Collecting active annotations (arrows/circles)
 * 5. Finding the most recent text event
 * 6. Checking for pause points
 */
export function computeStateAtTime(
  meld: ChessmeldMeldFormatCMFV001,
  moveIndex: MoveIndexEntry[],
  timeMs: number
): TimelineState {
  // Start with the initial position
  let currentFen = meld.meta.startingFen;
  let currentGame = new Chess(currentFen);
  
  // Process all events chronologically up to the target time
  const activeAnnotations: ActiveAnnotation[] = [];
  let lastTextEvent: string | undefined;
  let isPaused = false;
  let pausePrompt: string | undefined;

  // Sort events by timestamp to ensure chronological order
  const sortedEvents = [...meld.events].sort((a, b) => a.t - b.t);

  for (const event of sortedEvents) {
    if (event.t > timeMs) break;
    
    switch (event.type) {
      case 'navigate':
        // Navigation event: reset to the specified position
        currentFen = event.fen;
        currentGame = new Chess(currentFen);
        break;
        
      case 'move':
        // Move event: apply the move to the current position
        try {
          if ('from' in event && 'to' in event) {
            // Handle consolidated MoveEvent with explicit from/to coordinates
            const move = currentGame.move({ from: event.from, to: event.to, promotion: event.promo || 'q' });
            if (move) {
              currentFen = currentGame.fen();
            }
          } else if ('san' in event && (event as any).san) {
            // Fallback to SAN notation for legacy compatibility
            const move = currentGame.move((event as any).san);
            if (move) {
              currentFen = currentGame.fen();
            }
          }
        } catch (error) {
          // If move is invalid, keep the current position
          const moveDesc = 'from' in event ? `${event.from}-${event.to}` : (event as any).san;
          console.warn(`Invalid move ${moveDesc} at time ${event.t}:`, error);
        }
        break;
        
      case 'annotate':
        // Add arrows (handle both old array format and new ColoredArrow format)
        if (event.arrows) {
          for (const arrow of event.arrows) {
            if (Array.isArray(arrow)) {
              // Old format: [from, to]
              activeAnnotations.push({
                type: 'arrow',
                from: arrow[0],
                to: arrow[1],
                color: 'yellow'
              });
            } else {
              // New format: { from, to, color }
              activeAnnotations.push({
                type: 'arrow',
                from: arrow.from,
                to: arrow.to,
                color: arrow.color || 'yellow'
              });
            }
          }
        }
        
        // Add circles (handle both old string format and new ColoredSquare format)
        if (event.circles) {
          for (const circle of event.circles) {
            if (typeof circle === 'string') {
              // Old format: just the square string
              activeAnnotations.push({
                type: 'circle',
                square: circle,
                color: 'yellow'
              });
            } else {
              // New format: { square, color }
              activeAnnotations.push({
                type: 'circle',
                square: circle.square,
                color: circle.color || 'yellow'
              });
            }
          }
        }

        // Add highlights (new format only)
        if (event.highlights) {
          for (const highlight of event.highlights) {
            activeAnnotations.push({
              type: 'highlight',
              square: highlight.square,
              color: highlight.color || 'yellow'
            });
          }
        }
        break;

      case 'clear':
        // Clear all accumulated annotations when a clear event occurs
        activeAnnotations.length = 0;
        break;

      case 'text':
        lastTextEvent = event.text;
        break;

      case 'pausepoint':
        // Only show pause state if we're very close to the pause point time
        // This prevents the pause state from persisting indefinitely
        if (event.t <= timeMs && timeMs <= event.t + 500) {
          isPaused = true;
          pausePrompt = event.prompt;
        }
        break;
    }
  }

  return {
    fen: currentFen,
    activeAnnotations,
    activeText: lastTextEvent,
    isPaused,
    pausePrompt
  };
}
