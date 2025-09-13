# WebSocket Gateway Documentation

## Overview

The WebSocket gateway provides real-time communication capabilities for the AI Interview Assistant application. It enables bidirectional communication between the frontend and backend for audio streaming, transcription results, response suggestions, and session management.

## Architecture

### Backend Components

1. **InterviewGateway** (`src/modules/websocket/gateways/interview.gateway.ts`)
   - Main WebSocket gateway handling all real-time events
   - Namespace: `/interview`
   - Supports CORS for frontend integration

2. **WebSocketAuthService** (`src/modules/websocket/services/websocket-auth.service.ts`)
   - Handles JWT authentication for WebSocket connections
   - Supports multiple token sources (header, query, auth object)

3. **SessionManagerService** (`src/modules/websocket/services/session-manager.service.ts`)
   - Manages room-based sessions and user connections
   - Tracks active sessions and connection statistics
   - Automatic cleanup of inactive sessions

4. **WsAuthGuard** (`src/modules/websocket/guards/ws-auth.guard.ts`)
   - Protects WebSocket event handlers with authentication

### Frontend Components

1. **WebSocketService** (`src/lib/websocket.service.ts`)
   - Core WebSocket client service with reconnection logic
   - Event-driven architecture with type-safe handlers

2. **useWebSocket Hook** (`src/hooks/useWebSocket.ts`)
   - React hook for easy WebSocket integration
   - State management for connection, transcriptions, and suggestions

3. **WebSocketProvider** (`src/lib/websocket.context.tsx`)
   - React context provider for global WebSocket state

## Events

### Connection Events

- `connection:success` - Successful authentication and connection
- `connection:error` - Authentication or connection failure

### Session Events

- `session:join` - Join a session room
- `session:joined` - Successfully joined session
- `session:leave` - Leave current session
- `session:left` - Successfully left session
- `session:error` - Session-related errors
- `session:status` - Update session status
- `session:status:updated` - Session status changed

### User Events

- `user:joined` - User joined the session
- `user:left` - User left the session
- `user:disconnected` - User disconnected unexpectedly

### Audio Events

- `audio:stream` - Stream audio data to session
- `audio:received` - Receive audio from other users
- `audio:error` - Audio processing errors

### Transcription Events

- `transcription:request` - Request transcription for audio
- `transcription:result` - Transcription result (partial or final)
- `transcription:processing` - Transcription in progress
- `transcription:completed` - Transcription request completed
- `transcription:error` - Transcription processing errors
- `transcription:start` - Start real-time transcription for session
- `transcription:started` - Real-time transcription has started
- `transcription:stop` - Stop real-time transcription for session
- `transcription:stopped` - Real-time transcription has stopped
- `transcription:processing:error` - Error during transcription processing

### Response Events

- `responses:suggestions` - AI-generated response suggestions

## Real-time Transcription Integration

The WebSocket gateway integrates with the transcription service to provide real-time audio processing:

### Audio Streaming Modes

1. **Individual Chunk Processing**: Each audio chunk is processed separately
   - Use `audio:stream` or `transcription:request` events
   - Suitable for on-demand transcription
   - Lower resource usage

2. **Real-time Stream Processing**: Continuous audio stream processing
   - Use `transcription:start` to begin streaming
   - Send audio via `audio:stream` events
   - Use `transcription:stop` to end streaming
   - Higher accuracy for continuous speech

### Integration Flow

1. **Session Setup**: Client joins a session room
2. **Transcription Start**: Optional real-time transcription activation
3. **Audio Streaming**: Clients send audio chunks via WebSocket
4. **Processing**: Audio is processed by the transcription service
5. **Result Broadcasting**: Transcription results are broadcast to all session participants
6. **Error Handling**: Comprehensive error handling with fallback mechanisms

### Performance Optimizations

- **Stream Deduplication**: Prevents duplicate processing when real-time stream is active
- **Automatic Cleanup**: Stops transcription when all users leave a session
- **Fallback Providers**: Automatic fallback between Google Speech and Whisper
- **Timeout Handling**: 10-second timeout for transcription requests

## Authentication

WebSocket connections require JWT authentication. Tokens can be provided via:

1. **Authorization Header**: `Bearer <token>`
2. **Query Parameter**: `?token=<token>`
3. **Auth Object**: `{ auth: { token: '<token>' } }`

## Usage Examples

### Backend - Broadcasting Transcription

```typescript
// In a service
constructor(private readonly interviewGateway: InterviewGateway) {}

async broadcastTranscription(sessionId: string, transcription: TranscriptionResult) {
  this.interviewGateway.broadcastTranscription(sessionId, transcription);
}
```

### Frontend - Basic Connection

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function InterviewComponent() {
  const {
    isConnected,
    connect,
    joinSession,
    transcriptions,
    responseSuggestions,
  } = useWebSocket();

  useEffect(() => {
    if (authToken) {
      connect(authToken);
    }
  }, [authToken]);

  const handleJoinSession = () => {
    joinSession('session-123');
  };

  return (
    <div>
      <button onClick={handleJoinSession} disabled={!isConnected}>
        Join Session
      </button>
      {/* Display transcriptions and suggestions */}
    </div>
  );
}
```

### Frontend - Audio Streaming

```typescript
const { streamAudio, requestTranscription, startTranscription, stopTranscription } = useWebSocket();

// Stream audio chunk
const audioChunk = {
  audioData: 'base64-encoded-audio',
  format: 'webm',
  sampleRate: 44100,
};

// Individual transcription request
streamAudio(audioChunk);
requestTranscription(audioChunk);

// Real-time transcription
startTranscription({
  language: 'en-US',
  enableSpeakerDiarization: true,
});

// Send audio to real-time stream
streamAudio(audioChunk);

// Stop real-time transcription
stopTranscription();
```

## Error Handling

The WebSocket implementation includes comprehensive error handling:

1. **Connection Errors**: Automatic reconnection with exponential backoff
2. **Authentication Errors**: Clear error messages and disconnection
3. **Session Errors**: Graceful handling of invalid sessions
4. **Audio Errors**: Fallback mechanisms and user notifications

## Testing

### Unit Tests

- `websocket.service.spec.ts` - Tests for authentication and session management
- Located in `backend/src/modules/websocket/`

### Integration Tests

- `websocket.e2e-spec.ts` - End-to-end WebSocket functionality tests
- Located in `backend/test/`

### Frontend Testing

- Use the `WebSocketTest` component for manual testing
- Located in `frontend/src/components/WebSocketTest.tsx`

### Transcription Integration Testing

- `test-websocket-transcription.js` - Automated integration test script
- `test-websocket-transcription.ps1` - PowerShell wrapper for Windows
- Run with: `node scripts/test-websocket-transcription.js`

## Configuration

### Environment Variables

- `FRONTEND_URL` - Frontend URL for CORS configuration (default: http://localhost:3000)
- `JWT_SECRET` - JWT secret for token verification
- `JWT_EXPIRES_IN` - JWT expiration time (default: 7d)

### CORS Configuration

The WebSocket gateway is configured to accept connections from the frontend URL with credentials support.

## Performance Considerations

1. **Connection Pooling**: Automatic cleanup of inactive sessions every 5 minutes
2. **Memory Management**: Efficient tracking of user connections and sessions
3. **Reconnection Logic**: Exponential backoff to prevent server overload
4. **Event Throttling**: Built-in rate limiting through NestJS throttler

## Security Features

1. **JWT Authentication**: Required for all connections
2. **CORS Protection**: Configured for specific frontend origins
3. **Input Validation**: All event payloads validated with DTOs
4. **Session Isolation**: Users can only access their joined sessions

## Future Enhancements

1. **Audio Compression**: Implement audio compression for better performance
2. **Bandwidth Optimization**: Adaptive quality based on connection speed
3. **Multi-room Support**: Enhanced session management for multiple concurrent interviews
4. **Metrics Collection**: Real-time performance and usage metrics