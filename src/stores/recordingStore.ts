import { create } from 'zustand'

type AudioMode = 'recording' | 'upload'

interface RecordingState {
  audioMode: AudioMode
  isRecording: boolean
  isInteractive: boolean // New flag for when user can interact with board (recording or upload mode)
  startTime: number | null
  currentTime: number
  duration: number
  error: string | null
}

interface RecordingActions {
  setAudioMode: (mode: AudioMode) => void
  startRecording: () => void
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  setInteractive: (interactive: boolean) => void
  reset: () => void
  setError: (error: string | null) => void
  updateCurrentTime: (time: number) => void
}

type RecordingStore = RecordingState & RecordingActions

export const useRecordingStore = create<RecordingStore>((set, get) => ({
  // State
  audioMode: 'recording',
  isRecording: false,
  isInteractive: false,
  startTime: null,
  currentTime: 0,
  duration: 0,
  error: null,

  // Actions
  setAudioMode: (mode: AudioMode) => {
    set({ audioMode: mode })
  },

  startRecording: () => {
    const now = Date.now()
    set({
      isRecording: true,
      isInteractive: true,
      startTime: now,
      currentTime: 0,
      duration: 0,
      error: null,
    })
  },

  stopRecording: () => {
    set((state) => ({
      isRecording: false,
      isInteractive: false,
      duration: state.currentTime,
    }))
  },

  pauseRecording: () => {
    // Pause logic can be added here if needed
    // For now, we'll keep it simple and just stop
    set({ isRecording: false })
  },

  resumeRecording: () => {
    // Resume logic can be added here if needed
    // For now, we'll keep it simple and restart
    const now = Date.now()
    set({
      isRecording: true,
      isInteractive: true,
      startTime: now,
      error: null,
    })
  },

  setInteractive: (interactive: boolean) => {
    set({ isInteractive: interactive })
  },

  reset: () => {
    set({
      audioMode: 'recording',
      isRecording: false,
      isInteractive: false,
      startTime: null,
      currentTime: 0,
      duration: 0,
      error: null,
    })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  updateCurrentTime: (time: number) => {
    set({ currentTime: time })
  },
}))

// Helper hook for formatting duration
export const useRecordingTime = () => {
  const { currentTime, isRecording, startTime } = useRecordingStore()
  
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return {
    currentTime,
    isRecording,
    startTime,
    formatDuration,
  }
}
