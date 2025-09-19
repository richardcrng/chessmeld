import { useState, useEffect, useRef, useCallback } from 'react';
import type { AudioClock } from '@/lib/renderer';

interface UseAudioClockOptions {
  audioUrl?: string;
  onTimeUpdate?: (timeMs: number) => void;
  fallbackDurationMs?: number;
}

export function useAudioClock({ audioUrl, onTimeUpdate, fallbackDurationMs }: UseAudioClockOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioClock, setAudioClock] = useState<AudioClock>({
    currentTimeMs: 0,
    durationMs: 0,
    isPlaying: false,
    isPaused: false
  });

  // Update audio clock state
  const updateAudioClock = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    // Handle NaN duration by using fallback or 0
    const audioDuration = isFinite(audio.duration) ? audio.duration : 0;
    const durationMs = audioDuration > 0 ? audioDuration * 1000 : (fallbackDurationMs || 0);
    
    setAudioClock({
      currentTimeMs: audio.currentTime * 1000,
      durationMs: durationMs,
      isPlaying: !audio.paused,
      isPaused: audio.paused
    });

    // Notify parent of time update
    onTimeUpdate?.(audio.currentTime * 1000);
  }, [onTimeUpdate, fallbackDurationMs]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => updateAudioClock();
    const handleLoadedMetadata = () => updateAudioClock();
    const handlePlay = () => updateAudioClock();
    const handlePause = () => updateAudioClock();
    const handleEnded = () => updateAudioClock();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [updateAudioClock]);

  // Control functions
  const play = useCallback(() => {
    audioRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const seek = useCallback((timeMs: number) => {
    if (audioRef.current && isFinite(timeMs) && timeMs >= 0) {
      audioRef.current.currentTime = timeMs / 1000;
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, []);

  return {
    audioRef,
    audioClock,
    play,
    pause,
    seek,
    togglePlayPause
  };
}
