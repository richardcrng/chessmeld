'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { type ChessmeldMeldFormatCMFV001, type TextEvent } from '@/lib/cmf'
import { Player } from '@/lib/player'
import { buildMoveIndex, computeStateAtTime } from '@/lib/renderer-core'
import { Upload, Download, Edit3, Clock, X, Plus } from 'lucide-react'

// Simple Button component
const Button = ({ children, onClick, className = '', variant = 'default', size = 'default', ...props }: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm'
  [key: string]: any
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
  }
  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-sm'
  }
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

interface FileUploads {
  audioFile: File | null
  cmfFile: File | null
}

// Custom Player wrapper that tracks current time
function PlayerWithTimeTracking({ meld, onTimeUpdate }: { 
  meld: ChessmeldMeldFormatCMFV001
  onTimeUpdate: (timeMs: number) => void 
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // Set up audio event listeners to track time
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      onTimeUpdate(audio.currentTime * 1000)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate)
  }, [onTimeUpdate])

  return (
    <div>
      <audio ref={audioRef} src={meld.meta.audioUrl} preload="metadata" />
      <Player meld={meld} />
    </div>
  )
}

export default function EditorPage() {
  const [uploads, setUploads] = useState<FileUploads>({ audioFile: null, cmfFile: null })
  const [meld, setMeld] = useState<ChessmeldMeldFormatCMFV001 | null>(null)
  const [editingTextEvent, setEditingTextEvent] = useState<TextEvent | null>(null)
  const [editingTimestamp, setEditingTimestamp] = useState<TextEvent | null>(null)
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0)
  const [editingText, setEditingText] = useState<string>('')
  
  const audioInputRef = useRef<HTMLInputElement>(null)
  const cmfInputRef = useRef<HTMLInputElement>(null)

  // Handle audio file upload
  const handleAudioUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploads(prev => ({ ...prev, audioFile: file }))
    
    // If we already have a meld, update its audio URL
    if (meld) {
      const audioUrl = URL.createObjectURL(file)
      setMeld(prev => prev ? { ...prev, meta: { ...prev.meta, audioUrl } } : null)
    }
  }, [meld])

  // Handle CMF file upload
  const handleCMFUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploads(prev => ({ ...prev, cmfFile: file }))
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const parsedMeld = JSON.parse(content) as ChessmeldMeldFormatCMFV001
        
        // If we have an audio file, set its URL in the meld
        if (uploads.audioFile) {
          const audioUrl = URL.createObjectURL(uploads.audioFile)
          parsedMeld.meta.audioUrl = audioUrl
        }
        
        setMeld(parsedMeld)
      } catch (error) {
        console.error('Error parsing CMF file:', error)
        alert('Error parsing CMF file. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }, [uploads.audioFile])

  // Get text events from meld
  const textEvents = useMemo(() => {
    if (!meld) return []
    return meld.events.filter((event): event is TextEvent => event.type === 'text')
  }, [meld])

  // Update text event timestamp
  const updateTextEventTimestamp = useCallback((event: TextEvent, newTimestamp: number) => {
    if (!meld) return
    
    const updatedMeld = {
      ...meld,
      events: meld.events.map(e => 
        e === event ? { ...e, t: newTimestamp } : e
      )
    }
    setMeld(updatedMeld)
    setEditingTimestamp(null)
  }, [meld])

  // Start editing a text event
  const startEditingTextEvent = useCallback((event: TextEvent) => {
    setEditingTextEvent(event)
    setEditingText(event.text)
  }, [])

  // Save text event content
  const saveTextEventContent = useCallback((event: TextEvent, newText: string) => {
    if (!meld) return
    
    const updatedMeld = {
      ...meld,
      events: meld.events.map(e => 
        e === event ? { ...e, text: newText } : e
      )
    }
    setMeld(updatedMeld)
    setEditingTextEvent(null)
    setEditingText('')
  }, [meld])

  // Cancel text editing
  const cancelTextEditing = useCallback(() => {
    setEditingTextEvent(null)
    setEditingText('')
  }, [])

  // Add empty text event after a given event
  const addEmptyTextEventAfter = useCallback((afterEvent: TextEvent) => {
    if (!meld) return
    
    // Find the index of the event to insert after
    const eventIndex = meld.events.findIndex(e => e === afterEvent)
    if (eventIndex === -1) return
    
    // Create new empty text event with timestamp slightly after the current event
    const newTextEvent: TextEvent = {
      t: afterEvent.t + 1000, // 1 second after
      type: 'text',
      fen: afterEvent.fen,
      text: ''
    }
    
    // Insert the new event after the current one
    const updatedEvents = [...meld.events]
    updatedEvents.splice(eventIndex + 1, 0, newTextEvent)
    
    const updatedMeld = {
      ...meld,
      events: updatedEvents
    }
    setMeld(updatedMeld)
    
    // Start editing the new event
    startEditingTextEvent(newTextEvent)
  }, [meld, startEditingTextEvent])

  // Export corrected CMF
  const exportCMF = useCallback(() => {
    if (!meld) return
    
    // Sort events by timestamp
    const sortedEvents = [...meld.events].sort((a, b) => a.t - b.t)
    const correctedMeld = {
      ...meld,
      events: sortedEvents
    }
    
    const blob = new Blob([JSON.stringify(correctedMeld, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meld.meta.title || 'corrected'}.cmf.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [meld])

  // Format timestamp as m:ss
  const formatTimestamp = (timestampMs: number): string => {
    const totalSeconds = Math.floor(timestampMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!meld || !meld.meta.audioUrl) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Audio Timestamp Editor</h1>
          
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
            <p className="text-gray-600 mb-6">
              Upload an audio file and its corresponding CMF JSON file to start editing timestamps.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio File
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => audioInputRef.current?.click()}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose Audio File</span>
                  </Button>
                  {uploads.audioFile && (
                    <span className="text-sm text-gray-600">
                      {uploads.audioFile.name}
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CMF JSON File
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    ref={cmfInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleCMFUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => cmfInputRef.current?.click()}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose CMF File</span>
                  </Button>
                  {uploads.cmfFile && (
                    <span className="text-sm text-gray-600">
                      {uploads.cmfFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Header with Export Button */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{meld.meta.title}</h1>
            <p className="text-gray-600">Audio Timestamp Editor</p>
          </div>
          <Button onClick={exportCMF} className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export CMF</span>
          </Button>
        </div>
      </div>

      {/* Main Player with Editing Overlay */}
      <div className="relative flex-1">
        {/* The actual Player component with time tracking */}
        <PlayerWithTimeTracking 
          meld={meld} 
          onTimeUpdate={setCurrentTimeMs}
        />
        
        {/* Editing Overlay */}
        <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg border p-4 max-h-96 overflow-y-auto z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Text Events Editor</h3>
            <button
              onClick={() => setEditingTimestamp(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {textEvents.map((event, index) => (
              <div
                key={`${event.t}-${index}`}
                className={`p-3 rounded-lg border ${
                  currentTimeMs >= event.t && currentTimeMs < (textEvents[index + 1]?.t || Infinity)
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono text-gray-600">
                      {formatTimestamp(event.t)}
                    </span>
                    <button
                      onClick={() => setEditingTimestamp(event)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit timestamp"
                    >
                      <Clock className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => startEditingTextEvent(event)}
                    className="text-gray-600 hover:text-gray-800"
                    title="Edit text"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="text-sm text-gray-800 relative">
                  {editingTextEvent === event ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => {
                          setEditingText(e.target.value)
                        }}
                        className="w-full p-2 border rounded text-sm"
                        rows={3}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            cancelTextEditing()
                          }
                        }}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={cancelTextEditing}
                          className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveTextEventContent(event, editingText)}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <p className="pr-8">{event.text}</p>
                      <button
                        onClick={() => addEmptyTextEventAfter(event)}
                        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600"
                        title="Add empty text event after this one"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timestamp Editor Modal */}
      {editingTimestamp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Timestamp</h3>
            <p className="text-sm text-gray-600 mb-4">
              Current: {formatTimestamp(editingTimestamp.t)}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Audio position: {formatTimestamp(currentTimeMs)}
            </p>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => updateTextEventTimestamp(editingTimestamp, currentTimeMs)}
                className="flex-1"
              >
                Use Current Audio Time
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingTimestamp(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
