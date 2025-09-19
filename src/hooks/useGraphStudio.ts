import { useReducer, useCallback, useMemo } from 'react'
import { Chess } from 'chess.js'
import { v4 as uuidv4 } from 'uuid'
import type { 
  ChessmeldMeldFormatCMFV001, 
  PositionNode, 
  ChildReference, 
  Event
} from '@/lib/cmf'
import type { GraphPath } from '@/lib/renderer-core'
import type { 
  GraphStudioSession, 
  GraphStudioContextType, 
  RecordingState, 
  MetadataForm, 
  LegacyMoveEvent,
  LegacyEvent,
  AnnotationState,
  AnnotationMode,
  AnnotationColor,
  AnnotationEvent,
  LegalPolicy,
  CMFEvent,
  IntegrityWarning,
  RecordingDefaults
} from '@/types/graph-studio'
import type { TextEvent } from '@/services/transcription'

// ============================================================================
// STATE MANAGEMENT: Reducer Pattern
// ============================================================================

interface GraphStudioState {
  currentStep: 'setup' | 'recording' | 'review' | 'export'
  session: GraphStudioSession | null
  recordingState: RecordingState
  metadata: MetadataForm
  annotationState: AnnotationState
  currentLegalPolicy: LegalPolicy
}

type GraphStudioAction =
  | { type: 'SET_STEP'; step: GraphStudioState['currentStep'] }
  | { type: 'INIT_SESSION'; session: GraphStudioSession }
  | { type: 'ADD_MOVE'; move: LegacyMoveEvent; parentFen: string }
  | { type: 'ADD_VARIATION'; move: LegacyMoveEvent; parentFen: string }
  | { type: 'NAVIGATE_TO_NODE'; fen: string; timestamp?: number; navigationType?: 'to_node' | 'back' | 'forward' | 'start' | 'latest' }
  | { type: 'NAVIGATE_TO_MOVE_INDEX'; moveIndex: number; timestamp?: number }
  | { type: 'UPDATE_NODE'; fen: string; updates: Partial<PositionNode> }
  | { type: 'REMOVE_NODE'; fen: string }
  | { type: 'SET_RECORDING_STATE'; state: Partial<RecordingState> }
  | { type: 'SET_METADATA'; metadata: Partial<MetadataForm> }
  | { type: 'SET_ANNOTATION_STATE'; state: Partial<AnnotationState> }
  | { type: 'SET_LEGAL_POLICY'; policy: LegalPolicy }
  | { type: 'ADD_INTEGRITY_WARNING'; warning: IntegrityWarning }
  | { type: 'CLEAR_INTEGRITY_WARNINGS' }
  | { type: 'ADD_TEXT_EVENTS'; textEvents: TextEvent[] }
  | { type: 'UPDATE_TEXT_EVENTS'; textEvents: TextEvent[] }
  | { type: 'SET_AUDIO_BLOB'; blob: Blob }
  | { type: 'ADD_ANNOTATION_EVENT'; event: any }
  | { type: 'SET_WHISPERX_DATA'; whisperXData: any; transcriptUrl?: string }
  | { type: 'RESET_SESSION' }

const initialState: GraphStudioState = {
  currentStep: 'setup',
  session: null,
  recordingState: {
    isRecording: false,
    isPaused: false,
    startTime: 0,
    currentTime: 0,
    duration: 0,
  },
  metadata: {
    title: '',
    author: '',
    tags: [],
    engineHints: false,
  },
  annotationState: {
    mode: 'move',
    color: 'yellow',
    isDrawingArrow: false,
    arrowStartSquare: null,
    isDragging: false,
    dragStartSquare: null,
  },
  currentLegalPolicy: 'strict',
}

function graphStudioReducer(state: GraphStudioState, action: GraphStudioAction): GraphStudioState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step }

    case 'INIT_SESSION':
      return { ...state, session: action.session }

    case 'ADD_MOVE':
    case 'ADD_VARIATION': {
      if (!state.session) return state

      const { move, parentFen } = action
      
      // Create new child node
      // Calculate the correct move number based on half-moves
      const parentNode = state.session.nodes[parentFen]
      const parentHalfMoves = parentNode?.moveNumber || 0
      const childHalfMoves = parentHalfMoves + 1
      const childMoveNumber = Math.floor(childHalfMoves / 2) + 1
      
      const childNode: PositionNode = {
        fen: move.fen,
        children: [],
        parents: [{ fen: parentFen, move: move.san }],
        moveNumber: childHalfMoves // Store half-moves for internal calculation
      }

      // Create child reference
      const childRef: ChildReference = {
        move: move.san,
        fen: move.fen,
        comment: move.comment
      }

      // Create move event for CMF export
      // Parse the move to get from/to squares
      let from = '', to = '', promo: 'q' | 'r' | 'b' | 'n' | undefined = undefined
      try {
        const chess = new Chess(parentFen)
        const moveObj = chess.move(move.san)
        if (moveObj) {
          from = moveObj.from
          to = moveObj.to
          if (moveObj.promotion) {
            promo = moveObj.promotion as 'q' | 'r' | 'b' | 'n'
          }
        }
      } catch (error) {
        console.warn('Failed to parse move for CMF export:', move.san, error)
      }

      const moveEvent: any = {
        t: move.timestamp,
        type: 'move',
        nodeId: move.fen, // Reference to the node this move creates
        san: move.san,
        comment: move.comment,
        // Add required CMF MoveEvent fields
        from,
        to,
        promo,
        legalPolicy: 'strict', // Default legal policy
        color: move.color,
        fen: move.fen
      }

      // Update session
      const updatedSession: GraphStudioSession = {
        ...state.session,
        currentNodeId: move.fen, // Navigate to new node
        currentPath: {
          nodeIds: [...(state.session.currentPath?.nodeIds || []), move.fen],
          moves: [...(state.session.currentPath?.moves || []), move.san]
        },
        nodes: {
          ...state.session.nodes,
          [parentFen]: {
            ...state.session.nodes[parentFen],
            children: [...(state.session.nodes[parentFen].children || []), childRef]
          },
          [move.fen]: childNode
        },
        events: [...(state.session.events || []), moveEvent]
      }

      return { ...state, session: updatedSession }
    }

    case 'NAVIGATE_TO_NODE': {
      if (!state.session || !state.session.nodes[action.fen]) return state

      const path = reconstructPathToNode(state.session, action.fen)
      
      // Create navigation event if timestamp is provided
      let newEvents = state.session.events
      if (action.timestamp !== undefined) {
        const navigateEvent: any = {
          t: action.timestamp,
          type: 'navigate',
          fen: action.fen,
          navigationType: action.navigationType || 'to_node',
          comment: `Navigate to ${action.navigationType || 'node'}`
        }
        newEvents = [...state.session.events, navigateEvent]
      }

      return {
        ...state,
        session: {
          ...state.session,
          currentNodeId: action.fen,
          currentPath: path,
          events: newEvents
        }
      }
    }

    case 'NAVIGATE_TO_MOVE_INDEX': {
      if (!state.session || !state.session.currentPath) return state

      const { moveIndex } = action
      const currentPath = state.session.currentPath
      
      // Clamp the move index to valid range
      const clampedIndex = Math.max(0, Math.min(moveIndex, currentPath.nodeIds.length - 1))
      
      // Get the FEN at the specified move index
      const targetFen = currentPath.nodeIds[clampedIndex]
      if (!targetFen || !state.session.nodes[targetFen]) return state

      // Create a truncated path up to the specified move index
      const truncatedPath = {
        nodeIds: currentPath.nodeIds.slice(0, clampedIndex + 1),
        moves: currentPath.moves.slice(0, clampedIndex)
      }

      // Create navigation event if timestamp is provided
      let newEvents = state.session.events
      if (action.timestamp !== undefined) {
        const navigateEvent: any = {
          t: action.timestamp,
          type: 'navigate',
          fen: targetFen,
          navigationType: 'to_move_index',
          targetMoveIndex: clampedIndex,
          comment: `Navigate to move index ${clampedIndex}`
        }
        newEvents = [...state.session.events, navigateEvent]
      }

      return {
        ...state,
        session: {
          ...state.session,
          currentNodeId: targetFen,
          currentPath: truncatedPath,
          events: newEvents
        }
      }
    }

    case 'UPDATE_NODE': {
      if (!state.session || !state.session.nodes[action.fen]) return state

      return {
        ...state,
        session: {
          ...state.session,
          nodes: {
            ...state.session.nodes,
            [action.fen]: {
              ...state.session.nodes[action.fen],
              ...action.updates
            }
          }
        }
      }
    }

    case 'REMOVE_NODE': {
      if (!state.session) return state

      // Find all descendant nodes to remove
      const nodesToRemove = new Set<string>()
      function findDescendants(fen: string) {
        nodesToRemove.add(fen)
        const node = state.session!.nodes[fen]
        if (node?.children) {
          for (const child of node.children) {
            findDescendants(child.fen)
          }
        }
      }
      findDescendants(action.fen)

      // Remove nodes
      const newNodes = { ...state.session.nodes }
      for (const fenToRemove of nodesToRemove) {
        delete newNodes[fenToRemove]
      }

      // Navigate away if we're on a removed node
      let newCurrentNodeId = state.session.currentNodeId
      if (nodesToRemove.has(state.session.currentNodeId)) {
        newCurrentNodeId = state.session.rootNodeId
      }

      return {
        ...state,
        session: {
          ...state.session,
          currentNodeId: newCurrentNodeId,
          nodes: newNodes
        }
      }
    }

    case 'SET_RECORDING_STATE':
      return {
        ...state,
        recordingState: { ...state.recordingState, ...action.state }
      }

    case 'SET_METADATA':
      return {
        ...state,
        metadata: { ...state.metadata, ...action.metadata }
      }

    case 'SET_ANNOTATION_STATE':
      return {
        ...state,
        annotationState: { ...state.annotationState, ...action.state }
      }

    case 'SET_LEGAL_POLICY':
      return {
        ...state,
        currentLegalPolicy: action.policy
      }


    case 'ADD_INTEGRITY_WARNING': {
      if (!state.session) return state

      return {
        ...state,
        session: {
          ...state.session,
          integrityWarnings: [...(state.session.integrityWarnings || []), action.warning]
        }
      }
    }

    case 'CLEAR_INTEGRITY_WARNINGS': {
      if (!state.session) return state

      return {
        ...state,
        session: {
          ...state.session,
          integrityWarnings: []
        }
      }
    }

    case 'ADD_TEXT_EVENTS': {
      if (!state.session) return state

      // Convert text events to CMF format and add to main events array
      const cmfTextEvents = action.textEvents.map(textEvent => ({
        t: textEvent.t,
        type: 'text' as const,
        text: textEvent.text,
        // Add FEN of current position
        fen: state.session!.nodes[state.session!.currentNodeId]?.fen || state.session!.startingFen
      }))

      return {
        ...state,
        session: {
          ...state.session,
          textEvents: [...(state.session.textEvents || []), ...action.textEvents],
          events: [...(state.session.events || []), ...cmfTextEvents]
        }
      }
    }

    case 'UPDATE_TEXT_EVENTS': {
      if (!state.session) return state

      return {
        ...state,
        session: {
          ...state.session,
          textEvents: action.textEvents
        }
      }
    }

    case 'ADD_ANNOTATION_EVENT': {
      if (!state.session) return state

      return {
        ...state,
        session: {
          ...state.session,
          events: [...(state.session.events || []), action.event]
        }
      }
    }

    case 'SET_AUDIO_BLOB': {
      if (!state.session) return state

      return {
        ...state,
        session: {
          ...state.session,
          audioBlob: action.blob
        }
      }
    }

    case 'SET_WHISPERX_DATA': {
      if (!state.session) return state

      return {
        ...state,
        session: {
          ...state.session,
          whisperXData: action.whisperXData,
          transcriptUrl: action.transcriptUrl
        }
      }
    }

    case 'RESET_SESSION':
      return initialState

    default:
      return state
  }
}

// ============================================================================
// HOOK IMPLEMENTATION: Clean & Predictable
// ============================================================================

export function useGraphStudio(): GraphStudioContextType {
  const [state, dispatch] = useReducer(graphStudioReducer, initialState)

  // ============================================================================
  // COMPUTED VALUES: Derived from state
  // ============================================================================
  
  const currentNodeId = state.session?.currentNodeId || ''
  const currentPath = state.session?.currentPath || { nodeIds: [], moves: [] }

  const getCurrentNode = useCallback((): PositionNode | null => {
    if (!state.session || !currentNodeId) return null
    return state.session.nodes[currentNodeId] || null
  }, [state.session, currentNodeId])

  // ============================================================================
  // ACTIONS: Simple, predictable functions
  // ============================================================================

  const setCurrentStep = useCallback((step: GraphStudioState['currentStep']) => {
    dispatch({ type: 'SET_STEP', step })
  }, [])

  const setSession = useCallback((session: GraphStudioSession | null) => {
    if (session) {
      dispatch({ type: 'INIT_SESSION', session })
    } else {
      dispatch({ type: 'RESET_SESSION' })
    }
  }, [])

  const addMove = useCallback((move: LegacyMoveEvent) => {
    console.log('addMove received:', move)
    const currentNode = getCurrentNode()
    if (!currentNode) {
      console.error('No current node found')
      return
    }

    // Check if move already exists
    const existingChild = currentNode.children?.find(child => child.move === move.san)
    if (existingChild) {
      dispatch({ type: 'NAVIGATE_TO_NODE', fen: existingChild.fen })
      return
    }

    dispatch({ type: 'ADD_MOVE', move, parentFen: currentNode.fen })
  }, [getCurrentNode])

  const addVariation = useCallback((move: LegacyMoveEvent) => {
    const currentNode = getCurrentNode()
    if (!currentNode) {
      console.error('No current node found')
      return
    }

    // Check if move already exists
    const existingChild = currentNode.children?.find(child => child.move === move.san)
    if (existingChild) {
      dispatch({ type: 'NAVIGATE_TO_NODE', fen: existingChild.fen })
      return
    }

    dispatch({ type: 'ADD_VARIATION', move, parentFen: currentNode.fen })
  }, [getCurrentNode])

  const navigateToNode = useCallback((fen: string, timestamp?: number) => {
    dispatch({ type: 'NAVIGATE_TO_NODE', fen, timestamp })
  }, [])

  const navigateToMoveIndex = useCallback((moveIndex: number, timestamp?: number) => {
    dispatch({ type: 'NAVIGATE_TO_MOVE_INDEX', moveIndex, timestamp })
  }, [])

  const updateNode = useCallback((fen: string, updates: Partial<PositionNode>) => {
    dispatch({ type: 'UPDATE_NODE', fen, updates })
  }, [])

  const removeNode = useCallback((fen: string) => {
    dispatch({ type: 'REMOVE_NODE', fen })
  }, [])

  const setRecordingState = useCallback((recordingState: Partial<RecordingState>) => {
    dispatch({ type: 'SET_RECORDING_STATE', state: recordingState })
  }, [])

  const setMetadata = useCallback((metadata: Partial<MetadataForm>) => {
    dispatch({ type: 'SET_METADATA', metadata })
  }, [])

  const setAnnotationMode = useCallback((mode: AnnotationMode) => {
    dispatch({ type: 'SET_ANNOTATION_STATE', state: { mode } })
  }, [])

  const setAnnotationColor = useCallback((color: AnnotationColor) => {
    dispatch({ type: 'SET_ANNOTATION_STATE', state: { color } })
  }, [])

  const setLegalPolicy = useCallback((policy: LegalPolicy) => {
    dispatch({ type: 'SET_LEGAL_POLICY', policy })
  }, [])


  const addIntegrityWarning = useCallback((warning: IntegrityWarning) => {
    dispatch({ type: 'ADD_INTEGRITY_WARNING', warning })
  }, [])

  const clearIntegrityWarnings = useCallback(() => {
    dispatch({ type: 'CLEAR_INTEGRITY_WARNINGS' })
  }, [])

  const resetSession = useCallback(() => {
    dispatch({ type: 'RESET_SESSION' })
  }, [])

  // ============================================================================
  // TEXT EVENTS: Complete implementation
  // ============================================================================

  const addTextEvents = useCallback((textEvents: TextEvent[]) => {
    dispatch({ type: 'ADD_TEXT_EVENTS', textEvents })
  }, [])

  const updateTextEvents = useCallback((textEvents: TextEvent[]) => {
    dispatch({ type: 'UPDATE_TEXT_EVENTS', textEvents })
  }, [])

  // ============================================================================
  // ANNOTATION EVENTS: Complete implementation
  // ============================================================================

  const addAnnotationEvent = useCallback((event: any) => {
    // Get current FEN position
    const currentNode = getCurrentNode()
    if (!currentNode) return

    // The event is already in CMF format from handleAnnotationEvent
    // Just add the FEN position if it's not already set
    const cmfEvent: any = {
      ...event,
      fen: currentNode.fen,
    }

    dispatch({ type: 'ADD_ANNOTATION_EVENT', event: cmfEvent })
  }, [getCurrentNode])

  // ============================================================================
  // AUDIO BLOB: Complete implementation
  // ============================================================================

  const setAudioBlob = useCallback((blob: Blob) => {
    dispatch({ type: 'SET_AUDIO_BLOB', blob })
  }, [])

  const setWhisperXData = useCallback((whisperXData: any, transcriptUrl?: string) => {
    dispatch({ type: 'SET_WHISPERX_DATA', whisperXData, transcriptUrl })
  }, [])

  // ============================================================================
  // NAVIGATION HELPERS: Pure functions
  // ============================================================================

  const goBack = useCallback((timestamp?: number) => {
    const currentNode = getCurrentNode()
    if (!currentNode?.parents?.length) return

    const parent = currentNode.parents[0]
    dispatch({ type: 'NAVIGATE_TO_NODE', fen: parent.fen, timestamp, navigationType: 'back' })
  }, [getCurrentNode])

  const goForward = useCallback((timestamp?: number) => {
    const currentNode = getCurrentNode()
    if (!currentNode?.children?.length) return

    // Navigate to the first child (no mainline concept)
    const firstChild = currentNode.children[0]
    if (firstChild) {
      dispatch({ type: 'NAVIGATE_TO_NODE', fen: firstChild.fen, timestamp, navigationType: 'forward' })
    }
  }, [getCurrentNode])

  const goToStart = useCallback((timestamp?: number) => {
    if (!state.session) return
    dispatch({ type: 'NAVIGATE_TO_NODE', fen: state.session.rootNodeId, timestamp, navigationType: 'start' })
  }, [state.session])

  const goToLatest = useCallback((timestamp?: number) => {
    if (!state.session) return

    // Find all leaf nodes (nodes with no children)
    const leafNodes = Object.values(state.session.nodes).filter(node => !node.children?.length)
    
    if (leafNodes.length === 0) return

    // Find the leaf node with the latest timestamp
    let latestNode: PositionNode | null = null
    let latestTimestamp = -1

    for (const node of leafNodes) {
      // Find the latest event for this node
      const nodeEvents = state.session.events.filter(event => 
        event.type === 'move' && 'fen' in event && event.fen === node.fen
      )
      
      // Skip nodes with no events
      if (nodeEvents.length === 0) continue
      
      const latestEvent = nodeEvents.reduce((latest, event) => 
        event.t > latest.t ? event : latest, nodeEvents[0])
      
      if (latestEvent && latestEvent.t > latestTimestamp) {
        latestTimestamp = latestEvent.t
        latestNode = node
      }
    }

    if (latestNode) {
      dispatch({ type: 'NAVIGATE_TO_NODE', fen: latestNode.fen, timestamp, navigationType: 'latest' })
    }
  }, [state.session])


  const getAllPaths = useCallback((): GraphPath[] => {
    if (!state.session) return []

    const paths: GraphPath[] = []
    const visited = new Set<string>()

    function traverse(fen: string, currentPath: GraphPath) {
      if (visited.has(fen)) return
      visited.add(fen)

      const node = state.session!.nodes[fen]
      if (!node) return

      if (!node.children?.length) {
        paths.push({ ...currentPath })
        return
      }

      for (const child of node.children) {
        const newPath: GraphPath = {
          nodeIds: [...currentPath.nodeIds, child.fen],
          moves: [...currentPath.moves, child.move]
        }
        traverse(child.fen, newPath)
      }
    }

    traverse(state.session.rootNodeId, { nodeIds: [state.session.rootNodeId], moves: [] })
    return paths
  }, [state.session])

  const getVariations = useCallback((): ChildReference[] => {
    const currentNode = getCurrentNode()
    return currentNode?.children || []
  }, [getCurrentNode])

  const navigateToPath = useCallback((path: GraphPath) => {
    const lastFen = path.nodeIds[path.nodeIds.length - 1]
    if (state.session?.nodes[lastFen]) {
      dispatch({ type: 'NAVIGATE_TO_NODE', fen: lastFen })
    }
  }, [state.session])


  // ============================================================================
  // EXPORT: Complete implementation
  // ============================================================================

  const exportCMF = useCallback((): ChessmeldMeldFormatCMFV001 => {
    if (!state.session) {
      throw new Error('No session to export')
    }

    const now = new Date().toISOString()
    const duration = state.session.duration || 0

    return {
      schema: 'cmf.v0.0.1',
      meta: {
        id: state.session.id,
        title: state.metadata.title || state.session.title,
        author: state.metadata.author || state.session.author,
        createdAt: now,
        startingFen: state.session.startingFen,
        durationMs: duration,
        tags: state.metadata.tags,
        engineHints: state.metadata.engineHints,
        transcriptUrl: state.session.transcriptUrl,
      },
      rootNodeId: state.session.rootNodeId,
      nodes: state.session.nodes,
      events: state.session.events || [],
      overlays: {},
      precomputed: [],
    }
  }, [state.session, state.metadata])

  // ============================================================================
  // RETURN: Clean interface
  // ============================================================================

  return {
    currentStep: state.currentStep,
    session: state.session,
    recordingState: state.recordingState,
    metadata: state.metadata,
    currentNodeId,
    currentPath,
    annotationState: state.annotationState,
    currentLegalPolicy: state.currentLegalPolicy,
    setCurrentStep,
    setSession,
    setRecordingState,
    setMetadata,
    setLegalPolicy,
    addMove,
    addVariation,
    updateNode,
    removeNode,
    addIntegrityWarning,
    clearIntegrityWarnings,
    navigateToNode,
    navigateToMoveIndex,
    navigateToPath,
    goBack,
    goForward,
    goToStart,
    goToLatest,
    setAudioBlob,
    setWhisperXData,
    addTextEvents,
    updateTextEvents,
    addAnnotationEvent,
    setAnnotationMode,
    setAnnotationColor,
    exportCMF,
    resetSession,
    getCurrentNode,
    getVariations,
    getAllPaths,
  }
}

// ============================================================================
// HELPER FUNCTIONS: Pure, testable
// ============================================================================

function reconstructPathToNode(session: GraphStudioSession, targetFen: string): GraphPath {
  const path: GraphPath = { nodeIds: [], moves: [] }
  
  function findPath(fen: string): boolean {
    if (fen === targetFen) {
      path.nodeIds.unshift(fen)
      return true
    }

    const node = session.nodes[fen]
    if (!node?.children) return false

    for (const child of node.children) {
      if (findPath(child.fen)) {
        path.nodeIds.unshift(fen)
        path.moves.unshift(child.move)
        return true
      }
    }

    return false
  }

  findPath(session.rootNodeId)
  return path
}