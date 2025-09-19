'use client'

import { useRef } from 'react'
import { useAudioUploader } from '@/hooks/useAudioUploader'
import { FaUpload, FaPlay, FaPause, FaStop, FaStepForward, FaStepBackward } from 'react-icons/fa'
import { Slider } from '@/components/ui/slider'

interface AudioUploaderProps {
  onAudioLoaded?: (blob: Blob) => void
  disabled?: boolean
}

export function AudioUploader({ onAudioLoaded, disabled }: AudioUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const {
    audioFile,
    audioBlob,
    duration,
    currentTime,
    isPlaying,
    isPaused,
    error,
    isLoading,
    handleFileUpload,
    play,
    pause,
    stop,
    seek,
    skipForward,
    skipBackward,
    reset,
    formatDuration,
  } = useAudioUploader(onAudioLoaded)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleSliderChange = (value: number[]) => {
    const newTime = value[0]
    seek(newTime)
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-2">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Upload Error</h3>
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
        <h3 className="text-lg font-semibold mb-4">Upload Audio</h3>
        
        {!audioBlob && (
          <div>
            <div className="mb-4">
              <FaUpload className="mx-auto text-4xl text-gray-400 mb-2" />
              <p className="text-gray-600 mb-2">Upload an audio file to create an interactive lesson</p>
              <p className="text-sm text-gray-500">
                Supported formats: MP3, WAV, M4A, WebM, OGG
              </p>
            </div>
            <button
              onClick={handleUploadClick}
              disabled={disabled || isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : (
                <>
                  <FaUpload className="inline mr-2" />
                  Choose Audio File
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {audioBlob && (
          <div className="space-y-4">
            {/* File Info */}
            <div className="text-sm text-gray-600">
              <p className="font-medium">{audioFile?.name}</p>
              <p>Duration: {formatDuration(duration)}</p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={100} // 0.1 second steps
                onValueChange={handleSliderChange}
                className="w-full"
                disabled={!duration}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => skipBackward(10)}
                disabled={!audioBlob}
                className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400"
                title="Skip backward 10s"
              >
                <FaStepBackward className="h-4 w-4" />
              </button>
              
              <button
                onClick={handlePlayPause}
                disabled={!audioBlob}
                className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <FaPause className="h-4 w-4" />
                ) : (
                  <FaPlay className="h-4 w-4" />
                )}
              </button>
              
              <button
                onClick={stop}
                disabled={!audioBlob}
                className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400"
                title="Stop"
              >
                <FaStop className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => skipForward(10)}
                disabled={!audioBlob}
                className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400"
                title="Skip forward 10s"
              >
                <FaStepForward className="h-4 w-4" />
              </button>
            </div>

            {/* Status */}
            <div className="text-sm text-gray-600">
              {isPlaying && <p>▶️ Playing</p>}
              {isPaused && <p>⏸️ Paused</p>}
              {!isPlaying && !isPaused && <p>⏹️ Stopped</p>}
            </div>

            {/* Reset Button */}
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
            >
              Upload Different File
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
