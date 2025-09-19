import type { 
  ChessmeldMeldFormatCMFV001, 
  PositionNode, 
  ChildReference, 
  Event,
  MoveEvent,
  EditEvent,
  SequenceEvent
} from '@/lib/cmf'
import type { GraphPath } from '@/lib/renderer-core'
import type { TextEvent } from '@/services/transcription'
import type { AnnotationMode, AnnotationColor, AnnotationState, AnnotationEvent } from '@/lib/annotations'

// New legal policy system
export type LegalPolicy = "strict" | "pieceLegal" | "none"

export type Square = string // e.g., "e4", "a1"
export type Piece = "K" | "Q" | "R" | "B" | "N" | "P" | "k" | "q" | "r" | "b" | "n" | "p"

// Use generated types from CMF package
export type CMFEvent = MoveEvent | EditEvent | SequenceEvent

export interface RecordingDefaults {
  legalPolicy: LegalPolicy // UI selection: Structured/Classroom/Free
}

export interface IntegrityWarning {
  type: "bothKingsInCheck" | "twoDarkSquareBishops" | "invalidPosition" | "custom"
  message: string
  severity: "warning" | "error"
  timestamp: number
}

export interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  startTime: number
  currentTime: number
  duration: number
}

// Legacy MoveEvent for backward compatibility
export interface LegacyMoveEvent {
  timestamp: number
  san: string
  fen: string
  color: 'w' | 'b'
  moveNumber?: number
  comment?: string
}

// Legacy Event type for backward compatibility
export interface LegacyEvent {
  t: number
  type: 'move'
  fen: string
  san: string
  color: 'w' | 'b'
  moveNumber?: number
  comment?: string
}

export interface GraphStudioSession {
  id: string
  title: string
  author: string
  startingFen: string
  nodes: Record<string, PositionNode> // Key is FEN string
  rootNodeId: string // FEN string of root position
  currentNodeId: string // FEN string of current position
  currentPath: GraphPath
  events: Event[] // All events (moves, annotations, text, etc.)
  textEvents?: TextEvent[]
  annotationEvents?: AnnotationEvent[]
  audioBlob?: Blob
  duration: number
  recordingDefaults?: RecordingDefaults
  integrityWarnings?: IntegrityWarning[]
  // WhisperX data for rich transcript export
  whisperXData?: any // Full WhisperX response data
  transcriptUrl?: string // URL to the transcript file
}

export interface MetadataForm {
  title: string
  author: string
  tags: string[]
  engineHints: boolean
}

export type StudioStep = 'setup' | 'recording' | 'review' | 'export'

// Re-export annotation types from shared package
export type { AnnotationMode, AnnotationColor, AnnotationState, AnnotationEvent } from '@chessmeld/annotations'

export interface GraphStudioContextType {
  currentStep: StudioStep
  session: GraphStudioSession | null
  recordingState: RecordingState
  metadata: MetadataForm
  currentNodeId: string
  currentPath: GraphPath
  annotationState: AnnotationState
  currentLegalPolicy: LegalPolicy
  setCurrentStep: (step: StudioStep) => void
  setSession: (session: GraphStudioSession | null) => void
  setRecordingState: (state: RecordingState) => void
  setMetadata: (metadata: MetadataForm) => void
  setLegalPolicy: (policy: LegalPolicy) => void
  
  // Graph operations (legacy)
  addMove: (move: LegacyMoveEvent) => void
  addVariation: (move: LegacyMoveEvent) => void
  updateNode: (fen: string, updates: Partial<PositionNode>) => void
  removeNode: (fen: string) => void
  
  // Event system
  addIntegrityWarning: (warning: IntegrityWarning) => void
  clearIntegrityWarnings: () => void
  
  // Navigation
  navigateToNode: (fen: string, timestamp?: number) => void
  navigateToMoveIndex: (moveIndex: number, timestamp?: number) => void
  navigateToPath: (path: GraphPath) => void
  goBack: (timestamp?: number) => void
  goForward: (timestamp?: number) => void
  goToStart: (timestamp?: number) => void
  goToLatest: (timestamp?: number) => void
  
  // Session management
  setAudioBlob: (blob: Blob) => void
  setWhisperXData: (whisperXData: any, transcriptUrl?: string) => void
  addTextEvents: (textEvents: TextEvent[]) => void
  updateTextEvents: (textEvents: TextEvent[]) => void
  addAnnotationEvent: (event: any) => void
  setAnnotationMode: (mode: AnnotationMode) => void
  setAnnotationColor: (color: AnnotationColor) => void
  exportCMF: () => ChessmeldMeldFormatCMFV001
  resetSession: () => void
  
  // Graph analysis
  getCurrentNode: () => PositionNode | null
  getVariations: () => ChildReference[]
  getAllPaths: () => GraphPath[]
}
