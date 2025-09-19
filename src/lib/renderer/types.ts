// Types that align with the actual CMF v0.0.1 schema
import type { ChessmeldMeldFormatCMFV001, Event } from '@/lib/cmf';

// Re-export the main CMF type for convenience
export type MeldV0_0_1 = ChessmeldMeldFormatCMFV001;

// Timeline state at a specific time
export interface TimelineState {
  fen: string;
  activeAnnotations: ActiveAnnotation[];
  activeText?: string;
  isPaused?: boolean;
  pausePrompt?: string;
}

// Active annotation (simplified from CMF AnnotateEvent)
interface ActiveAnnotation {
  type: 'arrow' | 'circle' | 'highlight';
  from?: string; // for arrows
  to?: string;   // for arrows  
  square?: string; // for circles and highlights
  color?: string;
}

// Move index entry for fast FEN lookup
export interface MoveIndexEntry {
  t: number;
  fen: string;
  moveNumber?: number;
}

// Audio clock state
export interface AudioClock {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  isPaused: boolean;
}

// Player state
export interface PlayerState {
  meld: MeldV0_0_1;
  audioClock: AudioClock;
  timelineState: TimelineState;
  isSandboxMode: boolean;
  sandboxFen?: string; // Current FEN in sandbox mode
}
