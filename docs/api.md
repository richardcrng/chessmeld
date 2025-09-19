# API Documentation

This document describes the API endpoints available in the Chessmeld unified application.

## 🌐 Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## 📡 Endpoints

### Transcription Services

#### POST `/api/transcribe/whisperx`

Transcribe audio using WhisperX model.

**Request:**
```typescript
// FormData with audio file
const formData = new FormData();
formData.append('audio', audioFile);
formData.append('model', 'whisperx'); // Optional
```

**Response:**
```typescript
interface WhisperXResponse {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
  language: string;
  duration: number;
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/transcribe/whisperx \
  -F "audio=@lesson.wav" \
  -F "model=whisperx"
```

#### POST `/api/transcribe/whisper`

Transcribe audio using standard Whisper model.

**Request:**
```typescript
// FormData with audio file
const formData = new FormData();
formData.append('audio', audioFile);
```

**Response:**
```typescript
interface WhisperResponse {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language: string;
}
```

#### POST `/api/transcribe/huggingface`

Transcribe audio using Hugging Face Whisper model.

**Request:**
```typescript
// FormData with audio file
const formData = new FormData();
formData.append('audio', audioFile);
```

**Response:**
```typescript
interface HuggingFaceResponse {
  text: string;
  chunks: Array<{
    timestamp: [number, number];
    text: string;
  }>;
}
```

## 🔧 Usage Examples

### JavaScript/TypeScript

```typescript
// Transcribe audio file
async function transcribeAudio(audioFile: File) {
  const formData = new FormData();
  formData.append('audio', audioFile);
  
  const response = await fetch('/api/transcribe/whisperx', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// Usage
const audioFile = document.getElementById('audio-input').files[0];
const result = await transcribeAudio(audioFile);
console.log('Transcription:', result.text);
```

### React Hook

```typescript
import { useState } from 'react';

function useTranscription() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const transcribe = async (audioFile: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      
      const response = await fetch('/api/transcribe/whisperx', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  return { transcribe, isLoading, error };
}
```

## 🛠️ Implementation Details

### File Upload Handling

All transcription endpoints accept audio files via FormData:

```typescript
// Supported formats
const supportedFormats = [
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/ogg',
  'audio/webm',
  'audio/m4a'
];

// File size limits
const maxFileSize = 25 * 1024 * 1024; // 25MB
```

### Error Handling

```typescript
interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Common error responses
const errors = {
  400: 'Bad Request - Invalid audio file or parameters',
  413: 'Payload Too Large - File size exceeds limit',
  415: 'Unsupported Media Type - Invalid audio format',
  500: 'Internal Server Error - Transcription service unavailable',
  503: 'Service Unavailable - Model not available'
};
```

### Rate Limiting

- **WhisperX**: 10 requests per minute
- **Whisper**: 20 requests per minute  
- **Hugging Face**: 5 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1640995200
```

## 🔐 Authentication

Currently, the API endpoints are open. Future versions may include:

- API key authentication
- User-based rate limiting
- Usage tracking and billing

## 📊 Monitoring

### Health Check

```bash
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "whisperx": "available",
    "whisper": "available",
    "huggingface": "available"
  }
}
```

### Metrics

The API provides basic metrics:

- Request count per endpoint
- Average response time
- Error rate
- File size distribution

## 🚀 Deployment

### Environment Variables

```env
# Optional: Custom model configurations
WHISPERX_MODEL=whisperx
WHISPER_MODEL=whisper-1
HUGGINGFACE_MODEL=openai/whisper-base

# Optional: Rate limiting
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW=60000

# Optional: File storage
MAX_FILE_SIZE=26214400
UPLOAD_DIR=/tmp/uploads
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## 🔄 Migration Notes

The API endpoints were migrated from the original monorepo structure:

- **Before**: Separate API routes in `apps/studio/src/app/api/`
- **After**: Unified API routes in `src/app/api/`
- **Benefits**: Simplified deployment, shared configuration, unified error handling

## 📚 Related Documentation

- [CMF Format Specification](./cmf-format.md)
- [Development Guide](./development.md)
- [Deployment Guide](./deployment.md)
