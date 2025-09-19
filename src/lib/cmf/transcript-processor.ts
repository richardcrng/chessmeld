import { type WhisperXResponse, type WhisperXSegment, type WhisperXWord, type EnhancedTextEvent } from './transcript-types';
import { type TextEvent } from './types';

/**
 * Convert WhisperX API response to CMF text events with word-level timing
 * Handles both the full API response format and the direct output format
 */
export function whisperXToTextEvents(
  whisperXResponse: WhisperXResponse | any,
  defaultFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
): EnhancedTextEvent[] {
  // Handle both response formats
  const segments = whisperXResponse.output?.segments || whisperXResponse.segments;
  
  if (!Array.isArray(segments)) {
    throw new Error('Invalid WhisperX response: segments not found');
  }
  
  return segments.map((segment): EnhancedTextEvent => ({
    t: Math.round(segment.start * 1000), // Convert seconds to milliseconds
    type: 'text',
    fen: defaultFen, // Default FEN - should be overridden based on context
    text: segment.text.trim(),
    words: segment.words.map((word: any): WhisperXWord => ({
      start: word.start,
      end: word.end,
      word: word.word,
      score: word.score
    })),
    endTime: Math.round(segment.end * 1000) // Convert seconds to milliseconds
  }));
}

/**
 * Convert WhisperX segments to basic CMF text events (without word-level timing)
 * Useful for backward compatibility
 * Handles both the full API response format and the direct output format
 */
export function whisperXToBasicTextEvents(
  whisperXResponse: WhisperXResponse | any,
  defaultFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
): TextEvent[] {
  // Handle both response formats
  const segments = whisperXResponse.output?.segments || whisperXResponse.segments;
  
  if (!Array.isArray(segments)) {
    throw new Error('Invalid WhisperX response: segments not found');
  }
  
  return segments.map((segment): TextEvent => ({
    t: Math.round(segment.start * 1000), // Convert seconds to milliseconds
    type: 'text',
    fen: defaultFen,
    text: segment.text.trim()
  }));
}

/**
 * Get the current word being spoken at a given timestamp
 */
export function getCurrentWord(
  textEvents: EnhancedTextEvent[],
  currentTimeMs: number
): { word: WhisperXWord; segmentIndex: number; wordIndex: number } | null {
  for (let segmentIndex = 0; segmentIndex < textEvents.length; segmentIndex++) {
    const event = textEvents[segmentIndex];
    if (!event.words) continue;
    
    const currentTimeSeconds = currentTimeMs / 1000;
    
    for (let wordIndex = 0; wordIndex < event.words.length; wordIndex++) {
      const word = event.words[wordIndex];
      
      if (currentTimeSeconds >= word.start && currentTimeSeconds <= word.end) {
        return { word, segmentIndex, wordIndex };
      }
    }
  }
  
  return null;
}

/**
 * Get all words that should be highlighted at a given timestamp
 * Returns words that are currently being spoken or have been spoken
 */
export function getHighlightedWords(
  textEvents: EnhancedTextEvent[],
  currentTimeMs: number
): Array<{ word: WhisperXWord; segmentIndex: number; wordIndex: number; isActive: boolean }> {
  const highlightedWords: Array<{ word: WhisperXWord; segmentIndex: number; wordIndex: number; isActive: boolean }> = [];
  const currentTimeSeconds = currentTimeMs / 1000;
  
  for (let segmentIndex = 0; segmentIndex < textEvents.length; segmentIndex++) {
    const event = textEvents[segmentIndex];
    if (!event.words) continue;
    
    for (let wordIndex = 0; wordIndex < event.words.length; wordIndex++) {
      const word = event.words[wordIndex];
      
      if (currentTimeSeconds >= word.start) {
        const isActive = currentTimeSeconds >= word.start && currentTimeSeconds <= word.end;
        highlightedWords.push({ word, segmentIndex, wordIndex, isActive });
      }
    }
  }
  
  return highlightedWords;
}

/**
 * Calculate the total duration of the transcript in milliseconds
 * Handles both the full API response format and the direct output format
 */
export function getTranscriptDuration(whisperXResponse: WhisperXResponse | any): number {
  // Handle both response formats
  const segments = whisperXResponse.output?.segments || whisperXResponse.segments;
  
  if (!Array.isArray(segments) || segments.length === 0) return 0;
  
  const lastSegment = segments[segments.length - 1];
  return Math.round(lastSegment.end * 1000); // Convert seconds to milliseconds
}

/**
 * Find the segment that contains a given timestamp
 */
export function findSegmentAtTime(
  textEvents: EnhancedTextEvent[],
  currentTimeMs: number
): { event: EnhancedTextEvent; index: number } | null {
  for (let i = 0; i < textEvents.length; i++) {
    const event = textEvents[i];
    const startTime = event.t;
    const endTime = event.endTime || startTime;
    
    if (currentTimeMs >= startTime && currentTimeMs <= endTime) {
      return { event, index: i };
    }
  }
  
  return null;
}

/**
 * Clean and normalize transcript text
 */
export function cleanTranscriptText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s.,!?;:'"-]/g, '') // Remove special characters except basic punctuation
    .trim();
}

/**
 * Validate WhisperX response structure
 * Handles both the full API response format and the direct output format
 * Also handles responses with additional fields like detected_language
 */
export function validateWhisperXResponse(response: any): response is WhisperXResponse {
  // Check if it's the full API response format
  if (response && typeof response === 'object' && response.output) {
    return (
      Array.isArray(response.output.segments) &&
      response.output.segments.every((segment: any) =>
        typeof segment === 'object' &&
        typeof segment.start === 'number' &&
        typeof segment.end === 'number' &&
        typeof segment.text === 'string' &&
        Array.isArray(segment.words) &&
        segment.words.every((word: any) =>
          typeof word === 'object' &&
          typeof word.start === 'number' &&
          typeof word.end === 'number' &&
          typeof word.word === 'string' &&
          typeof word.score === 'number'
        )
      )
    );
  }
  
  // Check if it's the direct output format (from Replicate API)
  // This includes responses with additional fields like detected_language
  if (response && typeof response === 'object' && Array.isArray(response.segments)) {
    return response.segments.every((segment: any) =>
      typeof segment === 'object' &&
      typeof segment.start === 'number' &&
      typeof segment.end === 'number' &&
      typeof segment.text === 'string' &&
      Array.isArray(segment.words) &&
      segment.words.every((word: any) =>
        typeof word === 'object' &&
        typeof word.start === 'number' &&
        typeof word.end === 'number' &&
        typeof word.word === 'string' &&
        typeof word.score === 'number'
      )
    );
  }
  
  return false;
}

/**
 * Prepare WhisperX data for separate transcript file storage
 * This preserves the full rich data structure for word-level timestamps
 */
export function prepareTranscriptFile(whisperXResponse: WhisperXResponse | any): any {
  // Return the full response structure to preserve all metadata
  return {
    ...whisperXResponse,
    // Add metadata about when this transcript was processed
    processedAt: new Date().toISOString(),
    version: '1.0.0'
  };
}

/**
 * Extract basic text events for CMF from WhisperX data
 * This creates sentence-level events without word-level timing for cleaner CMF files
 */
export function extractBasicTextEventsForCMF(
  whisperXResponse: WhisperXResponse | any,
  fenMapping?: Map<number, string> // Optional mapping of segment index to FEN
): TextEvent[] {
  const segments = whisperXResponse.output?.segments || whisperXResponse.segments;
  
  if (!Array.isArray(segments)) {
    throw new Error('Invalid WhisperX response: segments not found');
  }
  
  return segments.map((segment, index): TextEvent => {
    const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const fen = fenMapping?.get(index) || defaultFen;
    
    return {
      t: Math.round(segment.start * 1000), // Convert seconds to milliseconds
      type: 'text',
      fen,
      text: cleanTranscriptText(segment.text)
    };
  });
}

/**
 * Re-segment large transcript segments into smaller chunks for better mobile display
 * Uses word-level timestamps to create natural break points
 */
export function resegmentTranscriptForMobile(
  textEvents: EnhancedTextEvent[],
  maxWordsPerSegment: number = 25,
  maxSegmentDurationMs: number = 8000
): EnhancedTextEvent[] {
  const resegmentedEvents: EnhancedTextEvent[] = [];
  
  for (const event of textEvents) {
    if (!event.words || event.words.length <= maxWordsPerSegment) {
      // Segment is already small enough, keep as is
      resegmentedEvents.push(event);
      continue;
    }
    
    // Check if segment duration is reasonable
    const segmentDuration = (event.endTime || event.t) - event.t;
    
    if (segmentDuration <= maxSegmentDurationMs && event.words.length <= maxWordsPerSegment * 1.5) {
      // Duration is reasonable, keep as is
      resegmentedEvents.push(event);
      continue;
    }
    
    // Split the segment using hybrid chunking strategy
    const words = event.words;
    let currentChunkStart = 0;
    
    while (currentChunkStart < words.length) {
      let chunkEnd = findOptimalChunkEnd(words, currentChunkStart, maxWordsPerSegment, maxSegmentDurationMs);
      
      // Extract words for this chunk
      const chunkWords = words.slice(currentChunkStart, chunkEnd);
      const chunkText = chunkWords.map(w => w.word).join(' ');
      
      // Calculate timing for this chunk
      const chunkStartTime = chunkWords[0].start * 1000;
      const chunkEndTime = chunkWords[chunkWords.length - 1].end * 1000;
      
      // Create new segment
      const newSegment: EnhancedTextEvent = {
        t: Math.round(chunkStartTime),
        type: 'text',
        fen: event.fen,
        text: chunkText,
        words: chunkWords.map(w => ({
          start: w.start,
          end: w.end,
          word: w.word,
          score: w.score
        })),
        endTime: Math.round(chunkEndTime)
      };
      
      resegmentedEvents.push(newSegment);
      currentChunkStart = chunkEnd;
    }
  }
  
  return resegmentedEvents;
}

/**
 * Find the optimal end point for a chunk using hybrid strategy:
 * 1. Try to end at sentence-ending punctuation (., !, ?)
 * 2. If chunk would be >8 seconds, break at clause punctuation (;, :)
 * 3. If still too long, break at commas that separate ideas
 * 4. Fallback to word count: 15-20 words per chunk
 * 5. Never break mid-word or at articles (a, an, the)
 */
function findOptimalChunkEnd(
  words: any[],
  startIndex: number,
  maxWords: number,
  maxDurationMs: number
): number {
  const minWords = 15; // Minimum words per chunk (increased)
  const maxWordsWithBuffer = Math.min(maxWords, 20); // Cap at 20 words (increased)
  
  // Start with the maximum possible end point
  let chunkEnd = Math.min(startIndex + maxWordsWithBuffer, words.length);
  
  // Strategy 1: Try to end at sentence-ending punctuation (., !, ?)
  for (let i = chunkEnd - 1; i >= startIndex + minWords; i--) {
    const word = words[i];
    if (word.word.match(/[.!?]$/)) {
      chunkEnd = i + 1;
      break;
    }
  }
  
  // Strategy 2: Check duration - if >4 seconds, try to break at clause punctuation (;, :)
  const chunkDuration = (words[chunkEnd - 1].end - words[startIndex].start) * 1000;
  if (chunkDuration > maxDurationMs) {
    for (let i = chunkEnd - 1; i >= startIndex + minWords; i--) {
      const word = words[i];
      if (word.word.match(/[;:]$/)) {
        chunkEnd = i + 1;
        break;
      }
    }
  }
  
  // Strategy 3: If still too long, try to break at commas that separate ideas
  const finalChunkDuration = (words[chunkEnd - 1].end - words[startIndex].start) * 1000;
  if (finalChunkDuration > maxDurationMs) {
    for (let i = chunkEnd - 1; i >= startIndex + minWords; i--) {
      const word = words[i];
      if (word.word.match(/,$/)) {
        // Only break at comma if it's not followed by a conjunction
        const nextWord = words[i + 1];
        if (nextWord && !nextWord.word.match(/^(and|but|so|because|however|therefore)$/i)) {
          chunkEnd = i + 1;
          break;
        }
      }
    }
  }
  
  // Strategy 4: Ensure we don't break at articles (a, an, the)
  if (chunkEnd > startIndex + 1) {
    const lastWord = words[chunkEnd - 1];
    if (lastWord.word.match(/^(a|an|the)$/i)) {
      chunkEnd = Math.max(startIndex + minWords, chunkEnd - 1);
    }
  }
  
  // Strategy 5: Ensure minimum word count
  if (chunkEnd - startIndex < minWords) {
    chunkEnd = Math.min(startIndex + minWords, words.length);
  }
  
  return chunkEnd;
}

/**
 * Create a transcript file name based on the CMF file name
 */
export function generateTranscriptFileName(cmfFileName: string): string {
  // Remove .cmf.json extension and add .transcript.json
  const baseName = cmfFileName.replace(/\.cmf\.json$/, '');
  return `${baseName}.transcript.json`;
}

/**
 * Create a transcript URL relative to the CMF file location
 */
export function generateTranscriptUrl(cmfFileName: string, baseUrl?: string): string {
  const transcriptFileName = generateTranscriptFileName(cmfFileName);
  
  if (baseUrl) {
    return `${baseUrl}/${transcriptFileName}`;
  }
  
  // Default to relative path
  return `./${transcriptFileName}`;
}
