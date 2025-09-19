'use client'

import { useEffect } from 'react'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { FaMicrophone, FaStop, FaPause, FaPlay } from 'react-icons/fa'

interface AudioRecorderProps {
  onRecordingStart?: () => void
  onRecordingStop?: (blob: Blob) => void
  onCurrentTimeChange?: (currentTime: number) => void
  disabled?: boolean
}

export function AudioRecorder({ onRecordingStart, onRecordingStop, onCurrentTimeChange, disabled }: AudioRecorderProps) {
  const {
    isRecording,
    isPaused,
    audioBlob,
    duration,
    currentTime,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    reset,
    formatDuration,
  } = useAudioRecorder(onRecordingStop)

  // Notify parent of currentTime changes
  useEffect(() => {
    if (onCurrentTimeChange) {
      onCurrentTimeChange(currentTime)
    }
  }, [currentTime, onCurrentTimeChange])

  const handleStart = async () => {
    await startRecording()
    onRecordingStart?.()
  }

  const handleStop = () => {
    stopRecording()
    // The onRecordingStop will be called from the MediaRecorder's onstop event
    // which happens after stopRecording() completes
  }

  const handlePause = () => {
    if (isPaused) {
      resumeRecording()
    } else {
      pauseRecording()
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-2">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Recording Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Reset
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">Audio Recording</h3>
        
        {!isRecording && !audioBlob && (
          <div>
            <div className="mb-4">
              <FaMicrophone className="mx-auto text-4xl text-gray-400 mb-2" />
              <p className="text-gray-600">Click to start recording your chess lesson</p>
            </div>
            <button
              onClick={handleStart}
              disabled={disabled}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <FaMicrophone className="inline mr-2" />
              Start Recording
            </button>
          </div>
        )}

        {isRecording && (
          <div>
            <div className="mb-4">
              <div className="recording-indicator">
                <FaMicrophone className="mx-auto text-4xl text-red-600 mb-2" />
              </div>
              <p className="text-red-600 font-medium">Recording in progress...</p>
              <p className="text-2xl font-mono text-gray-800">{formatDuration(duration)}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handlePause}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isPaused ? <FaPlay className="inline mr-2" /> : <FaPause className="inline mr-2" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={handleStop}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <FaStop className="inline mr-2" />
                Stop Recording
              </button>
            </div>
          </div>
        )}

        {audioBlob && !isRecording && (
          <div>
            <div className="mb-4">
              <div className="text-green-600 text-4xl mb-2">✅</div>
              <p className="text-green-600 font-medium">Recording Complete</p>
              <p className="text-lg font-mono text-gray-800">{formatDuration(duration)}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Record Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
