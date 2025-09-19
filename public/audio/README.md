# Audio Files

This directory contains audio files for the Chessmeld player.

## Required Files

- `ruy-lopez.mp3` - Audio commentary for the Ruy Lopez opening lesson

## Adding Audio

To add audio for the Ruy Lopez example:

1. Create or obtain an audio file (MP3, WAV, or other web-compatible format)
2. Name it `ruy-lopez.mp3` and place it in this directory
3. Ensure the audio duration matches the meld's `durationMs` (30 seconds for the example)
4. The audio should be synchronized with the timeline events in the meld

## Audio Synchronization

The player uses the audio element's `currentTime` to drive the timeline. Make sure your audio file is properly synchronized with the events in the meld:

- 0-2s: Introduction
- 2-4s: e4 move
- 4-7s: e5 move  
- 7-10s: Nf3 move
- 10-13s: Nc6 move
- 13-16s: Bb5 move
- 16-20s: Pause point
- 20-23s: a6 move
- 23-26s: Ba4 move
- 26-29s: Nf6 move
- 29-30s: Conclusion

## Testing Without Audio

If you don't have an audio file, the player will still work but without audio synchronization. The timeline will advance based on the meld's duration.
