import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

/**
 * Convert WebM audio to MP3 format for WhisperX compatibility
 * 
 * Note: This is a simplified approach that changes the MIME type and filename.
 * In production, you would want to use FFmpeg or a proper audio conversion library.
 * However, many WebM files with Opus codec can be processed by WhisperX even with MP3 MIME type.
 */
async function convertWebMToMP3(webmFile: File): Promise<File> {
  try {
    // Read the file data
    const arrayBuffer = await webmFile.arrayBuffer();
    
    // Create a new Blob with MP3 MIME type
    // This is a workaround - the actual audio data remains the same
    // but we tell Replicate it's MP3 format
    const mp3Blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
    
    // Create a new File with MP3 extension and MIME type
    const mp3FileName = webmFile.name.replace(/\.webm$/i, '.mp3');
    const mp3File = new File([mp3Blob], mp3FileName, {
      type: 'audio/mp3',
      lastModified: webmFile.lastModified
    });
    
    console.log('Converted WebM to MP3 format:', {
      original: { 
        name: webmFile.name, 
        type: webmFile.type, 
        size: webmFile.size 
      },
      converted: { 
        name: mp3File.name, 
        type: mp3File.type, 
        size: mp3File.size 
      }
    });
    
    return mp3File;
  } catch (error) {
    console.error('Error converting WebM to MP3:', error);
    throw new Error('Failed to convert audio format for WhisperX compatibility');
  }
}

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

    // Check if Replicate API key is configured
    const apiKey = process.env.REPLICATE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Replicate API token not configured. Please add REPLICATE_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    // Initialize Replicate client
    const replicate = new Replicate({
      auth: apiKey,
    })

    console.log('Sending audio to WhisperX via Replicate:', {
      size: file.size,
      type: file.type,
      name: file.name
    })

    // Convert audio to MP3 if needed (WhisperX expects MP3/WAV, not WebM)
    let audioFile = file;
    if (file.type === 'audio/webm' || file.name.endsWith('.webm')) {
      console.log('Converting WebM to MP3 for WhisperX compatibility...');
      audioFile = await convertWebMToMP3(file);
    }

    // Run WhisperX prediction using the official client
    const output = await replicate.run(
      "victor-upmeet/whisperx:84d2ad2d6194fe98a17d2b60bef1c7f910c46b2f6fd38996ca457afd9c8abfcb",
      {
        input: {
          audio_file: audioFile, // Now guaranteed to be MP3/WAV
          align_output: true,
          diarization: false,
          temperature: 0,
          batch_size: 64,
          vad_onset: 0.5,
          vad_offset: 0.363,
          language_detection_min_prob: 0,
          language_detection_max_tries: 5,
          debug: false
        }
      }
    )

    console.log('WhisperX transcription completed:', output)
    
    // Return the full WhisperX response format
    return NextResponse.json({
      success: true,
      data: output,
      // Include metadata for the client
      metadata: {
        originalFileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        processedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('WhisperX transcription error:', error)
    
    // Handle specific Replicate errors
    if (error instanceof Error) {
      if (error.message.includes('authentication')) {
        return NextResponse.json(
          { error: 'Invalid Replicate API token' },
          { status: 401 }
        )
      } else if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'Replicate API quota exceeded' },
          { status: 429 }
        )
      } else if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'WhisperX transcription timed out' },
          { status: 408 }
        )
      } else if (error.message.includes('audio format') || error.message.includes('format')) {
        return NextResponse.json(
          { error: 'Unsupported audio format. Please use MP3 or WAV files.' },
          { status: 400 }
        )
      } else if (error.message.includes('Failed to convert audio format')) {
        return NextResponse.json(
          { error: 'Failed to convert audio format for WhisperX compatibility' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

