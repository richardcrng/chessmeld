'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRecordingStore } from '@/stores/recordingStore'

export interface AudioUploaderState {
  audioFile: File | null
  audioBlob: Blob | null
  duration: number
  currentTime: number
  isPlaying: boolean
  isPaused: boolean
  error: string | null
  isLoading: boolean
}

export function useAudioUploader(onAudioLoaded?: (blob: Blob) => void) {
  const [state, setState] = useState<AudioUploaderState>({
    audioFile: null,
    audioBlob: null,
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isPaused: false,
    error: null,
    isLoading: false,
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Use the unified recording store for time management
  const { 
    updateCurrentTime,
    reset: resetGlobalRecording,
    setError: setGlobalError,
  } = useRecordingStore()

  // Update global time when local time changes
  useEffect(() => {
    updateCurrentTime(state.currentTime)
  }, [state.currentTime, updateCurrentTime])

  const handleFileUpload = useCallback((file: File) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    // Validate file type
    const supportedTypes = [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/wave',
      'audio/mp4',
      'audio/m4a',
      'audio/webm',
      'audio/ogg',
      'audio/oga'
    ]

    if (!supportedTypes.includes(file.type)) {
      const error = `Unsupported file type: ${file.type}. Supported formats: MP3, WAV, M4A, WebM, OGG`
      setState(prev => ({ ...prev, error, isLoading: false }))
      setGlobalError(error)
      return
    }

    // Validate file size (optional - 100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      const error = `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size: 100MB`
      setState(prev => ({ ...prev, error, isLoading: false }))
      setGlobalError(error)
      return
    }

    // Create audio element to get duration
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    
    audio.onloadedmetadata = () => {
      setState(prev => ({
        ...prev,
        audioFile: file,
        audioBlob: file,
        duration: audio.duration * 1000, // Convert to milliseconds
        currentTime: 0,
        isLoading: false,
        error: null,
      }))
      
      // Store reference to audio element
      audioRef.current = audio
      
      // Call callback with the file as blob
      onAudioLoaded?.(file)
      
      URL.revokeObjectURL(url)
    }

    audio.onerror = () => {
      const error = 'Failed to load audio file. Please check the file format and try again.'
      setState(prev => ({ ...prev, error, isLoading: false }))
      setGlobalError(error)
      URL.revokeObjectURL(url)
    }

    audio.src = url
  }, [onAudioLoaded, setGlobalError])

  const play = useCallback(() => {
    if (audioRef.current && state.audioBlob) {
      audioRef.current.play()
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false }))
      
      // Start time update interval
      timeUpdateIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          const currentTime = audioRef.current.currentTime * 1000 // Convert to milliseconds
          setState(prev => ({ ...prev, currentTime }))
        }
      }, 100)
    }
  }, [state.audioBlob])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setState(prev => ({ ...prev, isPlaying: false, isPaused: true }))
      
      // Stop time update interval
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
        timeUpdateIntervalRef.current = null
      }
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isPaused: false, 
        currentTime: 0 
      }))
      
      // Stop time update interval
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
        timeUpdateIntervalRef.current = null
      }
    }
  }, [])

  const seek = useCallback((timeMs: number) => {
    if (audioRef.current && state.audioBlob) {
      const timeSeconds = timeMs / 1000
      audioRef.current.currentTime = timeSeconds
      setState(prev => ({ ...prev, currentTime: timeMs }))
    }
  }, [state.audioBlob])

  const skipForward = useCallback((seconds: number = 10) => {
    if (audioRef.current && state.audioBlob) {
      const newTime = Math.min(
        audioRef.current.currentTime + seconds,
        state.duration / 1000
      )
      audioRef.current.currentTime = newTime
      setState(prev => ({ ...prev, currentTime: newTime * 1000 }))
    }
  }, [state.audioBlob, state.duration])

  const skipBackward = useCallback((seconds: number = 10) => {
    if (audioRef.current && state.audioBlob) {
      const newTime = Math.max(audioRef.current.currentTime - seconds, 0)
      audioRef.current.currentTime = newTime
      setState(prev => ({ ...prev, currentTime: newTime * 1000 }))
    }
  }, [state.audioBlob])

  const reset = useCallback(() => {
    // Stop and reset audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    
    // Clear interval
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current)
      timeUpdateIntervalRef.current = null
    }
    
    // Reset state
    setState({
      audioFile: null,
      audioBlob: null,
      duration: 0,
      currentTime: 0,
      isPlaying: false,
      isPaused: false,
      error: null,
      isLoading: false,
    })
    
    // Reset global state
    resetGlobalRecording()
  }, [resetGlobalRecording])

  const formatDuration = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  return {
    ...state,
    handleFileUpload,
    play,
    pause,
    stop,
    seek,
    skipForward,
    skipBackward,
    reset,
    formatDuration,
  }
}
