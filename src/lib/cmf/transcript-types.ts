/**
 * TypeScript types for WhisperX transcript output format
 * Based on the Replicate WhisperX API response structure
 */

/**
 * A single word in the transcript with precise timing information
 */
export interface WhisperXWord {
  /**
   * Start time of the word in seconds
   */
  start: number;
  /**
   * End time of the word in seconds
   */
  end: number;
  /**
   * The word text
   */
  word: string;
  /**
   * Confidence score for the word (0-1)
   */
  score: number;
}

/**
 * A segment of transcribed text with word-level timing
 */
export interface WhisperXSegment {
  /**
   * Start time of the segment in seconds
   */
  start: number;
  /**
   * End time of the segment in seconds
   */
  end: number;
  /**
   * The full text of the segment
   */
  text: string;
  /**
   * Array of words with individual timing information
   */
  words: WhisperXWord[];
}

/**
 * The output structure from WhisperX API
 */
export interface WhisperXOutput {
  /**
   * Array of transcript segments
   */
  segments: WhisperXSegment[];
}

/**
 * The complete WhisperX API response structure
 * This can be either the full API response or a simplified response with segments
 */
export interface WhisperXResponse {
  /**
   * API response metadata (optional for simplified responses)
   */
  completed_at?: string;
  created_at?: string;
  data_removed?: boolean;
  error?: string | null;
  id?: string;
  input?: {
    debug: boolean;
    vad_onset: number;
    audio_file: string;
    batch_size: number;
    vad_offset: number;
    diarization: boolean;
    temperature: number;
    align_output: boolean;
    language_detection_min_prob: number;
    language_detection_max_tries: number;
  };
  logs?: string;
  metrics?: {
    predict_time: number;
    total_time: number;
  };
  /**
   * The actual transcript data (for full API responses)
   */
  output?: WhisperXOutput;
  /**
   * Direct segments (for simplified responses)
   */
  segments?: WhisperXSegment[];
  /**
   * Detected language (optional field that may be present)
   */
  detected_language?: string;
}

/**
 * Enhanced text event with word-level timing information
 * Extends the base TextEvent to include transcript data
 */
export interface EnhancedTextEvent {
  /**
   * Timestamp in milliseconds when this event occurs (segment start)
   */
  t: number;
  type: "text";
  /**
   * The FEN string of the position this event relates to
   */
  fen: string;
  /**
   * The textual content to display
   */
  text: string;
  /**
   * Optional word-level timing data from transcript
   */
  words?: WhisperXWord[];
  /**
   * Optional segment end time in milliseconds
   */
  endTime?: number;
}
