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

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Create FormData for OpenAI API
    const openaiFormData = new FormData()
    openaiFormData.append('file', file)
    openaiFormData.append('model', 'whisper-1')
    openaiFormData.append('response_format', 'verbose_json')
    openaiFormData.append('timestamp_granularities[]', 'segment')

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: openaiFormData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', errorData)
      
      return NextResponse.json(
        { error: 'Transcription failed', details: errorData },
        { status: response.status }
      )
    }

    const transcriptionData = await response.json()
    
    return NextResponse.json(transcriptionData)
  } catch (error) {
    console.error('Transcription error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
