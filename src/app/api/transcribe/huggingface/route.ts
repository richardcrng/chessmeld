import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Check if Hugging Face API key is configured
    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Hugging Face API key not configured. Please add HUGGINGFACE_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    // Get the raw audio data for Hugging Face API
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)
    
    // Map unsupported formats to supported ones for Hugging Face
    let contentType = file.type || 'audio/webm'
    if (contentType === 'audio/mp4' || contentType === 'audio/mp4;codecs=opus') {
      // Hugging Face supports audio/webm, so we'll send the MP4 data with WebM content type
      // The audio data should still be readable by Hugging Face
      contentType = 'audio/webm'
      console.log('Mapped MP4 audio to WebM content type for Hugging Face compatibility')
    }
    
    console.log('Sending audio to Hugging Face:', {
      size: file.size,
      type: contentType,
      bufferLength: audioBuffer.length
    })

    // Call Hugging Face Inference API with raw audio data and parameters
    const response = await fetch(
      'https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo?return_timestamps=words',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': contentType,
        },
        body: audioBuffer,
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Hugging Face API error:', errorData)
      
      return NextResponse.json(
        { 
          error: 'Hugging Face transcription failed', 
          details: errorData,
          status: response.status 
        },
        { status: response.status }
      )
    }

    const transcriptionData = await response.json()
    console.log('Hugging Face response:', transcriptionData)
    
    // Handle the enhanced response format from Hugging Face
    if (Array.isArray(transcriptionData) && transcriptionData.length > 0) {
      // Single result format
      const result = transcriptionData[0]
      return NextResponse.json({
        text: result.text,
        chunks: result.chunks || [],
        language: result.language || 'en',
        duration: result.duration || 0
      })
    } else if (transcriptionData.text) {
      // Direct result format with enhanced timestamp processing
      const chunks = transcriptionData.chunks || []
      
      // Process chunks to ensure proper timestamp format
      const processedChunks = chunks.map((chunk: any, index: number) => {
        // If no timestamps are provided, estimate them based on text length and position
        let startTime = 0
        let endTime = 0
        
        if (chunk.timestamp && Array.isArray(chunk.timestamp) && chunk.timestamp.length >= 2) {
          startTime = chunk.timestamp[0] || 0
          endTime = chunk.timestamp[1] || 0
        } else if (chunk.start !== undefined && chunk.end !== undefined) {
          startTime = chunk.start
          endTime = chunk.end
        } else {
          // Fallback: estimate timing based on text length and position
          // Assume average speaking rate of 150 words per minute
          const wordsPerSecond = 150 / 60 // 2.5 words per second
          const wordCount = (chunk.text || '').split(/\s+/).length
          const estimatedDuration = wordCount / wordsPerSecond
          
          // Estimate start time based on previous chunks
          if (index > 0) {
            const prevChunk = processedChunks[index - 1]
            startTime = prevChunk.end || 0
          }
          endTime = startTime + estimatedDuration
        }
        
        return {
          text: chunk.text || '',
          timestamp: [startTime, endTime],
          start: startTime,
          end: endTime
        }
      })
      
      return NextResponse.json({
        text: transcriptionData.text,
        chunks: processedChunks,
        language: transcriptionData.language || 'en',
        duration: transcriptionData.duration || 0
      })
    } else {
      // Unexpected format
      console.error('Unexpected Hugging Face response format:', transcriptionData)
      return NextResponse.json(
        { error: 'Unexpected response format from Hugging Face API', data: transcriptionData },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Hugging Face transcription error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
