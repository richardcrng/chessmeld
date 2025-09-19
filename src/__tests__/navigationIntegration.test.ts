import { describe, it, expect } from 'vitest'

// Integration test to verify navigation events are properly added to session
// This simulates the reducer logic for navigation events

interface MockNavigateEvent {
  t: number
  type: 'navigate'
  fen: string
  navigationType: 'to_node' | 'to_move_index' | 'back' | 'forward' | 'start' | 'latest'
  targetMoveIndex?: number
  comment?: string
}

interface MockEvent {
  t: number
  type: string
  fen: string
  san?: string
  comment?: string
}

interface MockNode {
  fen: string
  children: any[]
  parents: any[]
  moveNumber: number
}

interface MockSession {
  nodes: Record<string, MockNode>
  events: MockEvent[]
  currentNodeId: string
  currentPath: {
    nodeIds: string[]
    moves: string[]
  }
  rootNodeId: string
}

// Simulate the reducer logic for NAVIGATE_TO_NODE
function simulateNavigateToNode(
  session: MockSession,
  fen: string,
  timestamp?: number,
  navigationType?: 'to_node' | 'back' | 'forward' | 'start' | 'latest'
): MockSession {
  if (!session.nodes[fen]) {
    throw new Error(`Node with FEN ${fen} not found`)
  }

  // Create navigation event if timestamp is provided
  let newEvents = session.events
  if (timestamp !== undefined) {
    const navigateEvent: MockNavigateEvent = {
      t: timestamp,
      type: 'navigate',
      fen: fen,
      navigationType: navigationType || 'to_node',
      comment: `Navigate to ${navigationType || 'node'}`
    }
    newEvents = [...session.events, navigateEvent]
  }

  return {
    ...session,
    currentNodeId: fen,
    events: newEvents
  }
}

// Simulate the reducer logic for NAVIGATE_TO_MOVE_INDEX
function simulateNavigateToMoveIndex(
  session: MockSession,
  moveIndex: number,
  timestamp?: number
): MockSession {
  if (!session.currentPath) {
    throw new Error('No current path found')
  }

  const currentPath = session.currentPath
  
  // Clamp the move index to valid range
  const clampedIndex = Math.max(0, Math.min(moveIndex, currentPath.nodeIds.length - 1))
  
  // Get the FEN at the specified move index
  const targetFen = currentPath.nodeIds[clampedIndex]
  if (!targetFen || !session.nodes[targetFen]) {
    throw new Error(`Target FEN ${targetFen} not found`)
  }

  // Create navigation event if timestamp is provided
  let newEvents = session.events
  if (timestamp !== undefined) {
    const navigateEvent: MockNavigateEvent = {
      t: timestamp,
      type: 'navigate',
      fen: targetFen,
      navigationType: 'to_move_index',
      targetMoveIndex: clampedIndex,
      comment: `Navigate to move index ${clampedIndex}`
    }
    newEvents = [...session.events, navigateEvent]
  }

  return {
    ...session,
    currentNodeId: targetFen,
    events: newEvents
  }
}

describe('Navigation Integration', () => {
  const createMockSession = (): MockSession => {
    const rootFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const e4Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const e4e5Fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'

    return {
      nodes: {
        [rootFen]: {
          fen: rootFen,
          children: [{ move: 'e4', fen: e4Fen }],
          parents: [],
          moveNumber: 0
        },
        [e4Fen]: {
          fen: e4Fen,
          children: [{ move: 'e5', fen: e4e5Fen }],
          parents: [{ fen: rootFen, move: 'e4' }],
          moveNumber: 1
        },
        [e4e5Fen]: {
          fen: e4e5Fen,
          children: [],
          parents: [{ fen: e4Fen, move: 'e5' }],
          moveNumber: 2
        }
      },
      events: [
        {
          t: 1000,
          type: 'move',
          fen: e4Fen,
          san: 'e4',
          comment: 'King\'s Pawn Opening'
        },
        {
          t: 2000,
          type: 'move',
          fen: e4e5Fen,
          san: 'e5',
          comment: 'King\'s Pawn Game'
        }
      ],
      currentNodeId: e4e5Fen,
      currentPath: {
        nodeIds: [rootFen, e4Fen, e4e5Fen],
        moves: ['e4', 'e5']
      },
      rootNodeId: rootFen
    }
  }

  it('should add navigation event when navigating to node with timestamp', () => {
    const session = createMockSession()
    const timestamp = 3000
    const targetFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    const updatedSession = simulateNavigateToNode(session, targetFen, timestamp, 'start')

    expect(updatedSession.events).toHaveLength(3) // 2 original + 1 navigation
    expect(updatedSession.events[2]).toEqual({
      t: 3000,
      type: 'navigate',
      fen: targetFen,
      navigationType: 'start',
      comment: 'Navigate to start'
    })
    expect(updatedSession.currentNodeId).toBe(targetFen)
  })

  it('should not add navigation event when navigating without timestamp', () => {
    const session = createMockSession()
    const targetFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    const updatedSession = simulateNavigateToNode(session, targetFen)

    expect(updatedSession.events).toHaveLength(2) // No new events added
    expect(updatedSession.currentNodeId).toBe(targetFen)
  })

  it('should add navigation event when navigating to move index with timestamp', () => {
    const session = createMockSession()
    const timestamp = 4000
    const moveIndex = 1 // Should navigate to e4Fen

    const updatedSession = simulateNavigateToMoveIndex(session, moveIndex, timestamp)

    expect(updatedSession.events).toHaveLength(3) // 2 original + 1 navigation
    expect(updatedSession.events[2]).toEqual({
      t: 4000,
      type: 'navigate',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      navigationType: 'to_move_index',
      targetMoveIndex: 1,
      comment: 'Navigate to move index 1'
    })
    expect(updatedSession.currentNodeId).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')
  })

  it('should handle different navigation types correctly', () => {
    const session = createMockSession()
    const timestamp = 5000
    const targetFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    const navigationTypes = ['back', 'forward', 'start', 'latest'] as const

    navigationTypes.forEach(navType => {
      const updatedSession = simulateNavigateToNode(session, targetFen, timestamp, navType)
      const lastEvent = updatedSession.events[updatedSession.events.length - 1] as MockNavigateEvent
      
      expect(lastEvent.type).toBe('navigate')
      expect(lastEvent.navigationType).toBe(navType)
      expect(lastEvent.t).toBe(timestamp)
      expect(lastEvent.fen).toBe(targetFen)
    })
  })

  it('should maintain chronological order of events', () => {
    const session = createMockSession()
    
    // Add navigation events at different timestamps (after the original events)
    let updatedSession = simulateNavigateToNode(session, session.rootNodeId, 3000, 'start')
    updatedSession = simulateNavigateToNode(updatedSession, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 4000, 'forward')

    expect(updatedSession.events).toHaveLength(4) // 2 original + 2 navigation
    
    // Check that events are in chronological order
    for (let i = 1; i < updatedSession.events.length; i++) {
      expect(updatedSession.events[i].t).toBeGreaterThanOrEqual(updatedSession.events[i - 1].t)
    }
  })

  it('should handle move index navigation with clamped indices', () => {
    const session = createMockSession()
    const timestamp = 6000

    // Test negative index (should clamp to 0)
    const negativeIndexSession = simulateNavigateToMoveIndex(session, -1, timestamp)
    expect(negativeIndexSession.events[negativeIndexSession.events.length - 1]).toMatchObject({
      targetMoveIndex: 0
    })

    // Test index beyond array length (should clamp to last valid index)
    const tooLargeIndexSession = simulateNavigateToMoveIndex(session, 10, timestamp)
    expect(tooLargeIndexSession.events[tooLargeIndexSession.events.length - 1]).toMatchObject({
      targetMoveIndex: 2 // Last valid index
    })
  })
})
