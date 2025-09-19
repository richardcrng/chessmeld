'use client'

import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, Square, SkipBack, SkipForward } from 'lucide-react'

interface AudioPlayerProps {
  src: string
  onTimeUpdate?: (currentTime: number) => void
  onPlayPause?: (isPlaying: boolean) => void
  onSeek?: (time: number) => void
}

export interface AudioPlayerRef {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  getCurrentTime: () => number
  getDuration: () => number
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ src, onTimeUpdate, onPlayPause, onSeek }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isDragging, setIsDragging] = useState(false)

    useImperativeHandle(ref, () => ({
      play: () => {
        audioRef.current?.play()
      },
      pause: () => {
        audioRef.current?.pause()
      },
      seek: (time: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = time
          setCurrentTime(time)
        }
      },
      getCurrentTime: () => currentTime,
      getDuration: () => duration
    }))

    useEffect(() => {
      const audio = audioRef.current
      if (!audio) return

      const handleLoadedMetadata = () => {
        setDuration(audio.duration)
      }

      const handleTimeUpdate = () => {
        if (!isDragging) {
          setCurrentTime(audio.currentTime)
          onTimeUpdate?.(audio.currentTime)
        }
      }

      const handlePlay = () => {
        setIsPlaying(true)
        onPlayPause?.(true)
      }

      const handlePause = () => {
        setIsPlaying(false)
        onPlayPause?.(false)
      }

      const handleEnded = () => {
        setIsPlaying(false)
        onPlayPause?.(false)
      }

      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('play', handlePlay)
      audio.addEventListener('pause', handlePause)
      audio.addEventListener('ended', handleEnded)

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('play', handlePlay)
        audio.removeEventListener('pause', handlePause)
        audio.removeEventListener('ended', handleEnded)
      }
    }, [onTimeUpdate, onPlayPause, isDragging])

    const handlePlayPause = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause()
        } else {
          audioRef.current.play()
        }
      }
    }

    const handleStop = () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        setCurrentTime(0)
      }
    }

    const handleSeek = (value: number[]) => {
      const newTime = value[0]
      if (audioRef.current) {
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
        onSeek?.(newTime)
      }
    }

    const handleSliderChange = (value: number[]) => {
      setIsDragging(true)
      setCurrentTime(value[0])
    }

    const handleSliderCommit = (value: number[]) => {
      setIsDragging(false)
      handleSeek(value)
    }

    const skipBackward = () => {
      if (audioRef.current) {
        const newTime = Math.max(0, currentTime - 5)
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
        onSeek?.(newTime)
      }
    }

    const skipForward = () => {
      if (audioRef.current) {
        const newTime = Math.min(duration, currentTime + 5)
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
        onSeek?.(newTime)
      }
    }

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60)
      const seconds = Math.floor(time % 60)
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    return (
      <div className="space-y-4">
        <audio ref={audioRef} src={src} preload="metadata" />
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
            className="w-full"
            disabled={!duration}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={skipBackward}
            disabled={!duration}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
            disabled={!duration}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleStop}
            disabled={!duration}
          >
            <Square className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={skipForward}
            disabled={!duration}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="text-xs text-muted-foreground text-center">
          <p>Space: Play/Pause • ← →: Seek • S: Stop</p>
        </div>
      </div>
    )
  }
)

AudioPlayer.displayName = 'AudioPlayer'
