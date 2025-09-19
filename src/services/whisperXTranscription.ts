import { type WhisperXResponse, type EnhancedTextEvent, whisperXToTextEvents, validateWhisperXResponse } from '@/lib/cmf';

export interface WhisperXTranscriptionResult {
  text: string;
  segments: any[];
  confidence: number;
  language: string;
  duration: number;
  whisperXData: WhisperXResponse;
  enhancedTextEvents: EnhancedTextEvent[];
  metadata?: {
    originalFileName: string;
    fileSize: number;
    fileType: string;
    processedAt: string;
  };
}

export class WhisperXTranscriptionService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async transcribe(audioBlob: Blob): Promise<WhisperXTranscriptionResult> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    const response = await fetch(`${this.baseUrl}/api/transcribe/whisperx`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`WhisperX transcription failed: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid response from WhisperX service');
    }

    const whisperXData = result.data;
    
    if (!validateWhisperXResponse(whisperXData)) {
      throw new Error('Invalid WhisperX response format');
    }

    // Convert to enhanced text events
    const enhancedTextEvents = whisperXToTextEvents(whisperXData);
    
    // Extract basic information from the output
    // Handle both response formats: full API response or direct output
    const segments = whisperXData.output?.segments || whisperXData.segments;
    const text = segments.map((segment: any) => segment.text).join(' ');
    const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;
    
    return {
      text,
      segments,
      confidence: 0.95, // WhisperX typically has high confidence
      language: whisperXData.detected_language || 'en', // Use detected language if available
      duration,
      whisperXData,
      enhancedTextEvents,
      // Include metadata from the API response
      metadata: result.metadata
    };
  }

  async checkPredictionStatus(predictionId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/transcribe/whisperx?id=${predictionId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to check prediction status: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Convert WhisperX result to basic text events for compatibility
   */
  toBasicTextEvents(whisperXResult: WhisperXTranscriptionResult): any[] {
    return whisperXResult.enhancedTextEvents.map(event => ({
      t: event.t,
      type: 'text',
      text: event.text,
      fen: event.fen
    }));
  }

  /**
   * Get word-level timing information for a specific timestamp
   */
  getWordAtTime(whisperXResult: WhisperXTranscriptionResult, timeMs: number): any | null {
    const timeSeconds = timeMs / 1000;
    
    // Handle both response formats
    const segments = whisperXResult.whisperXData.output?.segments || whisperXResult.whisperXData.segments;
    
    for (const segment of segments) {
      for (const word of segment.words) {
        if (timeSeconds >= word.start && timeSeconds <= word.end) {
          return {
            word: word.word,
            start: word.start,
            end: word.end,
            score: word.score,
            segment: segment
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Get all words that should be highlighted at a given time
   */
  getHighlightedWords(whisperXResult: WhisperXTranscriptionResult, timeMs: number): any[] {
    const timeSeconds = timeMs / 1000;
    const highlightedWords: any[] = [];
    
    // Handle both response formats
    const segments = whisperXResult.whisperXData.output?.segments || whisperXResult.whisperXData.segments;
    
    for (const segment of segments) {
      for (const word of segment.words) {
        if (timeSeconds >= word.start) {
          highlightedWords.push({
            word: word.word,
            start: word.start,
            end: word.end,
            score: word.score,
            isActive: timeSeconds >= word.start && timeSeconds <= word.end,
            segment: segment
          });
        }
      }
    }
    
    return highlightedWords;
  }
}

export const whisperXTranscriptionService = new WhisperXTranscriptionService();
