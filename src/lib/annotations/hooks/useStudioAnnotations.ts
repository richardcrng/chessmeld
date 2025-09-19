import { useState, useCallback, useEffect } from 'react'
import type { Annotation, StudioAnnotationState, AnnotationMode, StudioAnnotationColor, AnnotationColor } from '../types'
import { generateAnnotationId, isValidSquare } from '../utils'

const defaultStudioAnnotationState: StudioAnnotationState = {
  activeMode: null, // Default to move mode
  isDrawingArrow: false,
  arrowStartSquare: null,
  isDragging: false,
  dragStartSquare: null,
  heldKeys: new Set(),
  previewArrow: null,
}

// Key mapping for studio mode
const KEY_MODE_MAP: Record<string, AnnotationMode> = {
  'h': 'highlight',
  'c': 'circle', 
  'a': 'arrow',
}

// Color mapping for studio mode (fixed colors)
const MODE_COLOR_MAP: Record<AnnotationMode, AnnotationColor> = {
  'move': 'green', // Not used, but for completeness
  'arrow': 'green',
  'circle': 'yellow',
  'highlight': 'blue',
}

export function useStudioAnnotations(
  onClearAnnotations?: (event: { timestamp: number; type: 'clear' }) => void,
  getTimestamp?: () => number
) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [annotationState, setAnnotationState] = useState<StudioAnnotationState>(defaultStudioAnnotationState)

  const clearAllAnnotations = useCallback(() => {
    setAnnotations([])
    
    // Emit clear event if callback is provided
    if (onClearAnnotations) {
      const clearEvent = {
        timestamp: getTimestamp ? getTimestamp() : Date.now(),
        type: 'clear' as const
      }
      onClearAnnotations(clearEvent)
    }
  }, [onClearAnnotations, getTimestamp])

  // Handle key down events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    const mode = KEY_MODE_MAP[key]
    
    if (mode) {
      event.preventDefault() // Prevent default browser behavior
      
      setAnnotationState(prev => ({
        ...prev,
        heldKeys: new Set([...prev.heldKeys, key]),
        activeMode: mode, // Last pressed key takes precedence
      }))
    } else if (key === 'x') {
      event.preventDefault()
      clearAllAnnotations()
    }
  }, [clearAllAnnotations])

  // Handle key up events
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    const mode = KEY_MODE_MAP[key]
    
    if (mode) {
      event.preventDefault()
      
      setAnnotationState(prev => {
        const newHeldKeys = new Set(prev.heldKeys)
        newHeldKeys.delete(key)
        
        // If no keys are held, return to move mode
        if (newHeldKeys.size === 0) {
          return {
            ...prev,
            heldKeys: newHeldKeys,
            activeMode: null,
            isDrawingArrow: false,
            arrowStartSquare: null,
            isDragging: false,
            dragStartSquare: null,
            previewArrow: null,
          }
        }
        
        // Otherwise, set the mode to the last remaining key
        const lastKey = Array.from(newHeldKeys).pop()
        const lastMode = lastKey ? KEY_MODE_MAP[lastKey] : null
        
        return {
          ...prev,
          heldKeys: newHeldKeys,
          activeMode: lastMode,
        }
      })
    }
  }, [])

  // Set up global keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: generateAnnotationId(),
      timestamp: getTimestamp ? getTimestamp() : Date.now(),
    }
    setAnnotations((prev: Annotation[]) => [...prev, newAnnotation])
    return newAnnotation
  }, [getTimestamp])

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

  const handleSquareClick = useCallback((square: string) => {
    if (!isValidSquare(square)) return

    const { activeMode, isDrawingArrow, arrowStartSquare } = annotationState

    // If no active mode (move mode), remove ALL annotations when clicking empty squares
    if (!activeMode) {
      clearAllAnnotations()
      return
    }

    const color = MODE_COLOR_MAP[activeMode] as AnnotationColor

    if (activeMode === 'arrow') {
      if (!isDrawingArrow) {
        // Start drawing arrow
        setAnnotationState((prev: StudioAnnotationState) => ({
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
        setAnnotationState((prev: StudioAnnotationState) => ({
          ...prev,
          isDrawingArrow: false,
          arrowStartSquare: null,
        }))
      } else {
        // Cancel arrow drawing
        setAnnotationState((prev: StudioAnnotationState) => ({
          ...prev,
          isDrawingArrow: false,
          arrowStartSquare: null,
        }))
      }
      return
    }

    if (activeMode === 'circle' || activeMode === 'highlight') {
      // Toggle annotation on square
      const existingAnnotation = annotations.find(
        (annotation: Annotation) => annotation.square === square && annotation.type === activeMode
      )

      if (existingAnnotation) {
        removeAnnotation(existingAnnotation.id)
      } else {
        addAnnotation({
          type: activeMode,
          square,
          color,
        })
      }
    }
  }, [annotationState, annotations, addAnnotation, removeAnnotation, clearAllAnnotations])

  const handleDragStart = useCallback((square: string) => {
    if (!isValidSquare(square)) return

    const { activeMode } = annotationState

    if (activeMode === 'arrow') {
      setAnnotationState((prev: StudioAnnotationState) => ({
        ...prev,
        isDragging: true,
        dragStartSquare: square,
      }))
    }
  }, [annotationState])

  const handleDragEnd = useCallback((square: string) => {
    if (!isValidSquare(square)) return

    const { activeMode, isDragging, dragStartSquare } = annotationState

    if (activeMode === 'arrow' && isDragging && dragStartSquare && dragStartSquare !== square) {
      // Complete arrow via drag
      const color = MODE_COLOR_MAP[activeMode] as AnnotationColor
      addAnnotation({
        type: 'arrow',
        from: dragStartSquare,
        to: square,
        color,
      })
    }

    // Reset drag state
    setAnnotationState((prev: StudioAnnotationState) => ({
      ...prev,
      isDragging: false,
      dragStartSquare: null,
      previewArrow: null,
    }))
  }, [annotationState, addAnnotation])

  const handleDragCancel = useCallback(() => {
    // Reset drag state without creating annotation
    setAnnotationState((prev: StudioAnnotationState) => ({
      ...prev,
      isDragging: false,
      dragStartSquare: null,
      previewArrow: null,
    }))
  }, [])

  const handleMouseMove = useCallback((square: string) => {
    setAnnotationState((prev: StudioAnnotationState) => {
      const { activeMode, isDragging, dragStartSquare } = prev

      if (activeMode === 'arrow' && isDragging && dragStartSquare && dragStartSquare !== square) {
        // Update preview arrow while dragging
        return {
          ...prev,
          previewArrow: {
            from: dragStartSquare,
            to: square,
          },
        }
      }
      
      return prev
    })
  }, [])

  // Right-click handlers
  const handleSquareRightClick = useCallback((square: string) => {
    if (!isValidSquare(square)) return

    // Right-click on square: highlight it
    const color = MODE_COLOR_MAP['highlight'] as AnnotationColor
    
    // Toggle highlight annotation on square
    const existingAnnotation = annotations.find(
      (annotation: Annotation) => annotation.square === square && annotation.type === 'highlight'
    )

    if (existingAnnotation) {
      removeAnnotation(existingAnnotation.id)
    } else {
      addAnnotation({
        type: 'highlight',
        square,
        color,
      })
    }
  }, [annotations, addAnnotation, removeAnnotation])

  const handleRightClickDragStart = useCallback((square: string) => {
    if (!isValidSquare(square)) return

    // Start drawing arrow on right-click drag
    setAnnotationState((prev: StudioAnnotationState) => ({
      ...prev,
      isDragging: true,
      dragStartSquare: square,
      activeMode: 'arrow', // Temporarily set to arrow mode for right-click drag
    }))
  }, [])

  const handleRightClickDragEnd = useCallback((square: string) => {
    if (!isValidSquare(square)) return

    const { isDragging, dragStartSquare } = annotationState

    if (isDragging && dragStartSquare && dragStartSquare !== square) {
      // Complete arrow via right-click drag
      const color = MODE_COLOR_MAP['arrow'] as AnnotationColor
      addAnnotation({
        type: 'arrow',
        from: dragStartSquare,
        to: square,
        color,
      })
    }

    // Reset drag state and return to previous mode
    setAnnotationState((prev: StudioAnnotationState) => ({
      ...prev,
      isDragging: false,
      dragStartSquare: null,
      previewArrow: null,
      activeMode: prev.heldKeys.size > 0 ? 
        (Array.from(prev.heldKeys).pop() ? KEY_MODE_MAP[Array.from(prev.heldKeys).pop()!] : null) : 
        null, // Return to previous mode or null if no keys held
    }))
  }, [annotationState, addAnnotation])

  const handleRightClickDragCancel = useCallback(() => {
    // Reset drag state without creating annotation
    setAnnotationState((prev: StudioAnnotationState) => ({
      ...prev,
      isDragging: false,
      dragStartSquare: null,
      previewArrow: null,
      activeMode: prev.heldKeys.size > 0 ? 
        (Array.from(prev.heldKeys).pop() ? KEY_MODE_MAP[Array.from(prev.heldKeys).pop()!] : null) : 
        null, // Return to previous mode or null if no keys held
    }))
  }, [])

  return {
    annotations,
    annotationState,
    addAnnotation,
    removeAnnotation,
    removeAnnotationsOnSquare,
    clearAllAnnotations,
    handleSquareClick,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    handleMouseMove,
    handleSquareRightClick,
    handleRightClickDragStart,
    handleRightClickDragEnd,
    handleRightClickDragCancel,
  }
}
