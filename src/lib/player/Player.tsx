import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { buildMoveIndex, computeStateAtTime, type MeldV0_0_1, type TimelineState } from '@/lib/renderer';
import { type MoveEvent } from '@/lib/cmf';
import { Chess } from 'chess.js';
import { useAudioClock } from './useAudioClock';
import { useTranscript } from './useTranscript';
import { TranscriptDisplay } from './TranscriptDisplay';
import { Board } from './Board';
import { MoveHistory, BranchingMoveHistory, CompactMoveHistory } from '@/lib/ui';
import { useGraphNavigation } from './useGraphNavigation';
import { FaBrain } from "react-icons/fa";
import { MdTouchApp } from "react-icons/md";
import { BiSolidChess } from "react-icons/bi";

interface ChatMessage {
  id: string;
  timestamp: number;
  text: string;
  type: 'text' | 'move' | 'system';
}

interface PlayerProps {
  meld: MeldV0_0_1;
}

type InteractionMode = 'learn' | 'explore' | 'sandbox';

// Function to derive chat history from meld events and current timestamp
function deriveChatHistory(meld: MeldV0_0_1, currentTimeMs: number): ChatMessage[] {
  const messages: ChatMessage[] = [];
  
  // Sort events by timestamp to ensure chronological order
  const sortedEvents = [...meld.events].sort((a, b) => a.t - b.t);
  
  for (const event of sortedEvents) {
    if (event.t > currentTimeMs) break;
    
    switch (event.type) {
      case 'text':
        messages.push({
          id: `text-${event.t}`,
          timestamp: event.t,
          text: event.text,
          type: 'text'
        });
        break;
        
      case 'move':
        const moveText = 'comment' in event && event.comment 
          ? `${event.san} - ${event.comment}`
          : `Move: ${event.san}`;
        messages.push({
          id: `move-${event.t}`,
          timestamp: event.t,
          text: moveText,
          type: 'move'
        });
        break;
        
      case 'pausepoint':
        if (event.prompt) {
          messages.push({
            id: `pause-${event.t}`,
            timestamp: event.t,
            text: `⏸️ ${event.prompt}`,
            type: 'system'
          });
        }
        break;
        
      case 'navigate':
        const navigationText = getNavigationText(event.navigationType, event.targetMoveIndex);
        messages.push({
          id: `navigate-${event.t}`,
          timestamp: event.t,
          text: `🧭 ${navigationText}`,
          type: 'system'
        });
        break;
    }
  }
  
  return messages;
}

// Helper function to format timestamp as m:ss
function formatTimestamp(timestampMs: number): string {
  const totalSeconds = Math.floor(timestampMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to get navigation text
function getNavigationText(navigationType: string, targetMoveIndex?: number): string {
  switch (navigationType) {
    case 'to_node':
      return 'Navigated to position';
    case 'to_move_index':
      return `Navigated to move ${targetMoveIndex !== undefined ? targetMoveIndex + 1 : '?'}`;
    case 'back':
      return 'Went back one move';
    case 'forward':
      return 'Went forward one move';
    case 'start':
      return 'Went to start position';
    case 'latest':
      return 'Went to latest position';
    default:
      return 'Navigated';
  }
}

// Enhanced chat log component with transcript support
function ChatLog({ 
  messages, 
  onTimestampClick, 
  transcriptData,
  currentTimeMs 
}: { 
  messages: ChatMessage[]; 
  onTimestampClick: (timestampMs: number) => void;
  transcriptData?: {
    visibleSegments: any[];
    currentWord: any;
    highlightedWords: any[];
  };
  currentTimeMs: number;
}) {
  const chatRef = useRef<HTMLDivElement>(null);
  const lastTimeMsRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  
  // Detect seeking vs normal playback progression
  useEffect(() => {
    const timeDiff = Math.abs(currentTimeMs - lastTimeMsRef.current);
    const isSeeking = timeDiff > 1000; // If time jumps more than 1 second, consider it seeking
    
    isSeekingRef.current = isSeeking;
    lastTimeMsRef.current = currentTimeMs;
  }, [currentTimeMs]);
  
  // Auto-scroll to bottom when new messages arrive, but only if user is near the bottom
  useEffect(() => {
    if (chatRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
      
      // Only auto-scroll if user is already near the bottom
      if (isNearBottom) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    }
  }, [messages, transcriptData?.visibleSegments]);
  
  // Auto-scroll to current word when seeking
  useEffect(() => {
    if (chatRef.current && transcriptData?.currentWord && isSeekingRef.current) {
      // Find the current word element and scroll to it
      const currentWordElement = chatRef.current.querySelector('.transcript-word--active');
      if (currentWordElement) {
        currentWordElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [transcriptData?.currentWord, currentTimeMs]);
  
  // If we have transcript data, show it instead of regular chat messages
  if (transcriptData && transcriptData.visibleSegments.length > 0) {
    return (
      <div className="chat-log chat-log--transcript" ref={chatRef}>
        <TranscriptDisplay
          segments={transcriptData.visibleSegments}
          currentWord={transcriptData.currentWord}
          highlightedWords={transcriptData.highlightedWords}
          onWordClick={onTimestampClick}
          className="chat-transcript"
        />
      </div>
    );
  }
  
  // Fallback to regular chat messages
  return (
    <div className="chat-log" ref={chatRef}>
      {messages.map((message) => (
        <div key={message.id} className={`chat-message chat-message--${message.type}`}>
          <div className="chat-message__content">
            {message.text}
          </div>
          <div 
            className="chat-message__timestamp"
            onClick={() => onTimestampClick(message.timestamp)}
          >
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Player({ meld }: PlayerProps) {
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('learn');
  const [sandboxFen, setSandboxFen] = useState<string | undefined>();
  const [pausedAtPausePoint, setPausedAtPausePoint] = useState<string | null>(null);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [exploreMoveIndex, setExploreMoveIndex] = useState<number>(-1); // -1 for initial position

  // Build move index once when meld changes
  const moveIndex = useMemo(() => {
    return buildMoveIndex(meld);
  }, [meld]);

  // Audio clock hook
  const { audioRef, audioClock, play, pause, seek, togglePlayPause } = useAudioClock({
    audioUrl: meld.meta.audioUrl,
    fallbackDurationMs: meld.meta.durationMs,
    onTimeUpdate: (timeMs) => {
      // Update timeline state when audio time changes (for both learn and explore modes)
      if (interactionMode === 'learn' || interactionMode === 'explore') {
        const newState = computeStateAtTime(meld, moveIndex, timeMs);
        
        
        setTimelineState(newState);
        
        // Auto-pause at pause points (only in learn mode)
        if (interactionMode === 'learn' && newState.isPaused && audioClock.isPlaying && !pausedAtPausePoint) {
          // Sort events to find the most recent pause point
          const sortedEvents = [...meld.events].sort((a, b) => a.t - b.t);
          const currentPausePoint = sortedEvents.find(
            event => event.type === 'pausepoint' && event.t <= timeMs
          );
          if (currentPausePoint && currentPausePoint.type === 'pausepoint') {
            setPausedAtPausePoint(currentPausePoint.id);
            pause();
          }
        }
        
        // Clear pause state if we've moved well past the pause point (only in learn mode)
        if (interactionMode === 'learn' && pausedAtPausePoint) {
          const pausePoint = meld.events.find(
            event => event.type === 'pausepoint' && event.id === pausedAtPausePoint
          );
          if (pausePoint && timeMs > pausePoint.t + 3000) {
            setPausedAtPausePoint(null);
          }
        }
      }
    }
  });

  // Custom seek function that preserves playing state
  const seekPreservingState = useCallback((timestamp: number) => {
    const wasPlaying = audioClock.isPlaying;
    seek(timestamp);
    // If audio was playing, keep it playing after seeking
    if (wasPlaying) {
      play();
    }
  }, [seek, play, audioClock.isPlaying]);

  // Graph navigation for explore mode
  const [graphNavigationState, graphNavigationActions] = useGraphNavigation(meld, {
    strictLegalOnly: true,
    currentTimeMs: audioClock.currentTimeMs
  });

  // Transcript hook
  const transcriptData = useTranscript(meld.meta.transcriptUrl, audioClock.currentTimeMs);

  // Timeline state
  const [timelineState, setTimelineState] = useState<TimelineState>(() => 
    computeStateAtTime(meld, moveIndex, 0)
  );

  // Find the graph node that corresponds to the current audio timeline position
  const currentGraphNodeFen = useMemo(() => {
    if (interactionMode !== 'explore') return timelineState.fen;
    
    // In explore mode, we need to find the node that represents the current position
    // The timelineState.fen represents the position after the current move
    // We need to find the corresponding graph node
    const matchingNode = Object.keys(meld.nodes).find(nodeFen => 
      meld.nodes[nodeFen]?.fen === timelineState.fen
    );
    
    return matchingNode || timelineState.fen;
  }, [interactionMode, timelineState.fen, meld.nodes]);

  // Chat history derived from current time
  const chatHistory = useMemo(() => {
    return deriveChatHistory(meld, audioClock.currentTimeMs);
  }, [meld, audioClock.currentTimeMs]);

  // Extract move events from meld and sort by timestamp
  const moveEvents = useMemo(() => {
    return meld.events
      .filter(event => event.type === 'move')
      .sort((a, b) => a.t - b.t);
  }, [meld.events]);

  // Navigation functions for explore mode
  const goToMove = (moveIndex: number) => {
    const maxIndex = moveEvents.length - 1;
    const clampedIndex = Math.max(-1, Math.min(moveIndex, maxIndex));
    setExploreMoveIndex(clampedIndex);
  };

  const goBack = () => {
    if (exploreMoveIndex > -1) {
      setExploreMoveIndex(exploreMoveIndex - 1);
    }
  };

  const goForward = () => {
    if (exploreMoveIndex < moveEvents.length - 1) {
      setExploreMoveIndex(exploreMoveIndex + 1);
    }
  };

  // Handle mode changes
  const handleModeChange = (newMode: InteractionMode) => {
    if (newMode === 'learn') {
      // Returning to learn mode - resume audio and timeline
      setInteractionMode('learn');
      setSandboxFen(undefined);
      setExploreMoveIndex(-1);
      // Timeline state will be restored by audio clock updates
    } else if (newMode === 'explore') {
      // Entering explore mode - preserve audio state and set to current position
      setSandboxFen(timelineState.fen);
      setInteractionMode(newMode);
      // Navigate to the current timeline position in the graph
      graphNavigationActions.goToNode(timelineState.fen);
    } else {
      // Entering sandbox mode - pause audio and capture current position
      pause();
      setSandboxFen(timelineState.fen);
      setInteractionMode(newMode);
      setExploreMoveIndex(-1);
    }
  };

  // Handle interactive position changes
  const handleInteractiveMove = (from: string, to: string, newFen?: string) => {
    if (interactionMode === 'sandbox') {
      // For sandbox mode, use the FEN provided by the Board component
      if (newFen) {
        setSandboxFen(newFen);
      }
    } else if (interactionMode === 'explore') {
      // Create a new chess game from current position for explore mode
      const game = new Chess(currentFen);
      
      try {
        // Explorer mode: only allow legal moves
        const move = game.move({
          from,
          to,
          promotion: 'q' // Always promote to queen for simplicity
        });
        
        if (move) {
          // Update sandbox FEN with new position
          setSandboxFen(game.fen());
        }
      } catch (error) {
        console.error('Invalid move:', error);
      }
    }
  };

  // Current board state (learn, explore, or sandbox)
  const currentFen = useMemo(() => {
    if (interactionMode === 'learn' || interactionMode === 'explore') {
      // Both learn and explore modes should show the audio timeline position
      return timelineState.fen;
    } else {
      // Sandbox mode
      return sandboxFen || timelineState.fen;
    }
  }, [interactionMode, timelineState.fen, sandboxFen]);
  
  const currentAnnotations = (interactionMode === 'learn' || interactionMode === 'explore') ? timelineState.activeAnnotations : [];
  
  // Get current game state for turn information
  const currentGame = new Chess(currentFen);

  // Auto-show transcript on mobile when new text appears
  useEffect(() => {
    if (timelineState.activeText) {
      // Check if we're on mobile (simple check)
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setTranscriptVisible(true);
      }
    }
  }, [timelineState.activeText]);

  // Calculate progress percentage
  const progressPercentage = audioClock.durationMs > 0 
    ? Math.round((audioClock.currentTimeMs / audioClock.durationMs) * 100)
    : 0;

  return (
    <div className={`player ${interactionMode === 'explore' ? 'player--explore' : ''}`}>
      {/* Audio element (hidden) */}
      <audio
        ref={audioRef}
        src={meld.meta.audioUrl}
        preload="metadata"
      />

      {/* Top bar with lesson title and progress */}
      <div className="lesson-header">
        <div className="lesson-title">{meld.meta.title}</div>
        <div className="lesson-progress">{progressPercentage}% complete</div>
      </div>

      {/* Main content area */}
      <div className={`player-content ${interactionMode === 'explore' ? 'player-content--explore' : ''}`}>
        {/* Board with annotations */}
        <div className={`board-container ${interactionMode === 'sandbox' ? 'board-container--sandbox' : ''}`}>
          <Board 
            fen={currentFen} 
            interactive={interactionMode !== 'learn'}
            onMove={interactionMode !== 'learn' ? handleInteractiveMove : undefined}
            mode={interactionMode}
            annotations={currentAnnotations}
          />
        </div>

        {/* Chat log or Move History */}
        {interactionMode === 'learn' && (
          <ChatLog 
            messages={chatHistory} 
            onTimestampClick={seek}
            transcriptData={transcriptData.hasTranscript ? {
              visibleSegments: transcriptData.visibleSegments,
              currentWord: transcriptData.currentWord,
              highlightedWords: transcriptData.highlightedWords
            } : undefined}
            currentTimeMs={audioClock.currentTimeMs}
          />
        )}
        {interactionMode === 'explore' && (
          <CompactMoveHistory
            meld={meld}
            currentFen={currentGraphNodeFen}
            onNodeClick={graphNavigationActions.goToNode}
            mainlinePath={graphNavigationState.mainlinePath}
            mainlineMoves={graphNavigationState.mainlineMoves}
            availableMoves={graphNavigationState.availableMoves}
            strictLegalOnly={true}
            className="explore-move-history"
            onAudioSeek={seekPreservingState}
          />
        )}

        {/* Pause point prompt */}
        {pausedAtPausePoint && (
          <div className="pause-prompt">
            <p>{timelineState.pausePrompt || "Paused for exploration"}</p>
            <button onClick={() => {
              setPausedAtPausePoint(null);
              play();
            }}>Continue</button>
          </div>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className={`bottom-nav ${interactionMode === 'explore' ? 'bottom-nav--sticky' : ''}`}>
        <div className="mode-toggle">
          <button 
            className={`mode-button learn ${interactionMode === 'learn' ? 'active' : ''}`}
            onClick={() => handleModeChange('learn')}
          >
            <div className="mode-icon"><FaBrain /></div>
            <span>Learn</span>
          </button>
          
          <button 
            className={`mode-button explore ${interactionMode === 'explore' ? 'active' : ''}`}
            onClick={() => handleModeChange('explore')}
          >
            <div className="mode-icon"><MdTouchApp /></div>
            <span>Explore</span>
          </button>
          
          <button 
            className={`mode-button sandbox ${interactionMode === 'sandbox' ? 'active' : ''}`}
            onClick={() => handleModeChange('sandbox')}
          >
            <div className="mode-icon"><BiSolidChess /></div>
            <span>Sandbox</span>
          </button>
        </div>

        {/* Mode-specific controls or messages */}
        {interactionMode === 'learn' || interactionMode === 'explore' ? (
          <div className="lesson-controls">
            <button className="control-btn prev" onClick={() => {
              const newTime = Math.max(0, audioClock.currentTimeMs - 5000);
              if (isFinite(newTime)) seekPreservingState(newTime);
            }}>
              <span>‹</span>
            </button>
            
            <button className="control-btn play-pause" onClick={togglePlayPause}>
              {audioClock.isPlaying ? <span>⏸</span> : <span>▶</span>}
            </button>
            
            <button className="control-btn next" onClick={() => {
              const newTime = Math.min(audioClock.durationMs, audioClock.currentTimeMs + 5000);
              if (isFinite(newTime)) seekPreservingState(newTime);
            }}>
              <span>›</span>
            </button>
            
            <div 
              className="progress-bar"
              onClick={(e) => {
                if (audioClock.durationMs <= 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickPercentage = clickX / rect.width;
                const targetTimeMs = clickPercentage * audioClock.durationMs;
                if (isFinite(targetTimeMs)) seekPreservingState(targetTimeMs);
              }}
            >
              <div 
                className="progress-fill" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mode-message">
            <div className="mode-instruction">
              Move pieces entirely freely
            </div>
            <button 
              className="continue-meld-btn"
              onClick={() => {
                handleModeChange('learn');
                play();
              }}
            >
              or Continue Meld
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
