# Chess Meld Format (CMF) Specification

The Chess Meld Format is a JSON-based specification for storing interactive chess lessons with synchronized audio, moves, and annotations.

## 📋 Overview

CMF is designed to store complete chess lessons including:
- Chess positions and moves
- Audio commentary with timestamps
- Text annotations and explanations
- Interactive elements and highlights
- Metadata and lesson information

## 🏗️ Schema Structure

### Root Object

```typescript
interface ChessmeldMeldFormatCMFV001 {
  schema: "cmf.v0.0.1"
  meta: Metadata
  events: Event[]
  positions: PositionNode[]
}
```

### Metadata

```typescript
interface Metadata {
  id: string                    // Unique lesson identifier
  title: string                 // Lesson title
  author: string                // Author name
  description?: string          // Lesson description
  difficulty?: "beginner" | "intermediate" | "advanced"
  estimatedDuration?: number    // Duration in seconds
  tags?: string[]              // Searchable tags
  createdAt?: string           // ISO timestamp
  updatedAt?: string           // ISO timestamp
  version?: string             // Lesson version
  transcriptUrl?: string       // URL to audio transcript
}
```

## 🎯 Events

Events represent the timeline of the lesson. Each event has a timestamp and specific data.

### Base Event

```typescript
interface Event {
  t: number                    // Timestamp in milliseconds
  type: EventType             // Event type
  id?: string                 // Optional unique identifier
}
```

### Event Types

#### Move Events
```typescript
interface MoveEvent extends Event {
  type: "move"
  move: {
    from: string              // Source square (e.g., "e2")
    to: string                // Destination square (e.g., "e4")
    piece: string             // Piece type (e.g., "P")
    san: string               // Standard Algebraic Notation
    lan?: string              // Long Algebraic Notation
    flags?: string            // Move flags
    captured?: string         // Captured piece
    promotion?: string        // Promotion piece
  }
  positionId: string          // Reference to position node
  comment?: string            // Move comment
}
```

#### Text Events
```typescript
interface TextEvent extends Event {
  type: "text"
  text: string                // Text content
  speaker?: string            // Speaker identifier
  confidence?: number         // Transcription confidence (0-1)
}
```

#### Annotation Events
```typescript
interface AnnotateEvent extends Event {
  type: "annotate"
  annotations: {
    arrows?: ColoredArrow[]    // Arrow annotations
    squares?: ColoredSquare[]  // Square highlights
  }
}

interface ColoredArrow {
  from: string                // Start square
  to: string                  // End square
  color: string               // Arrow color
}

interface ColoredSquare {
  square: string              // Square identifier
  color: string               // Highlight color
}
```

#### Pause Events
```typescript
interface PausePointEvent extends Event {
  type: "pause"
  duration?: number           // Pause duration in ms
  reason?: string             // Reason for pause
}
```

#### Clear Events
```typescript
interface ClearAnnotationsEvent extends Event {
  type: "clear"
  target: "arrows" | "squares" | "all"
}
```

## 🏛️ Position Nodes

Position nodes store chess positions and their relationships.

```typescript
interface PositionNode {
  id: string                  // Unique position identifier
  fen: string                 // FEN string of position
  parentId?: string           // Parent position ID
  children: ChildReference[]  // Child positions
  evaluation?: PrecomputedEval // Engine evaluation
  comment?: string            // Position comment
}

interface ChildReference {
  positionId: string          // Child position ID
  move: string                // Move to reach child
  weight?: number             // Move weight/priority
}
```

### Precomputed Evaluation

```typescript
interface PrecomputedEval {
  fen: string                 // Position FEN
  depth: number               // Search depth
  score: number               // Evaluation score (centipawns)
  bestMove?: string           // Best move in SAN
  pv?: string[]               // Principal variation
  nodes?: number              // Nodes searched
  time?: number               // Search time in ms
}
```

## 📝 Example CMF File

```json
{
  "schema": "cmf.v0.0.1",
  "meta": {
    "id": "lesson-001",
    "title": "Italian Game Opening",
    "author": "GM Example",
    "description": "Introduction to the Italian Game",
    "difficulty": "beginner",
    "estimatedDuration": 300,
    "tags": ["opening", "italian-game", "e4"]
  },
  "events": [
    {
      "t": 0,
      "type": "text",
      "text": "Welcome to this lesson on the Italian Game."
    },
    {
      "t": 2000,
      "type": "move",
      "move": {
        "from": "e2",
        "to": "e4",
        "piece": "P",
        "san": "e4"
      },
      "positionId": "pos-1",
      "comment": "The most popular first move"
    },
    {
      "t": 4000,
      "type": "text",
      "text": "White starts with the king's pawn advance."
    },
    {
      "t": 6000,
      "type": "annotate",
      "annotations": {
        "squares": [
          {
            "square": "e4",
            "color": "yellow"
          }
        ]
      }
    }
  ],
  "positions": [
    {
      "id": "pos-1",
      "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      "children": [
        {
          "positionId": "pos-2",
          "move": "e5"
        }
      ]
    }
  ]
}
```

## 🔧 Utilities and Processing

### Timeline Processing

The `@/lib/renderer-core` library provides utilities for processing CMF files:

```typescript
import { buildMoveIndex, computeStateAtTime } from '@/lib/renderer-core';

// Build move index for fast lookups
const moveIndex = buildMoveIndex(meld);

// Get state at specific timestamp
const state = computeStateAtTime(meld, timestamp);
```

### Validation

```typescript
import { validateCMF } from '@/lib/cmf';

const isValid = validateCMF(meldData);
if (!isValid) {
  console.error('Invalid CMF data');
}
```

### Transcription Integration

CMF supports integration with audio transcription:

```typescript
import { whisperXToTextEvents } from '@/lib/cmf';

// Convert WhisperX transcription to text events
const textEvents = whisperXToTextEvents(whisperXResponse, defaultFen);
```

## 🎨 Rendering

### Player Integration

The chess player renders CMF files with:

- **Timeline Navigation**: Jump to any timestamp
- **Move Visualization**: Animated piece movements
- **Annotation Display**: Arrows and square highlights
- **Audio Synchronization**: Sync with audio commentary
- **Interactive Controls**: Play, pause, seek

### Studio Integration

The studio app creates CMF files through:

- **Audio Recording**: Record lesson commentary
- **Move Input**: Add chess moves via board interaction
- **Annotation Tools**: Add arrows and highlights
- **Text Editing**: Add text explanations
- **Export**: Generate CMF files

## 🔄 Version History

### v0.0.1 (Current)
- Basic event system
- Move and text events
- Position nodes
- Annotation support
- Audio transcription integration

### Future Versions
- Enhanced annotation types
- Interactive quiz support
- Multi-language support
- Advanced position analysis
- Collaborative editing

## 📚 References

- [FEN Notation](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
- [Standard Algebraic Notation](https://en.wikipedia.org/wiki/Algebraic_notation_(chess))
- [Chess.js Documentation](https://github.com/jhlywa/chess.js)
- [WhisperX Transcription](https://github.com/m-bain/whisperX)
