'use client'

import { useState } from 'react'
import { useTranscription } from '@/hooks/useTranscription'
import { useChunkedTranscription } from '@/hooks/useChunkedTranscription'

export function ChunkedTranscriptionDemo() {
  const [selectedProvider, setSelectedProvider] = useState('huggingface')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  // Standard transcription hook
  const standardTranscription = useTranscription({
    provider: selectedProvider,
    onComplete: (textEvents) => {
      console.log('Standard transcription complete:', textEvents)
    },
    onError: (error) => {
      console.error('Standard transcription error:', error)
    }
  })

  // Chunked transcription hook
  const chunkedTranscription = useChunkedTranscription({
    onComplete: (result) => {
      console.log('Chunked transcription complete:', result)
    },
    onError: (error) => {
      console.error('Chunked transcription error:', error)
    }
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setAudioBlob(file)
    }
  }

  const handleStandardTranscription = async () => {
    if (audioBlob) {
      await standardTranscription.transcribe(audioBlob)
    }
  }

  const handleChunkedTranscription = async () => {
    if (audioBlob) {
      await chunkedTranscription.transcribeAudioFile(audioBlob)
    }
  }

  const handleRealTimeRecording = async () => {
    if (chunkedTranscription.isRecording) {
      chunkedTranscription.stopRecording()
    } else {
      await chunkedTranscription.startRecording()
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Enhanced Transcription Demo</h2>
      
      {/* File Upload */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Upload Audio File</h3>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {audioBlob && (
          <p className="mt-2 text-sm text-gray-600">
            File selected: {audioBlob.size} bytes, {audioBlob.type}
          </p>
        )}
      </div>

      {/* Provider Selection */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Transcription Provider</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="huggingface"
              checked={selectedProvider === 'huggingface'}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="mr-2"
            />
            Huggingface (Standard) - Good for short audio
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="chunked"
              checked={selectedProvider === 'chunked'}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="mr-2"
            />
            Chunked Transcription - Better for long audio with timestamps
          </label>
        </div>
      </div>

      {/* Standard Transcription */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Standard Transcription</h3>
        <div className="space-y-2">
          <button
            onClick={handleStandardTranscription}
            disabled={!audioBlob || standardTranscription.isTranscribing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {standardTranscription.isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
          </button>
          
          {standardTranscription.status && (
            <p className="text-sm text-gray-600">{standardTranscription.status}</p>
          )}
          
          {standardTranscription.progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${standardTranscription.progress}%` }}
              />
            </div>
          )}
          
          {standardTranscription.error && (
            <p className="text-sm text-red-600">{standardTranscription.error}</p>
          )}
          
          {standardTranscription.result && (
            <div className="mt-2 p-2 bg-gray-50 rounded">
              <p className="text-sm font-medium">Transcription Result:</p>
              <p className="text-sm">{standardTranscription.result.text}</p>
              <p className="text-xs text-gray-500 mt-1">
                Segments: {standardTranscription.result.segments.length}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chunked Transcription */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Chunked Transcription</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleChunkedTranscription}
              disabled={!audioBlob || chunkedTranscription.isTranscribing}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {chunkedTranscription.isTranscribing ? 'Processing...' : 'Transcribe File in Chunks'}
            </button>
            
            <button
              onClick={handleRealTimeRecording}
              className={`px-4 py-2 rounded ${
                chunkedTranscription.isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              {chunkedTranscription.isRecording ? 'Stop Recording' : 'Start Real-time Recording'}
            </button>
          </div>
          
          {chunkedTranscription.status && (
            <p className="text-sm text-gray-600">{chunkedTranscription.status}</p>
          )}
          
          {chunkedTranscription.progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${chunkedTranscription.progress}%` }}
              />
            </div>
          )}
          
          {chunkedTranscription.error && (
            <p className="text-sm text-red-600">{chunkedTranscription.error}</p>
          )}
          
          {chunkedTranscription.result && (
            <div className="mt-2 p-2 bg-gray-50 rounded">
              <p className="text-sm font-medium">Chunked Transcription Result:</p>
              <p className="text-sm">{chunkedTranscription.result.text}</p>
              <p className="text-xs text-gray-500 mt-1">
                Segments: {chunkedTranscription.result.segments.length} | 
                Chunks: {chunkedTranscription.result.chunks.length} | 
                Duration: {Math.round(chunkedTranscription.result.totalDuration / 1000)}s
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Comparison */}
      {standardTranscription.result && chunkedTranscription.result && (
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Standard Transcription</h4>
              <p className="text-sm text-gray-600">
                Segments: {standardTranscription.result.segments.length}
              </p>
              <p className="text-sm text-gray-600">
                Duration: {Math.round(standardTranscription.result.duration / 1000)}s
              </p>
            </div>
            <div>
              <h4 className="font-medium">Chunked Transcription</h4>
              <p className="text-sm text-gray-600">
                Segments: {chunkedTranscription.result.segments.length}
              </p>
              <p className="text-sm text-gray-600">
                Duration: {Math.round(chunkedTranscription.result.totalDuration / 1000)}s
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
