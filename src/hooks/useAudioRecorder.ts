'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRecordingStore } from '@/stores/recordingStore'

// Helper function to validate audio blob duration metadata
function validateAudioBlob(blob: Blob, expectedDurationMs: number) {
  const audio = new Audio()
  const url = URL.createObjectURL(blob)
  
  audio.onloadedmetadata = () => {
    URL.revokeObjectURL(url)
    const hasValidDuration = isFinite(audio.duration) && audio.duration > 0
    
    if (!hasValidDuration) {
      console.warn('⚠️ Audio file lacks proper duration metadata!')
      console.warn('This may cause issues in the player. Consider using MP4 audio format.')
      console.warn('Expected duration:', expectedDurationMs / 1000, 'seconds')
      console.warn('Actual duration:', audio.duration, 'seconds')
    } else {
      console.log('✅ Audio file has valid duration metadata:', audio.duration, 'seconds')
    }
  }
  
  audio.onerror = () => {
    URL.revokeObjectURL(url)
    console.error('❌ Failed to validate audio blob')
  }
  
  audio.src = url
}

export interface AudioRecorderState {
  isRecording: boolean
  isPaused: boolean
  audioBlob: Blob | null
  duration: number
  currentTime: number
  error: string | null
}

export function useAudioRecorder(onRecordingStop?: (blob: Blob) => void) {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    audioBlob: null,
    duration: 0,
    currentTime: 0,
    error: null,
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Use the unified recording store
  const { 
    startRecording: startGlobalRecording, 
    stopRecording: stopGlobalRecording, 
    reset: resetGlobalRecording,
    setError: setGlobalError,
    updateCurrentTime,
    isRecording: globalIsRecording,
    currentTime: globalCurrentTime
  } = useRecordingStore()

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Try to use MP4 audio format first (best duration metadata support)
      // Then try WebM with Opus codec, then basic WebM
      let mimeType = 'audio/mp4'
      if (!MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/webm;codecs=opus'
        if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm'
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      startTimeRef.current = Date.now()

      // Start the global recording timer
      startGlobalRecording()

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Use the same MIME type that was used for recording
        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        
        // Validate the audio blob has proper duration metadata
        validateAudioBlob(audioBlob, state.duration)
        
        setState(prev => ({
          ...prev,
          audioBlob,
          isRecording: false,
          isPaused: false,
        }))
        
        // Stop the global recording timer
        stopGlobalRecording()
        
        // Call the callback with the audio blob
        onRecordingStop?.(audioBlob)
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      
      // Start duration timer that updates both local and global state
      durationIntervalRef.current = setInterval(() => {
        const currentTime = Date.now() - startTimeRef.current
        setState(prev => ({
          ...prev,
          duration: currentTime,
          currentTime: currentTime,
        }))
        // Update global state
        updateCurrentTime(currentTime)
      }, 100)

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        error: null,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }))
      setGlobalError(errorMessage)
    }
  }, [startGlobalRecording, stopGlobalRecording, updateCurrentTime, setGlobalError, state.duration])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause()
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      
      setState(prev => ({
        ...prev,
        isPaused: true,
      }))
    }
  }, [state.isRecording, state.isPaused])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume()
      startTimeRef.current = Date.now() - state.duration
      
      // Resume duration timer
      durationIntervalRef.current = setInterval(() => {
        const currentTime = Date.now() - startTimeRef.current
        setState(prev => ({
          ...prev,
          duration: currentTime,
          currentTime: currentTime,
        }))
      }, 100)
      
      setState(prev => ({
        ...prev,
        isPaused: false,
      }))
    }
  }, [state.isRecording, state.isPaused, state.duration])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [state.isRecording])

  const reset = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
    }
    
    setState({
      isRecording: false,
      isPaused: false,
      audioBlob: null,
      duration: 0,
      currentTime: 0,
      error: null,
    })
    
    // Reset global state
    resetGlobalRecording()
    
    audioChunksRef.current = []
  }, [state.isRecording, resetGlobalRecording])

  const formatDuration = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    reset,
    formatDuration,
  }
}
