import { useState, useEffect, useMemo } from 'react';
import { 
  type WhisperXResponse, 
  type EnhancedTextEvent,
  whisperXToTextEvents,
  getCurrentWord,
  getHighlightedWords,
  validateWhisperXResponse,
  resegmentTranscriptForMobile
} from '@/lib/cmf';

interface TranscriptState {
  isLoading: boolean;
  error: string | null;
  textEvents: EnhancedTextEvent[];
  currentWord: { word: any; segmentIndex: number; wordIndex: number } | null;
  highlightedWords: Array<{ word: any; segmentIndex: number; wordIndex: number; isActive: boolean }>;
}

/**
 * Hook for loading and managing transcript data from WhisperX
 */
export function useTranscript(transcriptUrl?: string, currentTimeMs: number = 0) {
  const [transcriptState, setTranscriptState] = useState<TranscriptState>({
    isLoading: false,
    error: null,
    textEvents: [],
    currentWord: null,
    highlightedWords: []
  });

  // Load transcript data when URL changes
  useEffect(() => {
    if (!transcriptUrl) {
      setTranscriptState(prev => ({
        ...prev,
        textEvents: [],
        currentWord: null,
        highlightedWords: []
      }));
      return;
    }

    const loadTranscript = async () => {
      setTranscriptState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(transcriptUrl);
        if (!response.ok) {
          throw new Error(`Failed to load transcript: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!validateWhisperXResponse(data)) {
          throw new Error('Invalid transcript format');
        }

        const originalTextEvents = whisperXToTextEvents(data);
        
        // Apply re-segmentation for mobile devices
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        
        const textEvents = isMobile 
          ? resegmentTranscriptForMobile(originalTextEvents, 25, 8000) // Only break extremely long segments
          : originalTextEvents;
        
        setTranscriptState(prev => ({
          ...prev,
          isLoading: false,
          textEvents,
          error: null
        }));
      } catch (error) {
        setTranscriptState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load transcript',
          textEvents: []
        }));
      }
    };

    loadTranscript();
  }, [transcriptUrl]);

  // Update current word and highlighted words when time changes
  useEffect(() => {
    if (transcriptState.textEvents.length === 0) {
      setTranscriptState(prev => ({
        ...prev,
        currentWord: null,
        highlightedWords: []
      }));
      return;
    }

    const currentWord = getCurrentWord(transcriptState.textEvents, currentTimeMs);
    const highlightedWords = getHighlightedWords(transcriptState.textEvents, currentTimeMs);

    setTranscriptState(prev => ({
      ...prev,
      currentWord,
      highlightedWords
    }));
  }, [transcriptState.textEvents, currentTimeMs]);

  // Get the current segment being spoken
  const currentSegment = useMemo(() => {
    if (!transcriptState.textEvents.length) return null;
    
    for (const event of transcriptState.textEvents) {
      const startTime = event.t;
      const endTime = event.endTime || startTime;
      
      if (currentTimeMs >= startTime && currentTimeMs <= endTime) {
        return event;
      }
    }
    
    return null;
  }, [transcriptState.textEvents, currentTimeMs]);

  // Get all segments that should be visible (spoken or about to be spoken)
  const visibleSegments = useMemo(() => {
    if (!transcriptState.textEvents.length) return [];
    
    const segments: EnhancedTextEvent[] = [];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    for (const event of transcriptState.textEvents) {
      const startTime = event.t;
      const endTime = event.endTime || startTime;
      
      // Show segment if it's currently being spoken or has been spoken
      if (currentTimeMs >= startTime) {
        segments.push(event);
      }
    }
    
    // Show all segments - no limiting on mobile
    // The responsive CSS will handle the visual spacing
    
    return segments;
  }, [transcriptState.textEvents, currentTimeMs]);

  return {
    ...transcriptState,
    currentSegment,
    visibleSegments,
    hasTranscript: transcriptState.textEvents.length > 0
  };
}
