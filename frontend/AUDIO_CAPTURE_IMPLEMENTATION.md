# Audio Capture System Implementation

## Overview

This document describes the implementation of the frontend audio capture system with Web Audio API as specified in task 6 of the AI Interview Assistant project.

## Implemented Components

### 1. Core Services

#### AudioCaptureService (`src/lib/audio-capture.service.ts`)
- **Device Detection**: Automatically detects and enumerates available audio input devices
- **Permission Handling**: Manages microphone permissions with user-friendly fallbacks
- **Audio Streaming**: Captures real-time audio using Web Audio API
- **Error Recovery**: Provides intelligent error handling and recovery suggestions
- **Audio Level Monitoring**: Real-time audio level analysis with RMS and peak detection

**Key Features:**
- Supports microphone and system audio capture
- Automatic fallback between audio sources
- Real-time audio processing with ScriptProcessorNode
- Comprehensive error handling with recovery actions
- Audio level monitoring with visual feedback

#### AudioConverterService (`src/lib/audio-converter.service.ts`)
- **Format Conversion**: Converts audio between WebM, WAV formats
- **Resampling**: Audio resampling for different sample rates
- **Compression**: Basic audio compression utilities
- **WAV Generation**: Creates WAV files from raw audio data with proper headers

**Supported Formats:**
- ✅ WAV (uncompressed, always supported)
- ✅ WebM (when supported by browser)
- ❌ MP3 (requires additional library like lamejs)

#### AudioStreamingService (`src/lib/audio-streaming.service.ts`)
- **Socket.IO Integration**: Streams audio chunks via WebSocket
- **Buffering**: Intelligent buffering with configurable chunk sizes
- **Compression**: Optional audio compression before streaming
- **Statistics**: Real-time streaming statistics and performance metrics

### 2. React Hooks

#### useAudioCapture (`src/hooks/useAudioCapture.ts`)
- **State Management**: Manages audio capture state and lifecycle
- **Device Selection**: Handles audio source selection and switching
- **Error Handling**: Provides error states and recovery actions
- **Statistics**: Tracks capture statistics and performance metrics

**Returned State:**
```typescript
{
  isCapturing: boolean;
  isInitialized: boolean;
  availableSources: AudioSource[];
  selectedSource: AudioSource | null;
  audioLevel: AudioLevelData | null;
  error: AudioError | null;
  recoveryAction: AudioRecoveryAction | null;
  stats: CaptureStats;
}
```

#### useAudioStreaming (`src/hooks/useAudioStreaming.ts`)
- **Type Conversion**: Converts between audio and WebSocket chunk formats
- **Buffering**: Manages audio chunk buffering and flushing
- **Integration**: Seamless integration with WebSocket service

### 3. UI Components

#### AudioSourceSelector (`src/components/AudioSourceSelector.tsx`)
- **Device Enumeration**: Displays available audio sources in dropdown
- **Device Switching**: Allows users to switch between audio sources
- **Status Indicators**: Shows device availability and permission requirements
- **Responsive Design**: Mobile-friendly interface with proper accessibility

#### AudioLevelMonitor (`src/components/AudioLevelMonitor.tsx`)
- **Real-time Visualization**: Visual audio level meter with RMS and peak indicators
- **Status Display**: Shows capture status and audio quality
- **Peak Hold**: Peak level indicator with automatic decay
- **Compact Mode**: Simplified version for space-constrained layouts

#### AudioCapturePanel (`src/components/AudioCapturePanel.tsx`)
- **Complete Interface**: Full-featured audio capture control panel
- **Error Display**: User-friendly error messages and recovery instructions
- **Advanced Settings**: Optional advanced configuration and statistics
- **Integration Ready**: Designed for integration with WebSocket streaming

#### AudioCaptureTest (`src/components/AudioCaptureTest.tsx`)
- **Testing Interface**: Complete testing interface for audio capture
- **Feature Status**: Shows implemented features and current limitations
- **WebSocket Integration**: Demonstrates real-time streaming capabilities

### 4. Type Definitions

#### Audio Types (`src/types/audio.types.ts`)
- **AudioSource**: Device information and capabilities
- **AudioChunk**: Raw audio data with metadata
- **AudioLevelData**: Real-time audio level information
- **AudioError**: Comprehensive error types and recovery actions
- **ConversionOptions**: Audio format conversion parameters

## Implementation Details

### Device Detection and Enumeration
```typescript
// Automatically detects available audio sources
const sources = await audioCaptureService.detectAvailableSources();

// Supports multiple source types:
// - Microphone devices
// - System audio (where supported)
// - WebRTC streams
// - Plugin-based sources
```

### Permission Handling with Fallbacks
```typescript
// Graceful permission handling
try {
  await audioCaptureService.startCapture();
} catch (error) {
  const recovery = await audioCaptureService.handleAudioError(error);
  // Provides user-friendly instructions and fallback options
}
```

### Real-time Audio Streaming
```typescript
// Stream audio to WebSocket
const { streamAudioChunk } = useAudioStreaming({
  onAudioChunk: (chunk) => {
    webSocketService.streamAudio(chunk);
  }
});

// Automatic format conversion and buffering
audioCaptureService.onAudioData((chunk) => {
  streamAudioChunk(chunk); // Converts and streams automatically
});
```

### Audio Format Conversion
```typescript
// Convert audio chunks to different formats
const wavBlob = await audioConverterService.convertToFormat(audioData, {
  format: 'wav',
  sampleRate: 44100,
  bitRate: 128000
});

// Resample audio for different requirements
const resampledData = await audioConverterService.resampleAudio(
  audioBuffer, 48000, 44100
);
```

## Browser Compatibility

### Supported Features by Browser:
- **Chrome/Edge**: Full support for all features
- **Firefox**: Full support with minor WebRTC limitations
- **Safari**: Basic support, system audio may be limited
- **Mobile Browsers**: Microphone capture supported, system audio not available

### Required Permissions:
- **Microphone Access**: Required for all audio capture
- **HTTPS**: Required in production for security
- **User Gesture**: Initial capture must be triggered by user interaction

## Error Handling and Recovery

### Comprehensive Error Types:
- `PERMISSION_DENIED`: Microphone access denied
- `DEVICE_NOT_FOUND`: No audio input devices available
- `STREAM_INTERRUPTED`: Audio stream was interrupted
- `CONTEXT_ERROR`: Web Audio API initialization failed
- `CONVERSION_ERROR`: Audio format conversion failed

### Recovery Actions:
- **Show Instructions**: Step-by-step permission setup
- **Auto Detect**: Automatic device re-detection
- **Fallback**: Switch to alternative capture method
- **Retry**: Automatic retry with exponential backoff

## Performance Characteristics

### Latency Targets:
- **Audio Capture**: < 50ms from microphone to processing
- **Format Conversion**: < 100ms for typical chunk sizes
- **WebSocket Streaming**: < 200ms end-to-end including network

### Memory Usage:
- **Efficient Buffering**: Configurable chunk sizes (default 4KB)
- **Automatic Cleanup**: Proper resource management and cleanup
- **Memory Monitoring**: Built-in statistics and performance tracking

## Integration Examples

### Basic Audio Capture:
```typescript
function MyComponent() {
  const audioCapture = useAudioCapture({
    autoStart: false,
    onError: (error) => console.error('Audio error:', error)
  });

  return (
    <AudioCapturePanel
      onAudioChunk={(chunk) => {
        // Process audio chunk
        console.log('Received audio:', chunk);
      }}
    />
  );
}
```

### WebSocket Streaming:
```typescript
function StreamingComponent() {
  const { streamAudio } = useWebSocket();
  const audioStreaming = useAudioStreaming({
    onAudioChunk: streamAudio
  });

  return (
    <AudioCapturePanel
      streamToSocket={true}
      onAudioChunk={audioStreaming.streamAudioChunk}
    />
  );
}
```

## Testing and Validation

### Unit Tests:
- ✅ Device detection and enumeration
- ✅ Permission error handling
- ✅ Audio format conversion
- ✅ Type conversion between audio and WebSocket formats
- ✅ Error recovery action generation

### Integration Tests:
- ✅ Complete audio capture pipeline
- ✅ WebSocket streaming integration
- ✅ UI component interactions
- ✅ Cross-browser compatibility

## Requirements Compliance

This implementation satisfies all requirements from task 6:

### ✅ Device Detection and Enumeration
- Automatic detection of available audio input devices
- Support for microphone, system audio, and WebRTC sources
- Device capability assessment and availability checking

### ✅ Permission Handling with Fallbacks
- Graceful microphone permission requests
- User-friendly error messages and recovery instructions
- Automatic fallback to alternative capture methods

### ✅ Socket.IO Audio Streaming
- Real-time audio streaming via WebSocket
- Efficient buffering and chunk management
- Automatic format conversion for network transmission

### ✅ Audio Format Conversion
- WAV and WebM format support using Web Audio API
- Real-time format conversion utilities
- Configurable quality and compression settings

### ✅ Audio Source Selection Interface
- Intuitive dropdown interface for device selection
- Real-time device switching without interruption
- Visual indicators for device status and capabilities

### ✅ Audio Level Monitoring
- Real-time audio level visualization
- RMS and peak level indicators with proper decay
- Visual feedback for audio quality and input levels

All sub-tasks have been completed and the implementation is ready for integration with the transcription service (task 7).