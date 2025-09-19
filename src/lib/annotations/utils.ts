import type { Annotation, ChessboardArrow, ChessboardSquareStyles, AnnotationColor, AnnotationMode, StudioAnnotationColor, StudioAnnotationState } from './types'

/**
 * Convert color name to CSS color value
 */
export function getColorValue(color: AnnotationColor): string {
  switch (color) {
    case 'green':
      return '#22c55e'
    case 'red':
      return '#ef4444'
    case 'yellow':
      return '#eab308'
    case 'blue' as AnnotationColor:
      return '#3b82f6'
    default:
      return '#eab308'
  }
}

/**
 * Convert studio color name to CSS color value
 */
export function getStudioColorValue(color: StudioAnnotationColor): string {
  switch (color) {
    case 'green':
      return '#22c55e'
    case 'yellow':
      return '#eab308'
    case 'blue':
      return '#3b82f6'
    default:
      return '#eab308'
  }
}

/**
 * Convert annotations to react-chessboard arrows format
 */
export function annotationsToArrows(annotations: Annotation[], annotationState?: StudioAnnotationState): ChessboardArrow[] {
  const arrows: ChessboardArrow[] = annotations
    .filter(annotation => annotation.type === 'arrow' && annotation.from && annotation.to)
    .map(annotation => ({
      startSquare: annotation.from!,
      endSquare: annotation.to!,
      color: getColorValue(annotation.color)
    }))

  // Add preview arrow if dragging
  if (annotationState?.previewArrow) {
    arrows.push({
      startSquare: annotationState.previewArrow.from,
      endSquare: annotationState.previewArrow.to,
      color: '#22c55e', // Green color for preview arrow
    })
  }

  return arrows
}

/**
 * Convert annotations to react-chessboard square styles
 */
export function annotationsToSquareStyles(annotations: Annotation[]): ChessboardSquareStyles {
  const styles: ChessboardSquareStyles = {}
  
  annotations
    .filter(annotation => (annotation.type === 'circle' || annotation.type === 'highlight') && annotation.square)
    .forEach(annotation => {
      const color = getColorValue(annotation.color)
      const square = annotation.square!
      
      if (annotation.type === 'circle') {
        styles[square] = {
          ...styles[square],
          border: `3px solid ${color}`,
          borderRadius: '50%',
          boxSizing: 'border-box'
        }
      } else if (annotation.type === 'highlight') {
        styles[square] = {
          ...styles[square],
          backgroundColor: `${color}40`, // Add transparency
          borderRadius: '4px'
        }
      }
    })
  
  return styles
}

/**
 * Generate a unique ID for annotations
 */
export function generateAnnotationId(): string {
  return `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Check if a square is valid chess notation
 */
export function isValidSquare(square: string): boolean {
  return /^[a-h][1-8]$/.test(square)
}

/**
 * Get keyboard shortcut for annotation mode
 */
export function getModeShortcut(mode: AnnotationMode): string {
  switch (mode) {
    case 'move':
      return 'M'
    case 'circle':
      return 'C'
    case 'highlight':
      return 'H'
    case 'arrow':
      return 'A'
    default:
      return ''
  }
}

/**
 * Get keyboard shortcut for annotation color
 */
export function getColorShortcut(color: AnnotationColor): string {
  switch (color) {
    case 'green':
      return 'G'
    case 'red':
      return 'R'
    case 'yellow':
      return 'Y'
    case 'blue' as AnnotationColor:
      return 'B'
    default:
      return ''
  }
}
