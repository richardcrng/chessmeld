import { type WhisperXResponse, type EnhancedTextEvent, whisperXToTextEvents } from '@/lib/cmf';

/**
 * Save transcript data to a JSON file and return the URL
 */
export async function saveTranscriptFile(
  transcriptData: WhisperXResponse,
  filename: string = 'transcript.json'
): Promise<string> {
  // In a real implementation, you would save this to a file storage service
  // For now, we'll create a data URL that can be used directly
  const jsonString = JSON.stringify(transcriptData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // In production, you would:
  // 1. Upload the blob to your file storage service (AWS S3, etc.)
  // 2. Return the public URL
  // 3. Clean up the blob URL
  
  return url;
}

/**
 * Download transcript data as a JSON file
 */
export function downloadTranscriptFile(
  transcriptData: WhisperXResponse,
  filename: string = 'transcript.json'
): void {
  const jsonString = JSON.stringify(transcriptData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the blob URL
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename for the transcript based on the original audio file
 */
export function generateTranscriptFilename(originalFilename: string): string {
  // Remove extension and add transcript suffix
  const baseName = originalFilename.replace(/\.[^/.]+$/, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${baseName}-whisperx-${timestamp}.json`;
}

/**
 * Convert WhisperX response to CMF text events and save transcript
 */
export async function processWhisperXTranscript(
  whisperXResponse: WhisperXResponse,
  defaultFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
): Promise<{
  textEvents: EnhancedTextEvent[];
  transcriptUrl: string;
}> {
  // Convert to text events
  const textEvents = whisperXToTextEvents(whisperXResponse, defaultFen);
  
  // Save transcript file
  const transcriptUrl = await saveTranscriptFile(whisperXResponse);
  
  return {
    textEvents,
    transcriptUrl
  };
}

/**
 * Update CMF metadata with transcript URL
 */
export function updateCMFWithTranscript(
  cmf: any,
  transcriptUrl: string
): any {
  return {
    ...cmf,
    meta: {
      ...cmf.meta,
      transcriptUrl
    }
  };
}

/**
 * Validate transcript file URL
 */
export function isValidTranscriptUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load transcript data from URL
 */
export async function loadTranscriptFromUrl(url: string): Promise<WhisperXResponse | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load transcript: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data as WhisperXResponse;
  } catch (error) {
    console.error('Error loading transcript:', error);
    return null;
  }
}
