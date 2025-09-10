# Transcription Service Documentation

## Overview

The Transcription Service is a comprehensive backend module that provides real-time audio transcription capabilities for the AI Interview Assistant. It supports multiple transcription providers, caching, speaker diarization, and quality assessment.

## Features

### Core Functionality
- **Real-time transcription** using Google Speech-to-Text Streaming API
- **High-accuracy refinement** using OpenAI Whisper API
- **Hybrid processing** with automatic fallback between providers
- **Confidence scoring** and transcription quality assessment
- **Redis-based caching** for performance optimization
- **Basic speaker diarization** for multi-voice scenarios
- **Database storage** for transcription results and audio chunks

### API Endpoints

#### POST /transcription/transcribe
Transcribe a single audio chunk.

**Request Body:**
```json
{
  "sessionId": "string",
  "chunkIndex": 0,
  "audioData": "base64-encoded-audio",
  "format": "webm",
  "sampleRate": 16000,
  "channels": 1,
  "config": {
    "provider": "google",
    "language": "en-US",
    "enableSpeakerDiarization": false
  }
}
```

#### GET /transcription/session/:sessionId
Get all transcriptions for a session.

#### GET /transcription/interaction/:interactionId
Get transcriptions for a specific interaction.

#### POST /transcription/refine/:transcriptionId
Refine an existing transcription using Whisper for higher accuracy.

#### GET /transcription/quality/:sessionId
Assess transcription quality metrics for a session.

#### GET /transcription/cache/stats
Get cache performance statistics.

## Architecture

### Components

1. **TranscriptionService** - Main orchestration service
2. **GoogleSpeechService** - Google Speech-to-Text provider
3. **WhisperService** - OpenAI Whisper provider
4. **AudioProcessingService** - Audio format handling and processing
5. **SpeakerDiarizationService** - Basic speaker identification
6. **TranscriptionCacheService** - Redis and database caching
7. **TranscriptionRepository** - Database operations

### Database Schema

#### TranscriptionResult
- Stores transcription text, confidence, provider info
- Links to sessions and interactions
- Includes timing and speaker information

#### AudioChunk
- Stores audio data temporarily for processing
- Tracks format, sample rate, and processing status

#### TranscriptionCache
- Persistent cache for frequently transcribed audio
- Includes hit count and usage statistics

## Configuration

### Environment Variables
```bash
# Google Speech-to-Text
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json

# OpenAI Whisper
OPENAI_API_KEY=your-openai-api-key

# Redis Cache
REDIS_URL=redis://localhost:6379
```

### Provider Configuration
```typescript
const config: TranscriptionConfig = {
  provider: 'google', // or 'whisper'
  language: 'en-US',
  sampleRate: 16000,
  channels: 1,
  enableSpeakerDiarization: false,
  enableAutomaticPunctuation: true,
  confidenceThreshold: 0.8
};
```

## Performance Characteristics

### Latency Targets
- **Real-time transcription**: < 2 seconds end-to-end
- **Cache hits**: < 100ms
- **Provider fallback**: < 5 seconds

### Accuracy Metrics
- **Target WER**: < 5% (Word Error Rate)
- **Confidence threshold**: > 80%
- **Cache hit rate**: > 60% for common phrases

## Usage Examples

### Real-time Transcription
```typescript
const audioStream = new Observable<Buffer>(...);
const config = { provider: 'google', language: 'en-US' };

const transcriptionStream = transcriptionService.transcribeRealTime(
  'session-id',
  audioStream,
  config
);

transcriptionStream.subscribe(result => {
  console.log('Transcription:', result.text);
  console.log('Confidence:', result.confidence);
  console.log('Is Final:', result.isFinal);
});
```

### Single Audio Chunk
```typescript
const audioChunk = {
  sessionId: 'session-id',
  chunkIndex: 0,
  audioData: 'base64-encoded-audio',
  format: 'webm'
};

const result = await transcriptionService.transcribeAudioChunk(audioChunk);
console.log('Transcribed text:', result.text);
```

### Quality Assessment
```typescript
const quality = await transcriptionService.assessTranscriptionQuality('session-id');
console.log('Word Error Rate:', quality.wordErrorRate);
console.log('Average Confidence:', quality.averageConfidence);
```

## Error Handling

### Automatic Fallback
- Primary provider failure → Automatic switch to secondary provider
- Network timeouts → Retry with exponential backoff
- Rate limiting → Queue management and throttling

### Error Types
- `TranscriptionError` - Provider-specific errors
- `AudioProcessingError` - Audio format or processing issues
- `CacheError` - Redis or database cache issues

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern=transcription.service.spec.ts
```

### Integration Tests
```bash
npm run test:e2e -- --testNamePattern="Transcription"
```

## Monitoring

### Key Metrics
- Transcription latency (p95, p99)
- Provider availability and error rates
- Cache hit rates and performance
- Word Error Rate (WER) tracking
- User satisfaction scores

### Health Checks
- Provider connectivity tests
- Database and Redis connectivity
- Audio processing pipeline validation

## Future Enhancements

### Planned Features
- Advanced speaker diarization with voice profiles
- Custom vocabulary and domain-specific models
- Real-time translation capabilities
- Sentiment analysis integration
- Advanced noise reduction and audio enhancement

### Scalability Improvements
- Horizontal scaling with load balancing
- Distributed caching with Redis Cluster
- Streaming audio processing optimization
- GPU acceleration for Whisper processing