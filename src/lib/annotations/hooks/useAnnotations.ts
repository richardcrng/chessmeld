import { useState, useCallback } from 'react'
import type { Annotation, AnnotationState, AnnotationMode, AnnotationColor, ClearAnnotationsEvent } from '../types'
import { generateAnnotationId, isValidSquare } from '../utils'

const defaultAnnotationState: AnnotationState = {
  mode: 'move',
  color: 'green',
  isDrawingArrow: false,
  arrowStartSquare: null,
  isDragging: false,
  dragStartSquare: null,
}

export function useAnnotations(onClearAnnotations?: (event: ClearAnnotationsEvent) => void) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [annotationState, setAnnotationState] = useState<AnnotationState>(defaultAnnotationState)

  const setAnnotationMode = useCallback((mode: AnnotationMode) => {
    setAnnotationState((prev: AnnotationState) => ({
      ...prev,
      mode,
      isDrawingArrow: false,
      arrowStartSquare: null,
      isDragging: false,
      dragStartSquare: null,
    }))
  }, [])

  const setAnnotationColor = useCallback((color: AnnotationColor) => {
    setAnnotationState((prev: AnnotationState) => ({
      ...prev,
      color,
    }))
  }, [])

  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: generateAnnotationId(),
      timestamp: Date.now(),
    }
    setAnnotations((prev: Annotation[]) => [...prev, newAnnotation])
    return newAnnotation
  }, [])

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev: Annotation[]) => prev.filter((annotation: Annotation) => annotation.id !== id))
  }, [])

  const removeAnnotationsOnSquare = useCallback((square: string) => {
    if (!isValidSquare(square)) return
    
    setAnnotations((prev: Annotation[]) => prev.filter((annotation: Annotation) => 
      annotation.square !== square && 
      annotation.from !== square && 
      annotation.to !== square
    ))
  }, [])

  const clearAllAnnotations = useCallback(() => {
    setAnnotations([])
    
    // Emit clear event if callback is provided
    if (onClearAnnotations) {
      const clearEvent: ClearAnnotationsEvent = {
        timestamp: Date.now(),
        type: 'clear'
      }
      onClearAnnotations(clearEvent)
    }
  }, [onClearAnnotations])

  const handleSquareClick = useCallback((square: string) => {
    if (!isValidSquare(square)) return

    const { mode, color, isDrawingArrow, arrowStartSquare } = annotationState

    if (mode === 'move') {
      // In move mode, clicking on empty square removes all annotations on that square
      removeAnnotationsOnSquare(square)
      return
    }

    if (mode === 'arrow') {
      if (!isDrawingArrow) {
        // Start drawing arrow
        setAnnotationState((prev: AnnotationState) => ({
          ...prev,
          isDrawingArrow: true,
          arrowStartSquare: square,
        }))
      } else if (arrowStartSquare && arrowStartSquare !== square) {
        // Complete arrow
        addAnnotation({
          type: 'arrow',
          from: arrowStartSquare,
          to: square,
          color,
        })
        setAnnotationState((prev: AnnotationState) => ({
          ...prev,
          isDrawingArrow: false,
          arrowStartSquare: null,
        }))
      } else {
        // Cancel arrow drawing
        setAnnotationState((prev: AnnotationState) => ({
          ...prev,
          isDrawingArrow: false,
          arrowStartSquare: null,
        }))
      }
      return
    }

    if (mode === 'circle' || mode === 'highlight') {
      // Toggle annotation on square
      const existingAnnotation = annotations.find(
        (annotation: Annotation) => annotation.square === square && annotation.type === mode
      )

      if (existingAnnotation) {
        removeAnnotation(existingAnnotation.id)
      } else {
        addAnnotation({
          type: mode,
          square,
          color,
        })
      }
    }
  }, [annotationState, annotations, addAnnotation, removeAnnotation, removeAnnotationsOnSquare])

  const handleDragStart = useCallback((square: string) => {
    if (!isValidSquare(square)) return

    const { mode, color } = annotationState

    if (mode === 'arrow') {
      setAnnotationState((prev: AnnotationState) => ({
        ...prev,
        isDragging: true,
        dragStartSquare: square,
      }))
    }
  }, [annotationState])

  const handleDragEnd = useCallback((square: string) => {
    if (!isValidSquare(square)) return

    const { mode, color, isDragging, dragStartSquare } = annotationState

    if (mode === 'arrow' && isDragging && dragStartSquare && dragStartSquare !== square) {
      // Complete arrow via drag
      addAnnotation({
        type: 'arrow',
        from: dragStartSquare,
        to: square,
        color,
      })
    }

    // Reset drag state
    setAnnotationState((prev: AnnotationState) => ({
      ...prev,
      isDragging: false,
      dragStartSquare: null,
    }))
  }, [annotationState, addAnnotation])

  const handleDragCancel = useCallback(() => {
    // Reset drag state without creating annotation
    setAnnotationState((prev: AnnotationState) => ({
      ...prev,
      isDragging: false,
      dragStartSquare: null,
    }))
  }, [])

  return {
    annotations,
    annotationState,
    setAnnotationMode,
    setAnnotationColor,
    addAnnotation,
    removeAnnotation,
    removeAnnotationsOnSquare,
    clearAllAnnotations,
    handleSquareClick,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  }
}
