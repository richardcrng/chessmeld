import { describe, it, expect } from 'vitest'

// Simple test for the goToLatest logic
// We'll test the core logic without React hooks

interface MockEvent {
  t: number
  type: string
  fen: string
  san: string
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
}

// Extract the core logic from the hook
function findLatestLeafNode(session: MockSession | null): MockNode | null {
  if (!session) return null

  // Find all leaf nodes (nodes with no children)
  const leafNodes = Object.values(session.nodes).filter(node => !node.children?.length)
  
  if (leafNodes.length === 0) return null

  // Find the leaf node with the latest timestamp
  let latestNode: MockNode | null = null
  let latestTimestamp = -1

  for (const node of leafNodes) {
    // Find the latest event for this node
    const nodeEvents = session.events.filter(event => event.fen === node.fen)
    
    // Skip nodes with no events
    if (nodeEvents.length === 0) continue
    
    const latestEvent = nodeEvents.reduce((latest, event) => 
      event.t > latest.t ? event : latest, nodeEvents[0])
    
    if (latestEvent && latestEvent.t > latestTimestamp) {
      latestTimestamp = latestEvent.t
      latestNode = node
    }
  }

  return latestNode
}

describe('goToLatest Logic', () => {
  const createMockEvent = (fen: string, timestamp: number, san: string = 'e4'): MockEvent => ({
    t: timestamp,
    type: 'move',
    fen,
    san,
    comment: ''
  })

  const createMockNode = (fen: string, children: any[] = []): MockNode => ({
    fen,
    children,
    parents: [],
    moveNumber: 0
  })

  it('should find the leaf node with the latest timestamp', () => {
    const session: MockSession = {
      nodes: {},
      events: []
    }
    
    const rootFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const leaf1Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const leaf2Fen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'

    session.nodes = {
      [rootFen]: createMockNode(rootFen, [
        { move: 'e4', fen: leaf1Fen },
        { move: 'd4', fen: leaf2Fen }
      ]),
      [leaf1Fen]: createMockNode(leaf1Fen),
      [leaf2Fen]: createMockNode(leaf2Fen)
    }

    // leaf1 has timestamp 1000 (earlier)
    // leaf2 has timestamp 2000 (later)
    session.events = [
      createMockEvent(leaf1Fen, 1000, 'e4'),
      createMockEvent(leaf2Fen, 2000, 'd4')
    ]

    const result = findLatestLeafNode(session)
    
    // Should return leaf2Fen (latest timestamp: 2000)
    expect(result).not.toBeNull()
    expect(result?.fen).toBe(leaf2Fen)
  })

  it('should handle case where leaf nodes have no events', () => {
    const session: MockSession = {
      nodes: {},
      events: []
    }
    
    const rootFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const leafFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'

    session.nodes = {
      [rootFen]: createMockNode(rootFen, [{ move: 'e4', fen: leafFen }]),
      [leafFen]: createMockNode(leafFen) // leaf node with no events
    }

    session.events = [
      createMockEvent(rootFen, 1000, 'e4')
    ]

    const result = findLatestLeafNode(session)
    
    // Should return null since leaf has no events
    expect(result).toBeNull()
  })

  it('should handle case with multiple events on the same leaf node', () => {
    const session: MockSession = {
      nodes: {},
      events: []
    }
    
    const rootFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const leaf1Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const leaf2Fen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'

    session.nodes = {
      [rootFen]: createMockNode(rootFen, [
        { move: 'e4', fen: leaf1Fen },
        { move: 'd4', fen: leaf2Fen }
      ]),
      [leaf1Fen]: createMockNode(leaf1Fen),
      [leaf2Fen]: createMockNode(leaf2Fen)
    }

    // leaf1 has multiple events, with the latest being 1500
    // leaf2 has a single event at 1000
    session.events = [
      createMockEvent(leaf1Fen, 1000, 'e4'),
      createMockEvent(leaf1Fen, 1500, 'annotate'), // annotation event
      createMockEvent(leaf2Fen, 1000, 'd4')
    ]

    const result = findLatestLeafNode(session)
    
    // Should return leaf1Fen (latest timestamp: 1500)
    expect(result).not.toBeNull()
    expect(result?.fen).toBe(leaf1Fen)
  })

  it('should handle empty session gracefully', () => {
    const result = findLatestLeafNode(null)
    expect(result).toBeNull()
  })

  it('should handle session with no leaf nodes', () => {
    const session: MockSession = {
      nodes: {},
      events: []
    }
    
    const rootFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    
    // Only root node, no children (no leaf nodes)
    session.nodes = {
      [rootFen]: createMockNode(rootFen)
    }

    const result = findLatestLeafNode(session)
    expect(result).toBeNull()
  })

  it('should handle realistic timestamps correctly', () => {
    const session: MockSession = {
      nodes: {},
      events: []
    }
    
    const rootFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const leaf1Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const leaf2Fen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'

    session.nodes = {
      [rootFen]: createMockNode(rootFen, [
        { move: 'e4', fen: leaf1Fen },
        { move: 'd4', fen: leaf2Fen }
      ]),
      [leaf1Fen]: createMockNode(leaf1Fen),
      [leaf2Fen]: createMockNode(leaf2Fen)
    }

    // Create events with realistic timestamps (milliseconds since epoch)
    const now = Date.now()
    session.events = [
      createMockEvent(leaf1Fen, now - 10000, 'e4'), // 10 seconds ago
      createMockEvent(leaf2Fen, now - 5000, 'd4'),  // 5 seconds ago (more recent)
    ]

    const result = findLatestLeafNode(session)
    
    // Should return leaf2Fen (more recent timestamp)
    expect(result).not.toBeNull()
    expect(result?.fen).toBe(leaf2Fen)
  })

  it('should handle complex game tree with multiple variations', () => {
    const session: MockSession = {
      nodes: {},
      events: []
    }
    
    // Create a more complex tree: root -> e4 -> e5, c5; root -> d4 -> d5
    const rootFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const e4Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const d4Fen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'
    const e4e5Fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'
    const e4c5Fen = 'rnbqkbnr/pppp1ppp/8/2b1p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'
    const d4d5Fen = 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2'

    session.nodes = {
      [rootFen]: createMockNode(rootFen, [
        { move: 'e4', fen: e4Fen },
        { move: 'd4', fen: d4Fen }
      ]),
      [e4Fen]: createMockNode(e4Fen, [
        { move: 'e5', fen: e4e5Fen },
        { move: 'c5', fen: e4c5Fen }
      ]),
      [d4Fen]: createMockNode(d4Fen, [
        { move: 'd5', fen: d4d5Fen }
      ]),
      [e4e5Fen]: createMockNode(e4e5Fen), // leaf
      [e4c5Fen]: createMockNode(e4c5Fen), // leaf
      [d4d5Fen]: createMockNode(d4d5Fen)  // leaf
    }

    // Simulate events being recorded over time
    const baseTime = Date.now() - 60000
    session.events = [
      createMockEvent(e4Fen, baseTime + 1000, 'e4'),      // earliest
      createMockEvent(d4Fen, baseTime + 5000, 'd4'),      // later
      createMockEvent(e4e5Fen, baseTime + 10000, 'e5'),   // even later
      createMockEvent(e4c5Fen, baseTime + 20000, 'c5'),   // much later
      createMockEvent(d4d5Fen, baseTime + 30000, 'd5'),   // latest
    ]

    const result = findLatestLeafNode(session)
    
    // Should return d4d5Fen (latest timestamp)
    expect(result).not.toBeNull()
    expect(result?.fen).toBe(d4d5Fen)
  })
})