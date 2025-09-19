export interface TranscriptionProvider {
  name: string
  transcribe: (audioBlob: Blob) => Promise<TranscriptionResult>
}

export interface TranscriptionResult {
  text: string
  segments: TranscriptionSegment[]
  confidence: number
  language: string
  duration: number
}

export interface TranscriptionSegment {
  start: number // milliseconds
  end: number   // milliseconds
  text: string
  confidence: number
}

export interface TextEvent {
  t: number
  type: 'text'
  text: string
}

export class TranscriptionService {
  private providers: Map<string, TranscriptionProvider> = new Map()

  constructor() {
    this.registerProviders()
  }

  private registerProviders() {
    // Register available providers
    if (typeof window !== 'undefined') {
      this.providers.set('whisper', new WhisperTranscriptionProvider())
      this.providers.set('huggingface', new HuggingFaceTranscriptionProvider())
      this.providers.set('whisper-wasm', new WhisperWasmTranscriptionProvider())
      this.providers.set('web-speech', new WebSpeechTranscriptionProvider())
      this.providers.set('placeholder', new PlaceholderTranscriptionProvider())
    }
  }

  async transcribe(audioBlob: Blob, provider: string = 'huggingface'): Promise<TranscriptionResult> {
    const transcriptionProvider = this.providers.get(provider)
    if (!transcriptionProvider) {
      throw new Error(`Transcription provider '${provider}' not found`)
    }

    try {
      return await transcriptionProvider.transcribe(audioBlob)
    } catch (error) {
      // If the primary provider fails, try fallback providers
      if (provider === 'huggingface' || provider === 'whisper') {
        console.warn(`${provider} transcription failed, trying fallback providers:`, error)
        return await this.transcribeWithFallback(audioBlob)
      }
      throw error
    }
  }

  private async transcribeWithFallback(audioBlob: Blob): Promise<TranscriptionResult> {
    const fallbackProviders = ['huggingface', 'whisper-wasm', 'web-speech', 'placeholder']
    
    for (const providerName of fallbackProviders) {
      const provider = this.providers.get(providerName)
      if (provider) {
        try {
          console.log(`Trying fallback provider: ${providerName}`)
          return await provider.transcribe(audioBlob)
        } catch (error) {
          console.warn(`Fallback provider ${providerName} failed:`, error)
          continue
        }
      }
    }
    
    // If all providers fail, throw a comprehensive error
    throw new Error('All transcription providers failed. Please try recording again or add text manually.')
  }

  segmentTranscript(
    result: TranscriptionResult,
    strategy: 'time' | 'sentence' | 'semantic' = 'sentence'
  ): TextEvent[] {
    switch (strategy) {
      case 'time':
        return this.segmentByTime(result)
      case 'sentence':
        return this.segmentBySentence(result)
      case 'semantic':
        return this.segmentBySemantic(result)
      default:
        return this.segmentBySentence(result)
    }
  }

  private segmentByTime(result: TranscriptionResult): TextEvent[] {
    const events: TextEvent[] = []
    const chunkDuration = 3000 // 3 seconds
    
    for (let start = 0; start < result.duration; start += chunkDuration) {
      const end = Math.min(start + chunkDuration, result.duration)
      const segmentText = this.getTextInTimeRange(result.segments, start, end)
      
      if (segmentText.trim()) {
        events.push({
          t: start,
          type: 'text',
          text: segmentText.trim()
        })
      }
    }
    
    return events
  }

  private segmentBySentence(result: TranscriptionResult): TextEvent[] {
    const events: TextEvent[] = []
    const sentences = this.splitIntoSentences(result.text)
    
    // If we have no segments or all segments have zero timestamps, distribute sentences evenly
    const hasValidTimestamps = result.segments.some(seg => seg.start > 0 || seg.end > 0)
    
    if (!hasValidTimestamps && result.duration > 0) {
      // Distribute sentences evenly across the duration
      const timePerSentence = result.duration / sentences.length
      sentences.forEach((sentence, index) => {
        if (sentence.trim()) {
          events.push({
            t: Math.round(index * timePerSentence),
            type: 'text',
            text: sentence.trim()
          })
        }
      })
    } else {
      // Use existing logic with segment-based timing
      let currentTime = 0
      for (const sentence of sentences) {
        if (sentence.trim()) {
          // Find the time range for this sentence
          const timeRange = this.findTimeRangeForText(result.segments, sentence)
          
          events.push({
            t: timeRange.start,
            type: 'text',
            text: sentence.trim()
          })
          
          currentTime = timeRange.end
        }
      }
    }
    
    return events
  }

  private segmentBySemantic(result: TranscriptionResult): TextEvent[] {
    // This would use AI to identify natural speech segments
    // For now, fall back to sentence-based segmentation
    return this.segmentBySentence(result)
  }

  private getTextInTimeRange(segments: TranscriptionSegment[], start: number, end: number): string {
    return segments
      .filter(segment => segment.start >= start && segment.end <= end)
      .map(segment => segment.text)
      .join(' ')
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries, but be smart about chess notation
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0)
  }

  private findTimeRangeForText(segments: TranscriptionSegment[], text: string): { start: number; end: number } {
    // Enhanced text-to-time mapping with better accuracy
    const searchText = text.toLowerCase().trim()
    
    // Try exact match first
    let relevantSegments = segments.filter(segment => 
      segment.text.toLowerCase().trim() === searchText
    )
    
    // If no exact match, try partial matches
    if (relevantSegments.length === 0) {
      relevantSegments = segments.filter(segment => 
        segment.text.toLowerCase().includes(searchText.substring(0, Math.min(20, searchText.length)))
      )
    }
    
    // If still no match, try word-based matching
    if (relevantSegments.length === 0) {
      const searchWords = searchText.split(/\s+/).filter(word => word.length > 2)
      relevantSegments = segments.filter(segment => {
        const segmentWords = segment.text.toLowerCase().split(/\s+/)
        return searchWords.some(word => segmentWords.includes(word))
      })
    }
    
    if (relevantSegments.length === 0) {
      // Fallback: estimate based on text position in overall transcript
      const allText = segments.map(s => s.text).join(' ')
      const textIndex = allText.toLowerCase().indexOf(searchText)
      if (textIndex >= 0) {
        // Estimate timing based on character position
        const charRatio = textIndex / allText.length
        const totalDuration = segments.length > 0 ? Math.max(...segments.map(s => s.end)) : 0
        const estimatedStart = Math.round(totalDuration * charRatio)
        const estimatedEnd = Math.round(estimatedStart + (searchText.length / allText.length) * totalDuration)
        return { start: estimatedStart, end: estimatedEnd }
      }
      return { start: 0, end: 0 }
    }
    
    // Return the time range covering all relevant segments
    const startTimes = relevantSegments.map(s => s.start)
    const endTimes = relevantSegments.map(s => s.end)
    
    return {
      start: Math.min(...startTimes),
      end: Math.max(...endTimes)
    }
  }
}

// OpenAI Whisper Provider
class WhisperTranscriptionProvider implements TranscriptionProvider {
  name = 'whisper'

  async transcribe(audioBlob: Blob): Promise<TranscriptionResult> {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'segment')

    const response = await fetch('/api/transcribe/whisper', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Whisper transcription failed: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      text: data.text,
      segments: data.segments?.map((seg: any) => ({
        start: Math.round(seg.start * 1000),
        end: Math.round(seg.end * 1000),
        text: seg.text,
        confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.8
      })) || [],
      confidence: 0.9, // Whisper doesn't provide overall confidence
      language: data.language || 'en',
      duration: Math.round(data.duration * 1000)
    }
  }
}

// Hugging Face Inference Provider
class HuggingFaceTranscriptionProvider implements TranscriptionProvider {
  name = 'huggingface'

  async transcribe(audioBlob: Blob): Promise<TranscriptionResult> {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')

    const response = await fetch('/api/transcribe/huggingface', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Hugging Face transcription failed: ${response.statusText} - ${errorData.error || 'Unknown error'}`)
    }

    const data = await response.json()
    
    // Enhanced chunk processing with better timestamp handling
    let segments: TranscriptionSegment[] = []
    
    if (data.chunks && Array.isArray(data.chunks) && data.chunks.length > 0) {
      // Process chunks with timestamps
      segments = data.chunks.map((chunk: any) => {
        // Handle different timestamp formats from Huggingface
        let startTime = 0
        let endTime = 0
        
        if (chunk.timestamp && Array.isArray(chunk.timestamp)) {
          // Standard format: [start, end] in seconds
          startTime = chunk.timestamp[0] || 0
          endTime = chunk.timestamp[1] || 0
        } else if (chunk.start !== undefined && chunk.end !== undefined) {
          // Alternative format: {start, end} in seconds
          startTime = chunk.start
          endTime = chunk.end
        } else if (chunk.timestamp && typeof chunk.timestamp === 'object') {
          // Object format: {start, end}
          startTime = chunk.timestamp.start || 0
          endTime = chunk.timestamp.end || 0
        }
        
        return {
          start: Math.round(startTime * 1000), // Convert to milliseconds
          end: Math.round(endTime * 1000),     // Convert to milliseconds
          text: chunk.text || '',
          confidence: 0.95 // Hugging Face models are very accurate
        }
      })
    } else if (data.text) {
      // If no chunks but we have text, create a single segment with estimated timing
      const wordsPerSecond = 150 / 60 // 2.5 words per second
      const wordCount = data.text.split(/\s+/).length
      const estimatedDuration = Math.round((wordCount / wordsPerSecond) * 1000) // Convert to milliseconds
      
      segments = [{
        start: 0,
        end: estimatedDuration,
        text: data.text,
        confidence: 0.95
      }]
    }
    
    // Calculate total duration from segments if not provided
    const calculatedDuration = segments.length > 0 
      ? Math.max(...segments.map((s: TranscriptionSegment) => s.end))
      : 0
    
    return {
      text: data.text || '',
      segments,
      confidence: 0.95,
      language: data.language || 'en',
      duration: data.duration ? Math.round(data.duration * 1000) : calculatedDuration
    }
  }
}

// Web Speech API Provider (fallback)
class WebSpeechTranscriptionProvider implements TranscriptionProvider {
  name = 'web-speech'

  async transcribe(audioBlob: Blob): Promise<TranscriptionResult> {
    // Check if Web Speech API is available
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) {
      throw new Error('Web Speech API is not supported in this browser')
    }

    return new Promise((resolve, reject) => {
      const recognition = new (window as any).webkitSpeechRecognition()
      
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 1

      const segments: TranscriptionSegment[] = []
      let fullText = ''
      let startTime = Date.now()

      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        recognition.stop()
        reject(new Error('Web Speech API timeout - audio too long or no speech detected'))
      }, 30000) // 30 second timeout

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            const text = result[0].transcript
            if (text.trim()) {
              fullText += text + ' '
              
              segments.push({
                start: segments.length * 2000, // Estimate timing
                end: (segments.length + 1) * 2000,
                text: text.trim(),
                confidence: result[0].confidence || 0.8
              })
            }
          }
        }
      }

      recognition.onend = () => {
        clearTimeout(timeout)
        if (fullText.trim()) {
          resolve({
            text: fullText.trim(),
            segments,
            confidence: segments.length > 0 
              ? segments.reduce((acc, seg) => acc + seg.confidence, 0) / segments.length 
              : 0.5,
            language: 'en',
            duration: Date.now() - startTime
          })
        } else {
          reject(new Error('No speech detected in audio'))
        }
      }

      recognition.onerror = (event: any) => {
        clearTimeout(timeout)
        reject(new Error(`Web Speech API error: ${event.error}`))
      }

      recognition.onstart = () => {
        console.log('Web Speech API started')
      }

      // Convert blob to audio and play it for recognition
      const audio = new Audio()
      audio.src = URL.createObjectURL(audioBlob)
      audio.onended = () => {
        recognition.stop()
      }
      audio.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('Failed to play audio for Web Speech API'))
      }
      
      audio.play()
      recognition.start()
    })
  }
}

// Whisper WASM Provider (in-browser ASR using @xenova/transformers)
class WhisperWasmTranscriptionProvider implements TranscriptionProvider {
  name = 'whisper-wasm'
  private pipeline: any = null
  private isInitialized = false

  async transcribe(audioBlob: Blob): Promise<TranscriptionResult> {
    try {
      await this.initializeWhisper()
      return await this.processAudio(audioBlob)
    } catch (error) {
      throw new Error(`Whisper WASM failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async initializeWhisper(): Promise<void> {
    if (this.isInitialized) return

    // Check if WASM is supported
    if (typeof WebAssembly === 'undefined') {
      throw new Error('WebAssembly is not supported in this browser')
    }

    try {
      // Dynamically import the transformers library
      const { pipeline } = await import('@xenova/transformers')
      
      console.log('Loading Whisper tiny model...')
      
      // Load Whisper tiny model (39MB) - good balance of speed and quality
      this.pipeline = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny.en',
        {
          quantized: true, // Use quantized model for better performance
          progress_callback: (progress: any) => {
            console.log('Model loading progress:', Math.round(progress.progress * 100) + '%')
          }
        }
      )
      
      this.isInitialized = true
      console.log('Whisper WASM initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Whisper WASM:', error)
      throw new Error(`Failed to initialize Whisper WASM: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async processAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    try {
      console.log('Processing audio with Whisper WASM...')
      
      // Convert blob to audio data
      const audioData = await this.convertAudioToFloat32(audioBlob)
      
      // Transcribe with Whisper
      const result = await this.pipeline(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        language: 'english',
        task: 'transcribe'
      })
      
      console.log('Whisper WASM transcription complete:', result)
      
      // Convert result to our format
      const segments = result.chunks?.map((chunk: any) => ({
        start: Math.round(chunk.timestamp[0] * 1000),
        end: Math.round(chunk.timestamp[1] * 1000),
        text: chunk.text.trim(),
        confidence: 0.9 // Transformers doesn't provide confidence scores
      })) || []
      
      return {
        text: result.text,
        segments,
        confidence: 0.9,
        language: 'en',
        duration: audioData.length / 16000 * 1000 // Assuming 16kHz sample rate
      }
    } catch (error) {
      console.error('Audio processing failed:', error)
      throw new Error(`Audio processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async convertAudioToFloat32(audioBlob: Blob): Promise<Float32Array> {
    try {
      // Convert audio blob to Float32Array
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Convert to mono and 16kHz (Whisper requirements)
      const channelData = audioBuffer.getChannelData(0) // Get first channel
      const sampleRate = audioBuffer.sampleRate
      const targetSampleRate = 16000
      
      // Simple resampling to 16kHz
      const resampledLength = Math.floor(channelData.length * targetSampleRate / sampleRate)
      const resampled = new Float32Array(resampledLength)
      
      for (let i = 0; i < resampledLength; i++) {
        const sourceIndex = Math.floor(i * sampleRate / targetSampleRate)
        resampled[i] = channelData[sourceIndex] || 0
      }
      
      console.log(`Audio converted: ${channelData.length} samples at ${sampleRate}Hz -> ${resampled.length} samples at ${targetSampleRate}Hz`)
      
      return resampled
    } catch (error) {
      console.error('Audio conversion failed:', error)
      throw new Error(`Audio conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Placeholder Provider (creates template text events)
class PlaceholderTranscriptionProvider implements TranscriptionProvider {
  name = 'placeholder'

  async transcribe(audioBlob: Blob): Promise<TranscriptionResult> {
    // Create placeholder text events for manual editing
    const placeholderText = "Welcome to your chess lesson! This is a placeholder text event. You can edit this text to add your own commentary about the moves and positions in your lesson."
    
    return {
      text: placeholderText,
      segments: [{
        start: 0,
        end: 5000,
        text: placeholderText,
        confidence: 0.1
      }],
      confidence: 0.1,
      language: 'en',
      duration: 5000
    }
  }
}

export const transcriptionService = new TranscriptionService()
