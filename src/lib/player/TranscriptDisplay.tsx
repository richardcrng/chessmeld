import React from 'react';
import { type EnhancedTextEvent, type WhisperXWord } from '@/lib/cmf';

interface TranscriptDisplayProps {
  segments: EnhancedTextEvent[];
  currentWord: { word: WhisperXWord; segmentIndex: number; wordIndex: number } | null;
  highlightedWords: Array<{ word: WhisperXWord; segmentIndex: number; wordIndex: number; isActive: boolean }>;
  onWordClick?: (timestampMs: number) => void;
  className?: string;
}

/**
 * Component for displaying transcript with word-level highlighting
 */
export function TranscriptDisplay({ 
  segments, 
  currentWord, 
  highlightedWords, 
  onWordClick,
  className = ''
}: TranscriptDisplayProps) {
  
  const renderWord = (
    word: WhisperXWord, 
    segmentIndex: number, 
    wordIndex: number, 
    isActive: boolean
  ) => {
    const timestampMs = Math.round(word.start * 1000);
    
    return (
      <span
        key={`${segmentIndex}-${wordIndex}`}
        className={`transcript-word ${isActive ? 'transcript-word--active' : 'transcript-word--spoken'}`}
        onClick={() => onWordClick?.(timestampMs)}
        style={{
          cursor: onWordClick ? 'pointer' : 'default'
        }}
      >
        {word.word}
      </span>
    );
  };

  const renderSegment = (segment: EnhancedTextEvent, segmentIndex: number) => {
    if (!segment.words || segment.words.length === 0) {
      // Fallback to plain text if no word-level data
      return (
        <div key={segmentIndex} className="transcript-segment">
          <span className="transcript-text">{segment.text}</span>
        </div>
      );
    }

    // Create a map of highlighted words for this segment
    const segmentHighlightedWords = highlightedWords
      .filter(hw => hw.segmentIndex === segmentIndex)
      .reduce((map, hw) => {
        map[hw.wordIndex] = hw.isActive;
        return map;
      }, {} as Record<number, boolean>);

    return (
      <div key={segmentIndex} className="transcript-segment">
        <div className="transcript-words">
          {segment.words.map((word, wordIndex) => {
            const isActive = segmentHighlightedWords[wordIndex] || false;
            return renderWord(word, segmentIndex, wordIndex, isActive);
          })}
        </div>
      </div>
    );
  };

  if (segments.length === 0) {
    return (
      <div className={`transcript-display ${className}`}>
        <div className="transcript-empty">
          No transcript available
        </div>
      </div>
    );
  }

  return (
    <div className={`transcript-display ${className}`}>
      <div className="transcript-segments">
        {segments.map((segment, index) => renderSegment(segment, index))}
      </div>
    </div>
  );
}

/**
 * Simple transcript display without word-level highlighting
 * Useful for fallback or when transcript data is not available
 */
export function SimpleTranscriptDisplay({ 
  text, 
  className = '' 
}: { 
  text: string; 
  className?: string; 
}) {
  return (
    <div className={`transcript-display transcript-display--simple ${className}`}>
      <div className="transcript-text">{text}</div>
    </div>
  );
}
