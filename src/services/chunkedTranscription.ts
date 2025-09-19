export interface AudioChunk {
  id: string
  blob: Blob
  startTime: number
  endTime: number
  timestamp: number
}

export interface ChunkedTranscriptionResult {
  text: string
  segments: TranscriptionSegment[]
  chunks: AudioChunk[]
  totalDuration: number
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
  confidence: number
  chunkId?: string
}

export class ChunkedTranscriptionService {
  private chunkDuration = 30000 // 30 seconds in milliseconds
  private overlapDuration = 5000 // 5 seconds overlap
  private chunks: AudioChunk[] = []
  private isRecording = false
  private mediaRecorder: MediaRecorder | null = null
  private audioStream: MediaStream | null = null

  async startRealTimeRecording(): Promise<void> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      this.isRecording = true
      this.chunks = []
      
      // Set up chunking
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.processAudioChunk(event.data)
        }
      }
      
      // Start recording with time slices for chunking
      this.mediaRecorder.start(this.chunkDuration)
      
      console.log('Real-time chunked recording started')
    } catch (error) {
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
      this.isRecording = false
    }
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop())
      this.audioStream = null
    }
    
    console.log('Real-time chunked recording stopped')
  }

  private processAudioChunk(data: Blob): void {
    const chunkId = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const timestamp = Date.now()
    
    const chunk: AudioChunk = {
      id: chunkId,
      blob: data,
      startTime: timestamp - this.chunkDuration,
      endTime: timestamp,
      timestamp
    }
    
    this.chunks.push(chunk)
    console.log(`Processed audio chunk: ${chunkId} (${data.size} bytes)`)
  }

  async transcribeChunks(): Promise<ChunkedTranscriptionResult> {
    if (this.chunks.length === 0) {
      throw new Error('No audio chunks to transcribe')
    }

    console.log(`Transcribing ${this.chunks.length} audio chunks...`)
    
    const transcriptionPromises = this.chunks.map(chunk => 
      this.transcribeSingleChunk(chunk)
    )
    
    const results = await Promise.all(transcriptionPromises)
    
    // Merge results with proper timing
    return this.mergeChunkResults(results)
  }

  private async transcribeSingleChunk(chunk: AudioChunk): Promise<{
    chunk: AudioChunk
    text: string
    segments: TranscriptionSegment[]
  }> {
    try {
      const formData = new FormData()
      formData.append('file', chunk.blob, `chunk_${chunk.id}.webm`)

      const response = await fetch('/api/transcribe/huggingface', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Chunk transcription failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Adjust timestamps to account for chunk offset
      const adjustedSegments = data.chunks?.map((segment: any) => ({
        start: chunk.startTime + (segment.start || 0),
        end: chunk.startTime + (segment.end || 0),
        text: segment.text || '',
        confidence: 0.95,
        chunkId: chunk.id
      })) || []

      return {
        chunk,
        text: data.text || '',
        segments: adjustedSegments
      }
    } catch (error) {
      console.error(`Failed to transcribe chunk ${chunk.id}:`, error)
      return {
        chunk,
        text: '',
        segments: []
      }
    }
  }

  private mergeChunkResults(results: Array<{
    chunk: AudioChunk
    text: string
    segments: TranscriptionSegment[]
  }>): ChunkedTranscriptionResult {
    // Sort by chunk timestamp
    results.sort((a, b) => a.chunk.timestamp - b.chunk.timestamp)
    
    // Merge text
    const fullText = results
      .map(result => result.text)
      .filter(text => text.trim())
      .join(' ')
    
    // Merge segments
    const allSegments = results
      .flatMap(result => result.segments)
      .sort((a, b) => a.start - b.start)
    
    // Calculate total duration
    const totalDuration = results.length > 0 
      ? Math.max(...results.map(r => r.chunk.endTime)) - results[0].chunk.startTime
      : 0
    
    return {
      text: fullText,
      segments: allSegments,
      chunks: this.chunks,
      totalDuration
    }
  }

  // Alternative: Process existing audio file in chunks
  async transcribeAudioFile(audioBlob: Blob): Promise<ChunkedTranscriptionResult> {
    console.log('Processing audio file in chunks...')
    
    // Create chunks from the audio file
    const fileChunks = await this.createAudioChunks(audioBlob)
    
    // Transcribe each chunk
    const transcriptionPromises = fileChunks.map(chunk => 
      this.transcribeSingleChunk(chunk)
    )
    
    const results = await Promise.all(transcriptionPromises)
    
    return this.mergeChunkResults(results)
  }

  private async createAudioChunks(audioBlob: Blob): Promise<AudioChunk[]> {
    // This is a simplified approach - in practice, you'd need to use Web Audio API
    // to properly split audio files by time
    const chunks: AudioChunk[] = []
    
    // For now, we'll create a single chunk for the entire file
    // In a real implementation, you'd use AudioContext to split the audio
    const chunk: AudioChunk = {
      id: `file_chunk_${Date.now()}`,
      blob: audioBlob,
      startTime: 0,
      endTime: 0, // Will be calculated from audio duration
      timestamp: Date.now()
    }
    
    chunks.push(chunk)
    return chunks
  }

  getRecordingStatus(): { isRecording: boolean; chunkCount: number } {
    return {
      isRecording: this.isRecording,
      chunkCount: this.chunks.length
    }
  }

  getChunks(): AudioChunk[] {
    return [...this.chunks]
  }

  clearChunks(): void {
    this.chunks = []
  }
}

export const chunkedTranscriptionService = new ChunkedTranscriptionService()
