# Component Library

This document describes the component library and UI system used in the Chessmeld unified application.

## 🎨 Design System

### Base UI Components (shadcn/ui)

The application uses shadcn/ui components as the foundation:

```typescript
// Base components available
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
```

### Styling Approach

- **Tailwind CSS v4**: Utility-first styling
- **CSS Variables**: For theming and customization
- **Component Variants**: Using Class Variance Authority (CVA)
- **Responsive Design**: Mobile-first approach

## 🏗️ Core Components

### Chess Board Components

#### `GraphChessBoard`

Interactive chess board with timeline navigation.

```typescript
interface GraphChessBoardProps {
  meld: MeldV0_0_1;
  currentTime: number;
  onTimeChange: (time: number) => void;
  onMoveSelect: (move: MoveEvent) => void;
  annotations?: AnnotationState;
  legalPolicy?: LegalPolicy;
}

// Usage
<GraphChessBoard
  meld={meld}
  currentTime={currentTime}
  onTimeChange={setCurrentTime}
  onMoveSelect={handleMoveSelect}
  annotations={annotations}
  legalPolicy="strict"
/>
```

**Features:**
- Interactive piece movement
- Timeline synchronization
- Annotation display (arrows, highlights)
- Legal move validation
- Keyboard navigation

#### `GraphChessBoardSimple`

Simplified chess board for basic display.

```typescript
interface GraphChessBoardSimpleProps {
  position: string; // FEN string
  onMove?: (move: string) => void;
  annotations?: {
    arrows: ColoredArrow[];
    squares: ColoredSquare[];
  };
  legalPolicy?: LegalPolicy;
}
```

### Player Components

#### `Player`

Main chess lesson player component.

```typescript
interface PlayerProps {
  meld: MeldV0_0_1;
  mode?: 'learn' | 'explore' | 'sandbox';
  onComplete?: () => void;
}

// Usage
<Player
  meld={lessonData}
  mode="learn"
  onComplete={() => console.log('Lesson completed')}
/>
```

**Features:**
- Timeline controls (play, pause, seek)
- Move history navigation
- Audio synchronization
- Interactive annotations
- Progress tracking

#### `TranscriptDisplay`

Displays synchronized text from audio transcription.

```typescript
interface TranscriptDisplayProps {
  events: TextEvent[];
  currentTime: number;
  onTimeClick: (time: number) => void;
}

// Usage
<TranscriptDisplay
  events={textEvents}
  currentTime={currentTime}
  onTimeClick={setCurrentTime}
/>
```

### Studio Components

#### `AudioRecorder`

Records audio for lesson creation.

```typescript
interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onTranscriptionComplete: (transcript: string) => void;
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
}

// Usage
<AudioRecorder
  onRecordingComplete={handleAudioComplete}
  onTranscriptionComplete={handleTranscriptComplete}
  isRecording={isRecording}
  onRecordingChange={setIsRecording}
/>
```

#### `AudioUploader`

Uploads audio files for transcription.

```typescript
interface AudioUploaderProps {
  onUploadComplete: (transcript: WhisperXResponse) => void;
  onUploadError: (error: string) => void;
  acceptedFormats?: string[];
  maxFileSize?: number;
}

// Usage
<AudioUploader
  onUploadComplete={handleUploadComplete}
  onUploadError={handleUploadError}
  acceptedFormats={['audio/wav', 'audio/mp3']}
  maxFileSize={25 * 1024 * 1024}
/>
```

#### `TranscriptionPanel`

Manages transcription workflow.

```typescript
interface TranscriptionPanelProps {
  audioBlob?: Blob;
  onTranscriptionComplete: (events: TextEvent[]) => void;
  onError: (error: string) => void;
}

// Usage
<TranscriptionPanel
  audioBlob={recordedAudio}
  onTranscriptionComplete={handleTranscriptionComplete}
  onError={handleError}
/>
```

#### `MetadataForm`

Form for editing lesson metadata.

```typescript
interface MetadataFormProps {
  metadata: Metadata;
  onChange: (metadata: Metadata) => void;
  onSubmit: (metadata: Metadata) => void;
}

// Usage
<MetadataForm
  metadata={lessonMetadata}
  onChange={setLessonMetadata}
  onSubmit={handleMetadataSubmit}
/>
```

### Navigation Components

#### `EventList`

Displays timeline events with navigation.

```typescript
interface EventListProps {
  events: Event[];
  currentTime: number;
  selectedEventIndex: number | null;
  onEventSelect: (index: number) => void;
  onTimeChange: (time: number) => void;
}

// Usage
<EventList
  events={meld.events}
  currentTime={currentTime}
  selectedEventIndex={selectedIndex}
  onEventSelect={setSelectedIndex}
  onTimeChange={setCurrentTime}
/>
```

## 🎯 Custom Hooks

### `useAudioClock`

Manages audio playback timing.

```typescript
function useAudioClock(audioRef: RefObject<HTMLAudioElement>) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  return {
    currentTime,
    duration,
    isPlaying,
    play: () => audioRef.current?.play(),
    pause: () => audioRef.current?.pause(),
    seek: (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    }
  };
}
```

### `useGraphStudio`

Manages graph studio state and operations.

```typescript
function useGraphStudio(initialMeld?: MeldV0_0_1) {
  const [meld, setMeld] = useState<MeldV0_0_1 | null>(initialMeld || null);
  const [currentPosition, setCurrentPosition] = useState<string>('start');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  
  const addMove = useCallback((move: string) => {
    // Add move to meld
  }, [meld]);
  
  const addText = useCallback((text: string, timestamp: number) => {
    // Add text event to meld
  }, [meld]);
  
  return {
    meld,
    currentPosition,
    recordingState,
    addMove,
    addText,
    setRecordingState
  };
}
```

### `useRecordingStore`

Zustand store for recording state management.

```typescript
interface RecordingStore {
  isRecording: boolean;
  audioBlob: Blob | null;
  transcript: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  setAudioBlob: (blob: Blob) => void;
  setTranscript: (transcript: string) => void;
  reset: () => void;
}

const useRecordingStore = create<RecordingStore>((set) => ({
  isRecording: false,
  audioBlob: null,
  transcript: null,
  startRecording: () => set({ isRecording: true }),
  stopRecording: () => set({ isRecording: false }),
  setAudioBlob: (blob) => set({ audioBlob: blob }),
  setTranscript: (transcript) => set({ transcript }),
  reset: () => set({ isRecording: false, audioBlob: null, transcript: null })
}));
```

## 🎨 Styling Patterns

### Component Variants

Using Class Variance Authority for component variants:

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
```

### Responsive Design

```typescript
// Mobile-first responsive classes
<div className="
  flex flex-col
  md:flex-row
  lg:grid lg:grid-cols-2
  xl:grid-cols-3
">
  {/* Content */}
</div>

// Responsive chess board
<div className="
  w-full max-w-md mx-auto
  sm:max-w-lg
  md:max-w-xl
  lg:max-w-2xl
">
  <ChessBoard />
</div>
```

## 🔧 Component Development Guidelines

### 1. TypeScript First

```typescript
// ✅ Good: Proper TypeScript interfaces
interface ComponentProps {
  data: DataType;
  onAction: (value: string) => void;
  optional?: boolean;
}

// ❌ Avoid: Any types
interface ComponentProps {
  data: any;
  onAction: (value: any) => void;
}
```

### 2. Composition over Inheritance

```typescript
// ✅ Good: Composable components
<Card>
  <CardHeader>
    <CardTitle>Lesson Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Player meld={meld} />
  </CardContent>
</Card>

// ❌ Avoid: Monolithic components
<LessonCardWithPlayer meld={meld} title="Lesson Title" />
```

### 3. Error Boundaries

```typescript
// Wrap components in error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <Player meld={meld} />
</ErrorBoundary>
```

### 4. Accessibility

```typescript
// Include proper ARIA labels and keyboard navigation
<button
  aria-label="Play lesson"
  onKeyDown={handleKeyDown}
  tabIndex={0}
>
  <PlayIcon />
</button>
```

## 📚 Component Examples

### Custom Chess Board Component

```typescript
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface CustomChessBoardProps {
  position: string;
  onMove: (move: string) => void;
  annotations?: AnnotationState;
}

export function CustomChessBoard({ position, onMove, annotations }: CustomChessBoardProps) {
  const [game, setGame] = useState(new Chess(position));
  
  const handleMove = (move: string) => {
    const newGame = new Chess(game.fen());
    const result = newGame.move(move);
    
    if (result) {
      setGame(newGame);
      onMove(move);
    }
  };
  
  return (
    <div className="chess-board-container">
      <Chessboard
        position={game.fen()}
        onPieceDrop={handleMove}
        customSquareStyles={annotations?.squares}
        customArrows={annotations?.arrows}
      />
    </div>
  );
}
```

## 🔄 Migration Notes

Components were migrated from the original monorepo structure:

- **Before**: Components scattered across `packages/ui/`, `apps/web/`, `apps/studio/`
- **After**: Unified component library in `src/components/`
- **Benefits**: Shared components, consistent styling, easier maintenance

## 📖 Additional Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Chessboard Documentation](https://react-chessboard.com/)
- [Class Variance Authority](https://cva.style/docs)
