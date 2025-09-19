'use client'

import { useState, useCallback } from 'react'
import { transcriptionService, type TranscriptionResult, type TextEvent } from '@/services/transcription'
import { chunkedTranscriptionService, type ChunkedTranscriptionResult } from '@/services/chunkedTranscription'
import { whisperXTranscriptionService, type WhisperXTranscriptionResult } from '@/services/whisperXTranscription'

export interface TranscriptionState {
  isTranscribing: boolean
  result: TranscriptionResult | WhisperXTranscriptionResult | null
  textEvents: TextEvent[]
  error: string | null
  progress: number
  status: string
}

export interface UseTranscriptionOptions {
  segmentationStrategy?: 'time' | 'sentence' | 'semantic'
  provider?: string
  onComplete?: (textEvents: TextEvent[]) => void
  onError?: (error: string) => void
}

export function useTranscription(options: UseTranscriptionOptions = {}) {
  const {
    segmentationStrategy = 'sentence',
    provider = 'whisper',
    onComplete,
    onError
  } = options

  const [state, setState] = useState<TranscriptionState>({
    isTranscribing: false,
    result: null,
    textEvents: [],
    error: null,
    progress: 0,
    status: ''
  })

  const transcribe = useCallback(async (audioBlob: Blob) => {
    setState(prev => ({
      ...prev,
      isTranscribing: true,
      error: null,
      progress: 0,
      status: 'Starting transcription...'
    }))

    try {
      // Set status based on provider
      if (provider === 'whisperx') {
        setState(prev => ({
          ...prev,
          status: 'Processing with WhisperX for word-level timestamps...'
        }))
      } else if (provider === 'whisper-wasm') {
        setState(prev => ({
          ...prev,
          status: 'Loading Whisper model (first time only)...'
        }))
      } else if (provider === 'chunked') {
        setState(prev => ({
          ...prev,
          status: 'Processing audio in chunks for better timestamps...'
        }))
      } else {
        setState(prev => ({
          ...prev,
          status: 'Transcribing audio...'
        }))
      }

      // Simulate progress updates for non-WASM providers
      let progressInterval: NodeJS.Timeout | null = null
      if (provider !== 'whisper-wasm') {
        progressInterval = setInterval(() => {
          setState(prev => ({
            ...prev,
            progress: Math.min(prev.progress + 10, 90)
          }))
        }, 500)
      }

      let result: TranscriptionResult | WhisperXTranscriptionResult

      // Handle different transcription providers
      if (provider === 'whisperx') {
        const whisperXResult = await whisperXTranscriptionService.transcribe(audioBlob)
        
        // For WhisperX, we return the full result to preserve all data
        result = whisperXResult
      } else if (provider === 'chunked') {
        const chunkedResult = await chunkedTranscriptionService.transcribeAudioFile(audioBlob)
        
        // Convert chunked result to standard format
        result = {
          text: chunkedResult.text,
          segments: chunkedResult.segments,
          confidence: 0.95,
          language: 'en',
          duration: chunkedResult.totalDuration
        }
      } else {
        // Use standard transcription service
        result = await transcriptionService.transcribe(audioBlob, provider)
      }
      
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      setState(prev => ({
        ...prev,
        progress: 100,
        status: 'Processing results...'
      }))

      // Segment the transcript into text events
      let textEvents: TextEvent[]
      if (provider === 'whisperx' && 'enhancedTextEvents' in result) {
        // For WhisperX, use the pre-processed enhanced text events
        textEvents = result.enhancedTextEvents.map(event => ({
          t: event.t,
          type: 'text' as const,
          text: event.text,
          fen: event.fen
        }))
      } else {
        // For other providers, use the standard segmentation
        textEvents = transcriptionService.segmentTranscript(result as TranscriptionResult, segmentationStrategy)
      }
      
      setState(prev => ({
        ...prev,
        result,
        textEvents,
        isTranscribing: false,
        progress: 100,
        status: 'Complete'
      }))

      onComplete?.(textEvents)
      
      return { result, textEvents }
    } catch (error) {
      let errorMessage = 'Transcription failed'
      
      if (error instanceof Error) {
        if (error.message.includes('Hugging Face API key not configured')) {
          errorMessage = 'Hugging Face API key not configured. Please add HUGGINGFACE_API_KEY to your environment variables, or try manual text entry.'
        } else if (error.message.includes('OpenAI API key not configured')) {
          errorMessage = 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables, or try manual text entry.'
        } else if (error.message.includes('Replicate API token not configured')) {
          errorMessage = 'Replicate API token not configured. Please add REPLICATE_API_KEY to your environment variables, or try manual text entry.'
        } else if (error.message.includes('WhisperX transcription failed')) {
          errorMessage = 'WhisperX transcription failed. Check your Replicate API token and try again, or use manual text entry.'
        } else if (error.message.includes('Hugging Face transcription failed')) {
          errorMessage = 'Hugging Face transcription failed. Check your API key and try again, or use manual text entry.'
        } else if (error.message.includes('Whisper WASM')) {
          errorMessage = 'In-browser Whisper failed. This might be due to browser compatibility or model loading issues. Try manual text entry.'
        } else if (error.message.includes('WebAssembly')) {
          errorMessage = 'WebAssembly not supported in this browser. Try using a modern browser or manual text entry.'
        } else if (error.message.includes('All transcription providers failed')) {
          errorMessage = 'All automatic transcription methods failed. You can add text manually or try recording again with better audio quality.'
        } else if (error.message.includes('Web Speech API')) {
          errorMessage = 'Browser speech recognition failed. Try manual text entry or check your microphone permissions.'
        } else {
          errorMessage = error.message
        }
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isTranscribing: false,
        progress: 0,
        status: 'Failed'
      }))

      onError?.(errorMessage)
      throw error
    }
  }, [provider, segmentationStrategy, onComplete, onError])

  const reset = useCallback(() => {
    setState({
      isTranscribing: false,
      result: null,
      textEvents: [],
      error: null,
      progress: 0,
      status: ''
    })
  }, [])

  const updateTextEvents = useCallback((textEvents: TextEvent[]) => {
    setState(prev => ({
      ...prev,
      textEvents
    }))
  }, [])

  const optimizeEventGroup = useCallback((events: any[]) => {
    // Optimize the order and timing of events in a group
    // This could include:
    // - Moving text events to natural positions
    // - Adding brief pauses between moves
    // - Ensuring text appears before the move it describes
    
    const optimized: any[] = []
    const textEvents = events.filter(e => e.eventType === 'text')
    const moveEvents = events.filter(e => e.eventType === 'move')
    
    // Add text events first, then moves
    optimized.push(...textEvents)
    optimized.push(...moveEvents)
    
    return optimized
  }, [])

  const mergeWithMoves = useCallback((moves: any[], audioDuration: number) => {
    // This function would intelligently merge text events with move events
    // based on timing and context
    const mergedEvents: any[] = []
    
    // Sort all events by timestamp
    const allEvents = [
      ...moves.map(move => ({ ...move, eventType: 'move' })),
      ...state.textEvents.map(text => ({ ...text, eventType: 'text' }))
    ].sort((a, b) => a.t - b.t)
    
    // Group nearby events and create natural flow
    let currentGroup: any[] = []
    let lastTime = 0
    
    for (const event of allEvents) {
      // If there's a significant gap, finalize current group
      if (event.t - lastTime > 2000 && currentGroup.length > 0) {
        mergedEvents.push(...optimizeEventGroup(currentGroup))
        currentGroup = []
      }
      
      currentGroup.push(event)
      lastTime = event.t
    }
    
    // Add remaining events
    if (currentGroup.length > 0) {
      mergedEvents.push(...optimizeEventGroup(currentGroup))
    }
    
    return mergedEvents
  }, [state.textEvents, optimizeEventGroup])

  return {
    ...state,
    transcribe,
    reset,
    updateTextEvents,
    mergeWithMoves
  }
}
