'use client'

import { useState } from 'react'
import { useTranscription } from '@/hooks/useTranscription'
import { FaMicrophone, FaSpinner, FaCheck, FaExclamationTriangle, FaEdit, FaSave, FaDownload } from 'react-icons/fa'
import type { TextEvent } from '@/services/transcription'
import { downloadTranscriptFile, generateTranscriptFilename } from '@/utils/transcript-utils'

interface TranscriptionPanelProps {
  audioBlob: Blob | null
  onTextEventsGenerated: (textEvents: TextEvent[]) => void
  onWhisperXDataGenerated?: (whisperXData: any) => void
  disabled?: boolean
}

export function TranscriptionPanel({ audioBlob, onTextEventsGenerated, onWhisperXDataGenerated, disabled }: TranscriptionPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editableTextEvents, setEditableTextEvents] = useState<TextEvent[]>([])
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualText, setManualText] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('huggingface')
  
  const {
    isTranscribing,
    result,
    textEvents,
    error,
    progress,
    status,
    transcribe,
    reset,
    updateTextEvents
  } = useTranscription({
    provider: selectedProvider,
    onComplete: (events) => {
      setEditableTextEvents(events)
      onTextEventsGenerated(events)
      
      // Store WhisperX data if available
      if (selectedProvider === 'whisperx' && result && 'whisperXData' in result) {
        onWhisperXDataGenerated?.(result.whisperXData)
      }
    },
    onError: (error) => {
      console.error('Transcription error:', error)
    }
  })

  // Handle downloading WhisperX transcript
  const handleDownloadTranscript = () => {
    if (selectedProvider === 'whisperx' && result && 'whisperXData' in result) {
      const filename = generateTranscriptFilename(
        (audioBlob as File)?.name || 'audio'
      )
      downloadTranscriptFile(result.whisperXData, filename)
    }
  }

  const handleTranscribe = async () => {
    if (!audioBlob) return
    
    try {
      await transcribe(audioBlob)
    } catch (error) {
      console.error('Transcription failed:', error)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditableTextEvents([...textEvents])
  }

  const handleSave = () => {
    updateTextEvents(editableTextEvents)
    onTextEventsGenerated(editableTextEvents)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditableTextEvents([...textEvents])
    setIsEditing(false)
  }

  const updateTextEvent = (index: number, newText: string) => {
    setEditableTextEvents(prev => 
      prev.map((event, i) => 
        i === index ? { ...event, text: newText } : event
      )
    )
  }

  const removeTextEvent = (index: number) => {
    setEditableTextEvents(prev => prev.filter((_, i) => i !== index))
  }

  const addTextEvent = () => {
    const lastEvent = editableTextEvents[editableTextEvents.length - 1]
    const newTime = lastEvent ? lastEvent.t + 1000 : 0
    
    setEditableTextEvents(prev => [
      ...prev,
      { t: newTime, type: 'text', text: '' }
    ])
  }

  const handleManualEntry = () => {
    if (!manualText.trim()) return
    
    // Split manual text into sentences and create text events
    const sentences = manualText
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0)
    
    const newTextEvents: TextEvent[] = sentences.map((sentence, index) => ({
      t: index * 3000, // 3 seconds apart
      type: 'text',
      text: sentence.trim()
    }))
    
    setEditableTextEvents(newTextEvents)
    updateTextEvents(newTextEvents)
    onTextEventsGenerated(newTextEvents)
    setShowManualEntry(false)
    setManualText('')
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (!audioBlob) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500">
          <FaMicrophone className="mx-auto text-3xl mb-2" />
          <p>Record audio first to enable transcription</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Audio Transcription</h3>
        {textEvents.length > 0 && !isEditing && (
          <div className="flex gap-2">
            {selectedProvider === 'whisperx' && result && 'whisperXData' in result && (
              <button
                onClick={handleDownloadTranscript}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                title="Download WhisperX transcript JSON"
              >
                <FaDownload className="inline mr-1" />
                Download Transcript
              </button>
            )}
            <button
              onClick={handleEdit}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              <FaEdit className="inline mr-1" />
              Edit
            </button>
          </div>
        )}
      </div>

      {isTranscribing && (
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <FaSpinner className="animate-spin text-blue-600 mr-2" />
            <span className="text-blue-600 font-medium">{status}</span>
          </div>
          {selectedProvider === 'whisper-wasm' ? (
            <div className="text-sm text-gray-600">
              {status.includes('Loading') ? (
                <p>Downloading and initializing Whisper model (39MB). This only happens once.</p>
              ) : (
                <p>Processing audio with Whisper WASM...</p>
              )}
            </div>
          ) : selectedProvider === 'chunked' ? (
            <div className="text-sm text-gray-600">
              <p>Processing audio in chunks for better timestamps...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-600 mr-2" />
            <div>
              <h4 className="text-red-800 font-medium">Transcription Error</h4>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={reset}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Try Again
            </button>
            <button
              onClick={() => setShowManualEntry(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Add Text Manually
            </button>
          </div>
        </div>
      )}

      {!isTranscribing && !error && textEvents.length === 0 && !showManualEntry && (
        <div className="text-center">
          <FaMicrophone className="mx-auto text-3xl text-gray-400 mb-3" />
          <p className="text-gray-600 mb-4">Ready to transcribe your audio</p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transcription Method:
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="whisperx">WhisperX (Best Word-Level Timestamps)</option>
              <option value="huggingface">Hugging Face (Whisper Large v3 Turbo)</option>
              <option value="chunked">Chunked Transcription (Better Timestamps)</option>
              <option value="whisper">OpenAI Whisper API</option>
              <option value="whisper-wasm">Whisper WASM (In-Browser)</option>
              <option value="web-speech">Web Speech API (Browser)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedProvider === 'whisperx' && 'Best quality with precise word-level timestamps - requires Replicate API key. Works best with MP3/WAV files.'}
              {selectedProvider === 'huggingface' && 'Best quality - requires Hugging Face API key'}
              {selectedProvider === 'chunked' && 'Better timestamps for long audio - no duration limits'}
              {selectedProvider === 'whisper' && 'High quality - requires OpenAI API key'}
              {selectedProvider === 'whisper-wasm' && 'Good quality, runs locally (39MB download)'}
              {selectedProvider === 'web-speech' && 'Basic quality, no setup needed'}
            </p>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={handleTranscribe}
              disabled={disabled}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <FaMicrophone className="inline mr-2" />
              Transcribe Audio
            </button>
            <div>
              <button
                onClick={() => setShowManualEntry(true)}
                className="text-blue-600 hover:text-blue-700 text-sm underline"
              >
                Or add text manually
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualEntry && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Add Text Manually</h4>
            <button
              onClick={() => setShowManualEntry(false)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your lesson text:
            </label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none"
              rows={6}
              placeholder="Enter your chess lesson commentary here. Each sentence will become a separate text event..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Tip: End sentences with periods, exclamation marks, or question marks for better segmentation.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleManualEntry}
              disabled={!manualText.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Create Text Events
            </button>
            <button
              onClick={() => setShowManualEntry(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && textEvents.length > 0 && (
        <div>
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <FaCheck className="text-green-600 mr-2" />
              <div>
                <h4 className="text-green-800 font-medium">Transcription Complete</h4>
                <p className="text-green-600 text-sm">
                  Generated {textEvents.length} text events from {formatTime(result.duration)} of audio
                </p>
              </div>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Edit Text Events</h4>
                <div className="space-x-2">
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    <FaSave className="inline mr-1" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              
              {editableTextEvents.map((event, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-mono text-gray-600">
                      {formatTime(event.t)}
                    </span>
                    <button
                      onClick={() => removeTextEvent(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    value={event.text}
                    onChange={(e) => updateTextEvent(index, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                    rows={2}
                    placeholder="Enter text for this time segment..."
                  />
                </div>
              ))}
              
              <button
                onClick={addTextEvent}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                + Add Text Event
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="font-medium">Generated Text Events</h4>
              {textEvents.map((event, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-mono text-gray-600">
                      {formatTime(event.t)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">{event.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
