'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useGraphStudio } from '@/hooks/useGraphStudio'
import { GraphChessBoardSimple } from '@/components/GraphChessBoardSimple'
import { AudioRecorder } from '@/components/AudioRecorder'
import { AudioUploader } from '@/components/AudioUploader'
import { TranscriptionPanel } from '@/components/TranscriptionPanel'
import { MetadataFormComponent } from '@/components/MetadataForm'
import { FenInput } from '@/components/FenInput'
import { BoardSetup } from '@/components/BoardSetup'
import { LegalPolicyToggle } from '@/components/LegalPolicyToggle'
import { v4 as uuidv4 } from 'uuid'
import { useRecordingStore } from '@/stores/recordingStore'
import type { StudioStep, LegacyMoveEvent, MetadataForm, LegalPolicy } from '@/types/graph-studio'

export default function RecordGraphPageSimple() {
  const {
    currentStep,
    session,
    metadata,
    currentNodeId,
    currentPath,
    currentLegalPolicy,
    setCurrentStep,
    setSession,
    setMetadata,
    setLegalPolicy,
    addMove,
    addVariation,
    addIntegrityWarning,
    clearIntegrityWarnings,
    navigateToNode,
    navigateToMoveIndex,
    goBack,
    goForward,
    goToStart,
    goToLatest,
    setAudioBlob,
    setWhisperXData,
    addTextEvents,
    updateTextEvents,
    addAnnotationEvent,
    exportCMF,
    resetSession,
    getCurrentNode,
    getVariations,
    getAllPaths,
  } = useGraphStudio()

  // Use centralized recording time management
  const { reset: resetRecording, currentTime, audioMode, setAudioMode, setInteractive } = useRecordingStore()

  const [startingFen, setStartingFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [showFenInput, setShowFenInput] = useState(false)
  const [setupMode, setSetupMode] = useState<'visual' | 'fen'>('visual')
  const [isRecordingComplete, setIsRecordingComplete] = useState(false)
  const [isMetadataComplete, setIsMetadataComplete] = useState(false)
  
  // Refs for auto-scrolling
  const transcriptionRef = useRef<HTMLDivElement>(null)
  const metadataRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // Initialize session when starting or when startingFen changes
  useEffect(() => {
    // If no session exists, create one
    if (!session) {
      setSession({
        id: uuidv4(),
        title: 'Untitled Lesson',
        author: 'Unknown',
        startingFen,
        nodes: {
          [startingFen]: {
            fen: startingFen,
            children: [],
            parents: [],
            moveNumber: 0,
          }
        },
        rootNodeId: startingFen,
        currentNodeId: startingFen,
        currentPath: { nodeIds: [startingFen], moves: [] },
        events: [],
        duration: 0,
        recordingDefaults: {
          legalPolicy: currentLegalPolicy
        }
      })
    } 
    // If session exists but startingFen has changed, reset the session
    else if (session.startingFen !== startingFen) {
      setSession({
        id: uuidv4(),
        title: session.title || 'Untitled Lesson',
        author: session.author || 'Unknown',
        startingFen,
        nodes: {
          [startingFen]: {
            fen: startingFen,
            children: [],
            parents: [],
            moveNumber: 0,
          }
        },
        rootNodeId: startingFen,
        currentNodeId: startingFen,
        currentPath: { nodeIds: [startingFen], moves: [] },
        events: [],
        duration: 0,
        recordingDefaults: {
          legalPolicy: currentLegalPolicy
        }
      })
    }
  }, [session, setSession, startingFen, currentLegalPolicy])

  // Auto-scroll to current step
  useEffect(() => {
    const scrollToStep = () => {
      let targetRef: React.RefObject<HTMLDivElement | null> | null = null
      
      switch (currentStep) {
        case 'recording':
          targetRef = transcriptionRef
          break
        case 'review':
          targetRef = metadataRef
          break
        case 'export':
          targetRef = exportRef
          break
      }
      
      if (targetRef?.current) {
        targetRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
    
    const timer = setTimeout(scrollToStep, 100)
    return () => clearTimeout(timer)
  }, [currentStep])

  const handleRecordingStart = useCallback(() => {
    // Don't start the recording timer here - let the AudioRecorder component handle it
    setCurrentStep('recording')
  }, [setCurrentStep])

  const handleRecordingStop = useCallback((blob: Blob) => {
    // The recording timer is already stopped by the AudioRecorder component
    setAudioBlob(blob)
    setIsRecordingComplete(true)
  }, [setAudioBlob])

  const handleAudioUploaded = useCallback((blob: Blob) => {
    setAudioBlob(blob)
    setIsRecordingComplete(true)
    // Enable board interaction for upload mode
    setInteractive(true)
    // Automatically transition to recording step when audio is uploaded
    setCurrentStep('recording')
  }, [setAudioBlob, setCurrentStep, setInteractive])

  // Simplified move handler - directly uses recordingTime.currentTime
  const handleMove = useCallback((move: LegacyMoveEvent) => {
    addMove(move)
  }, [addMove])

  const handleVariation = useCallback((move: LegacyMoveEvent) => {
    addVariation(move)
  }, [addVariation])

  const handleTextEventsGenerated = useCallback((textEvents: any[]) => {
    addTextEvents(textEvents)
  }, [addTextEvents])

  const handleWhisperXDataGenerated = useCallback((whisperXData: any) => {
    // Generate a transcript URL based on the metadata title
    const transcriptFileName = `${metadata.title || 'chess-lesson'}.transcript.json`
    const transcriptUrl = `./${transcriptFileName}`
    
    setWhisperXData(whisperXData, transcriptUrl)
  }, [setWhisperXData, metadata.title])

  const handleAnnotationEvent = useCallback((event: any) => {
    // Handle clear events
    if (event.type === 'clear') {
      const clearEvent: any = {
        t: event.timestamp,
        type: 'clear' as const,
        comment: event.comment
      }
      addAnnotationEvent(clearEvent)
      return
    }
    
    // Convert annotation event to CMF format
    const annotationEvent: any = {
      t: event.timestamp,
      type: 'annotate' as const,
    }
    
    if (event.mode === 'arrow' && event.from && event.to) {
      annotationEvent.arrows = [{
        from: event.from,
        to: event.to,
        color: 'green' // Fixed color for arrows
      }]
    }
    
    if (event.mode === 'circle') {
      annotationEvent.circles = [{
        square: event.square,
        color: 'yellow' // Fixed color for circles
      }]
    }
    
    if (event.mode === 'highlight') {
      annotationEvent.highlights = [{
        square: event.square,
        color: 'blue' // Fixed color for highlights
      }]
    }
    
    if (event.note) {
      annotationEvent.note = event.note
    }
    
    addAnnotationEvent(annotationEvent)
  }, [addAnnotationEvent])

  // Navigation handlers with timestamp recording
  const handleNavigateToNode = useCallback((fen: string) => {
    navigateToNode(fen, currentTime)
  }, [navigateToNode, currentTime])

  const handleNavigateToMoveIndex = useCallback((moveIndex: number) => {
    navigateToMoveIndex(moveIndex, currentTime)
  }, [navigateToMoveIndex, currentTime])

  const handleGoBack = useCallback(() => {
    goBack(currentTime)
  }, [goBack, currentTime])

  const handleGoForward = useCallback(() => {
    goForward(currentTime)
  }, [goForward, currentTime])

  const handleGoToStart = useCallback(() => {
    goToStart(currentTime)
  }, [goToStart, currentTime])

  const handleGoToLatest = useCallback(() => {
    goToLatest(currentTime)
  }, [goToLatest, currentTime])

  const handleExport = useCallback(() => {
    try {
      const cmfData = exportCMF()
      const blob = new Blob([JSON.stringify(cmfData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${metadata.title || 'chess-lesson'}.cmf.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }, [exportCMF, metadata.title])

  const handleExportTranscript = useCallback(() => {
    if (!session?.whisperXData) {
      alert('No WhisperX transcript data available to export.')
      return
    }

    try {
      const transcriptData = session.whisperXData
      const blob = new Blob([JSON.stringify(transcriptData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${metadata.title || 'chess-lesson'}.transcript.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Transcript export failed:', error)
      alert('Transcript export failed. Please try again.')
    }
  }, [session?.whisperXData, metadata.title])

  const handleAudioExport = useCallback(() => {
    if (!session?.audioBlob) {
      alert('No audio recording available to export.')
      return
    }

    try {
      const url = URL.createObjectURL(session.audioBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${metadata.title || 'chess-lesson'}-audio.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Audio export failed:', error)
      alert('Audio export failed. Please try again.')
    }
  }, [session?.audioBlob, metadata.title])

  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to reset? This will clear all recorded data.')) {
      resetSession()
      resetRecording()
      setCurrentStep('setup')
      setIsRecordingComplete(false)
      setIsMetadataComplete(false)
    }
  }, [resetSession, resetRecording, setCurrentStep])

  const currentNode = getCurrentNode()
  const variations = getVariations()
  const allPaths = getAllPaths()

  if (!currentNode) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">ChessMeld Studio - Graph Mode (Simplified)</h1>
          
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {(['setup', 'recording', 'review', 'export'] as const).map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step 
                      ? 'bg-primary text-primary-foreground' 
                      : index < (['setup', 'recording', 'review', 'export'] as const).indexOf(currentStep)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`ml-2 text-sm ${
                    currentStep === step ? 'font-medium' : ''
                  }`}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </span>
                  {index < 3 && <div className="w-8 h-0.5 bg-gray-200 mx-2" />}
                </div>
              ))}
            </div>
          </div>

          {/* Setup Step */}
          {currentStep === 'setup' && (
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">Setup</h2>
                
                <div className="space-y-6">
                  {/* Audio Mode Selection */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">Audio Mode</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAudioMode('recording')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${
                          audioMode === 'recording'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Record Audio
                      </button>
                      <button
                        onClick={() => setAudioMode('upload')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${
                          audioMode === 'upload'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Upload Audio
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {audioMode === 'recording' 
                        ? 'Record audio directly in the browser'
                        : 'Upload an existing audio file to create an interactive lesson'
                      }
                    </p>
                  </div>

                  {/* Legal Policy Selection */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">Recording Mode</h3>
                    <LegalPolicyToggle
                      currentPolicy={currentLegalPolicy}
                      onPolicyChange={setLegalPolicy}
                      disabled={false}
                    />
                  </div>

                  {/* Starting Position */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium">Starting Position</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSetupMode('visual')}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            setupMode === 'visual'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Visual Setup
                        </button>
                        <button
                          onClick={() => setSetupMode('fen')}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            setupMode === 'fen'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          FEN Input
                        </button>
                      </div>
                    </div>

                    {setupMode === 'visual' ? (
                      <BoardSetup
                        initialFen={startingFen}
                        onFenChange={setStartingFen}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={startingFen}
                            onChange={(e) => setStartingFen(e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-md"
                            placeholder="Enter FEN string"
                          />
                          <button
                            onClick={() => setShowFenInput(!showFenInput)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                          >
                            {showFenInput ? 'Hide' : 'Show'} Advanced
                          </button>
                        </div>
                        
                        {showFenInput && (
                          <FenInput
                            initialFen={startingFen}
                            onFenChange={setStartingFen}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={handleRecordingStart}
                    className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                  >
                    {audioMode === 'recording' ? 'Start Recording' : 'Start with Uploaded Audio'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recording Step */}
          {currentStep === 'recording' && (
            <div className="space-y-6">
              {/* Legal Policy Toggle */}
              <div className="bg-card p-4 rounded-lg border">
                <LegalPolicyToggle
                  currentPolicy={currentLegalPolicy}
                  onPolicyChange={setLegalPolicy}
                  disabled={false}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chess Board */}
                <div className="bg-card p-6 rounded-lg border">
                  <h2 className="text-xl font-semibold mb-4">Chess Board</h2>
                <GraphChessBoardSimple
                  startingFen={startingFen}
                  currentNode={currentNode}
                  currentPath={currentPath}
                  variations={variations}
                  events={session?.events || []}
                  legalPolicy={currentLegalPolicy}
                  onMove={handleMove}
                  onVariation={handleVariation}
                  onNavigateToNode={handleNavigateToNode}
                  onNavigateToMoveIndex={handleNavigateToMoveIndex}
                  onGoBack={handleGoBack}
                  onGoForward={handleGoForward}
                  onGoToStart={handleGoToStart}
                  onGoToLatest={handleGoToLatest}
                  showNavigation={true}
                  onAnnotationEvent={handleAnnotationEvent}
                />
              </div>

              {/* Audio Recorder/Uploader */}
              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">
                  {audioMode === 'recording' ? 'Audio Recording' : 'Audio Upload'}
                </h2>
                {audioMode === 'recording' ? (
                  <AudioRecorder
                    onRecordingStart={handleRecordingStart}
                    onRecordingStop={handleRecordingStop}
                  />
                ) : (
                  <AudioUploader
                    onAudioLoaded={handleAudioUploaded}
                  />
                )}
              </div>

                {/* Transcription */}
                <div ref={transcriptionRef} className="lg:col-span-2 bg-card p-6 rounded-lg border">
                  <h2 className="text-xl font-semibold mb-4">Transcription</h2>
                  <TranscriptionPanel
                    audioBlob={session?.audioBlob || null}
                    onTextEventsGenerated={handleTextEventsGenerated}
                    onWhisperXDataGenerated={handleWhisperXDataGenerated}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Review Step */}
          {currentStep === 'review' && (
            <div ref={metadataRef} className="space-y-6">
              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">Review & Metadata</h2>
                <MetadataFormComponent
                  initialData={metadata}
                  onSubmit={(data) => {
                    setMetadata(data)
                    setIsMetadataComplete(true)
                  }}
                />
              </div>

              {/* Graph Statistics */}
              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">Graph Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{Object.keys(session?.nodes || {}).length}</div>
                    <div className="text-sm text-muted-foreground">Nodes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{allPaths.length}</div>
                    <div className="text-sm text-muted-foreground">Paths</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentPath.moves.length}</div>
                    <div className="text-sm text-muted-foreground">Current Depth</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{variations.length}</div>
                    <div className="text-sm text-muted-foreground">Variations</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export Step */}
          {currentStep === 'export' && (
            <div ref={exportRef} className="space-y-6">
              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">Export</h2>
                <div className="space-y-4">
                  <p>Your chess lesson is ready to export!</p>
                  <div className="flex gap-4 flex-wrap">
                    <button
                      onClick={handleExport}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                    >
                      Download CMF File
                    </button>
                    {session?.audioBlob && (
                      <button
                        onClick={handleAudioExport}
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                      >
                        Export Audio
                      </button>
                    )}
                    {session?.whisperXData && (
                      <button
                        onClick={handleExportTranscript}
                        className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium"
                      >
                        Export Transcript
                      </button>
                    )}
                    <button
                      onClick={handleReset}
                      className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
                    >
                      Start New Lesson
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => {
                const steps: StudioStep[] = ['setup', 'recording', 'review', 'export']
                const currentIndex = steps.indexOf(currentStep)
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1])
                }
              }}
              disabled={currentStep === 'setup'}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <button
              onClick={() => {
                const steps: StudioStep[] = ['setup', 'recording', 'review', 'export']
                const currentIndex = steps.indexOf(currentStep)
                if (currentIndex < steps.length - 1) {
                  setCurrentStep(steps[currentIndex + 1])
                }
              }}
              disabled={currentStep === 'export' || (currentStep === 'review' && !isMetadataComplete)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
