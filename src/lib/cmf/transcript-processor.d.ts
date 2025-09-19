import { type WhisperXResponse, type WhisperXWord, type EnhancedTextEvent } from './transcript-types';
import { type TextEvent } from './types';
/**
 * Convert WhisperX API response to CMF text events with word-level timing
 * Handles both the full API response format and the direct output format
 */
export declare function whisperXToTextEvents(whisperXResponse: WhisperXResponse | any, defaultFen?: string): EnhancedTextEvent[];
/**
 * Convert WhisperX segments to basic CMF text events (without word-level timing)
 * Useful for backward compatibility
 * Handles both the full API response format and the direct output format
 */
export declare function whisperXToBasicTextEvents(whisperXResponse: WhisperXResponse | any, defaultFen?: string): TextEvent[];
/**
 * Get the current word being spoken at a given timestamp
 */
export declare function getCurrentWord(textEvents: EnhancedTextEvent[], currentTimeMs: number): {
    word: WhisperXWord;
    segmentIndex: number;
    wordIndex: number;
} | null;
/**
 * Get all words that should be highlighted at a given timestamp
 * Returns words that are currently being spoken or have been spoken
 */
export declare function getHighlightedWords(textEvents: EnhancedTextEvent[], currentTimeMs: number): Array<{
    word: WhisperXWord;
    segmentIndex: number;
    wordIndex: number;
    isActive: boolean;
}>;
/**
 * Calculate the total duration of the transcript in milliseconds
 * Handles both the full API response format and the direct output format
 */
export declare function getTranscriptDuration(whisperXResponse: WhisperXResponse | any): number;
/**
 * Find the segment that contains a given timestamp
 */
export declare function findSegmentAtTime(textEvents: EnhancedTextEvent[], currentTimeMs: number): {
    event: EnhancedTextEvent;
    index: number;
} | null;
/**
 * Clean and normalize transcript text
 */
export declare function cleanTranscriptText(text: string): string;
/**
 * Validate WhisperX response structure
 * Handles both the full API response format and the direct output format
 * Also handles responses with additional fields like detected_language
 */
export declare function validateWhisperXResponse(response: any): response is WhisperXResponse;
/**
 * Prepare WhisperX data for separate transcript file storage
 * This preserves the full rich data structure for word-level timestamps
 */
export declare function prepareTranscriptFile(whisperXResponse: WhisperXResponse | any): any;
/**
 * Extract basic text events for CMF from WhisperX data
 * This creates sentence-level events without word-level timing for cleaner CMF files
 */
export declare function extractBasicTextEventsForCMF(whisperXResponse: WhisperXResponse | any, fenMapping?: Map<number, string>): TextEvent[];
/**
 * Re-segment large transcript segments into smaller chunks for better mobile display
 * Uses word-level timestamps to create natural break points
 */
export declare function resegmentTranscriptForMobile(textEvents: EnhancedTextEvent[], maxWordsPerSegment?: number, maxSegmentDurationMs?: number): EnhancedTextEvent[];
/**
 * Create a transcript file name based on the CMF file name
 */
export declare function generateTranscriptFileName(cmfFileName: string): string;
/**
 * Create a transcript URL relative to the CMF file location
 */
export declare function generateTranscriptUrl(cmfFileName: string, baseUrl?: string): string;
//# sourceMappingURL=transcript-processor.d.ts.map