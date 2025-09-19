'use client'

import { useState, useCallback, useRef } from 'react'
import { chunkedTranscriptionService, type ChunkedTranscriptionResult, type AudioChunk } from '@/services/chunkedTranscription'

export interface ChunkedTranscriptionState {
  isRecording: boolean
  isTranscribing: boolean
  result: ChunkedTranscriptionResult | null
  chunks: AudioChunk[]
  error: string | null
  progress: number
  status: string
}

export interface UseChunkedTranscriptionOptions {
  onChunkProcessed?: (chunk: AudioChunk) => void
  onComplete?: (result: ChunkedTranscriptionResult) => void
  onError?: (error: string) => void
}

export function useChunkedTranscription(options: UseChunkedTranscriptionOptions = {}) {
  const { onChunkProcessed, onComplete, onError } = options
  
  const [state, setState] = useState<ChunkedTranscriptionState>({
    isRecording: false,
    isTranscribing: false,
    result: null,
    chunks: [],
    error: null,
    progress: 0,
    status: ''
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null,
        status: 'Starting real-time recording...',
        chunks: []
      }))

      await chunkedTranscriptionService.startRealTimeRecording()
      
      // Update status periodically
      intervalRef.current = setInterval(() => {
        const status = chunkedTranscriptionService.getRecordingStatus()
        setState(prev => ({
          ...prev,
          chunks: chunkedTranscriptionService.getChunks(),
          status: `Recording... (${status.chunkCount} chunks)`
        }))
      }, 1000)

      setState(prev => ({
        ...prev,
        status: 'Recording in progress...'
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isRecording: false,
        status: 'Failed to start'
      }))
      onError?.(errorMessage)
    }
  }, [onError])

  const stopRecording = useCallback(() => {
    chunkedTranscriptionService.stopRecording()
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    setState(prev => ({
      ...prev,
      isRecording: false,
      status: 'Recording stopped'
    }))
  }, [])

  const transcribeChunks = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isTranscribing: true,
        error: null,
        progress: 0,
        status: 'Transcribing chunks...'
      }))

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }))
      }, 500)

      const result = await chunkedTranscriptionService.transcribeChunks()
      
      clearInterval(progressInterval)
      
      setState(prev => ({
        ...prev,
        result,
        isTranscribing: false,
        progress: 100,
        status: 'Transcription complete'
      }))

      onComplete?.(result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isTranscribing: false,
        progress: 0,
        status: 'Transcription failed'
      }))
      onError?.(errorMessage)
    }
  }, [onComplete, onError])

  const transcribeAudioFile = useCallback(async (audioBlob: Blob) => {
    try {
      setState(prev => ({
        ...prev,
        isTranscribing: true,
        error: null,
        progress: 0,
        status: 'Processing audio file in chunks...'
      }))

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 15, 90)
        }))
      }, 300)

      const result = await chunkedTranscriptionService.transcribeAudioFile(audioBlob)
      
      clearInterval(progressInterval)
      
      setState(prev => ({
        ...prev,
        result,
        isTranscribing: false,
        progress: 100,
        status: 'File transcription complete'
      }))

      onComplete?.(result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'File transcription failed'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isTranscribing: false,
        progress: 0,
        status: 'File transcription failed'
      }))
      onError?.(errorMessage)
    }
  }, [onComplete, onError])

  const reset = useCallback(() => {
    chunkedTranscriptionService.clearChunks()
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    setState({
      isRecording: false,
      isTranscribing: false,
      result: null,
      chunks: [],
      error: null,
      progress: 0,
      status: ''
    })
  }, [])

  const getRecordingStatus = useCallback(() => {
    return chunkedTranscriptionService.getRecordingStatus()
  }, [])

  return {
    ...state,
    startRecording,
    stopRecording,
    transcribeChunks,
    transcribeAudioFile,
    reset,
    getRecordingStatus
  }
}
