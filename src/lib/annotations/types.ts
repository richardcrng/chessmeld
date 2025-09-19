export type AnnotationMode = 'move' | 'circle' | 'highlight' | 'arrow'
export type AnnotationColor = 'green' | 'red' | 'yellow' | 'blue'

// Simplified color mapping for studio mode
export type StudioAnnotationColor = 'green' | 'yellow' | 'blue'

export interface AnnotationState {
  mode: AnnotationMode
  color: AnnotationColor
  isDrawingArrow: boolean
  arrowStartSquare: string | null
  isDragging: boolean
  dragStartSquare: string | null
}

// Studio-specific annotation state with hold-to-activate behavior
export interface StudioAnnotationState {
  activeMode: AnnotationMode | null // null means move mode
  isDrawingArrow: boolean
  arrowStartSquare: string | null
  isDragging: boolean
  dragStartSquare: string | null
  heldKeys: Set<string> // Track which keys are currently held
  previewArrow: {
    from: string
    to: string
  } | null // Preview arrow while dragging
}

export interface Annotation {
  id: string
  type: 'circle' | 'highlight' | 'arrow'
  square?: string
  from?: string
  to?: string
  color: AnnotationColor
  timestamp?: number
}

export interface AnnotationEvent {
  timestamp: number
  type: 'annotate' | 'clear'
  arrows?: Array<{ from: string; to: string; color?: AnnotationColor }>
  circles?: Array<{ square: string; color?: AnnotationColor }>
  highlights?: Array<{ square: string; color?: AnnotationColor }>
  note?: string
}

export interface ClearAnnotationsEvent {
  timestamp: number
  type: 'clear'
  comment?: string
}

// React-chessboard specific types
export interface ChessboardArrow {
  startSquare: string
  endSquare: string
  color: string
}

export interface ChessboardSquareStyles {
  [square: string]: {
    [key: string]: string | number
  }
}
