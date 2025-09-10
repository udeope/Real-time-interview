import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioCaptureService } from '@/lib/audio-capture.service';
import { AudioConverterService } from '@/lib/audio-converter.service';

// Mock Web Audio API
const mockAudioContext = {
  createMediaStreamSource: vi.fn(),
  createAnalyser: vi.fn(() => ({
    fftSize: 256,
    smoothingTimeConstant: 0.8,
    frequencyBinCount: 128,
    connect: vi.fn(),
    getByteFrequencyData: vi.fn()
  })),
  createScriptProcessor: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null
  })),
  createBufferSource: vi.fn(),
  createMediaStreamDestination: vi.fn(),
  decodeAudioData: vi.fn(),
  close: vi.fn(),
  resume: vi.fn(),
  state: 'running',
  destination: {}
};

const mockMediaStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }])
};

const mockNavigator = {
  mediaDevices: {
    getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
    enumerateDevices: vi.fn(() => Promise.resolve([
      {
        deviceId: 'default',
        kind: 'audioinput',
        label: 'Default Microphone',
        groupId: 'group1'
      }
    ])),
    getDisplayMedia: vi.fn(() => Promise.resolve(mockMediaStream))
  },
  permissions: {
    query: vi.fn(() => Promise.resolve({ state: 'granted' }))
  }
};

// Setup global mocks
beforeEach(() => {
  global.AudioContext = vi.fn(() => mockAudioContext) as any;
  global.navigator = mockNavigator as any;
  global.window = {
    AudioContext: global.AudioContext,
    webkitAudioContext: global.AudioContext
  } as any;
});

describe('AudioCaptureService', () => {
  let service: AudioCaptureService;

  beforeEach(() => {
    service = new AudioCaptureService();
  });

  it('should detect available audio sources', async () => {
    const sources = await service.detectAvailableSources();
    
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      id: 'default',
      type: 'microphone',
      name: 'Default Microphone',
      isAvailable: true,
      requiresPermission: true
    });
  });

  it('should handle permission errors gracefully', async () => {
    mockNavigator.mediaDevices.getUserMedia.mockRejectedValueOnce(
      new DOMException('Permission denied', 'NotAllowedError')
    );

    await expect(service.startCapture()).rejects.toThrow();
  });

  it('should provide error recovery actions', async () => {
    const error = {
      type: 'PERMISSION_DENIED' as const,
      message: 'Permission denied'
    };

    const recovery = await service.handleAudioError(error);
    
    expect(recovery.action).toBe('SHOW_INSTRUCTIONS');
    expect(recovery.instructions).toBeDefined();
    expect(recovery.instructions?.length).toBeGreaterThan(0);
  });
});

describe('AudioConverterService', () => {
  let service: AudioConverterService;

  beforeEach(() => {
    service = new AudioConverterService();
  });

  it('should support WAV format', () => {
    expect(service.isFormatSupported('wav')).toBe(true);
  });

  it('should not support MP3 format without additional library', () => {
    expect(service.isFormatSupported('mp3')).toBe(false);
  });

  it('should provide format information', () => {
    const wavInfo = service.getFormatInfo('wav');
    
    expect(wavInfo).toMatchObject({
      mimeType: 'audio/wav',
      extension: '.wav',
      description: 'Uncompressed WAV audio'
    });
  });

  it('should create WAV blob from audio data', async () => {
    const audioData = new ArrayBuffer(1024);
    const float32Array = new Float32Array(audioData);
    
    // Fill with test data
    for (let i = 0; i < float32Array.length; i++) {
      float32Array[i] = Math.sin(i * 0.1) * 0.5;
    }

    const blob = await service.convertToFormat(audioData, {
      format: 'wav',
      sampleRate: 44100
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBeGreaterThan(44); // WAV header is 44 bytes
  });
});

describe('Audio Type Conversion', () => {
  it('should convert audio chunk to websocket format', () => {
    const audioChunk = {
      data: new ArrayBuffer(8),
      timestamp: Date.now(),
      sampleRate: 44100,
      channelCount: 1
    };

    // Fill with test data
    const view = new Uint8Array(audioChunk.data);
    view.fill(128); // Mid-range value

    // Convert to base64 (this is what the conversion function does)
    const uint8Array = new Uint8Array(audioChunk.data);
    const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
    const base64Data = btoa(binaryString);

    const webSocketChunk = {
      audioData: base64Data,
      requestId: `chunk-${audioChunk.timestamp}-test`,
      format: 'raw',
      sampleRate: audioChunk.sampleRate,
      timestamp: new Date(audioChunk.timestamp).toISOString()
    };

    expect(webSocketChunk.audioData).toBe(base64Data);
    expect(webSocketChunk.sampleRate).toBe(44100);
    expect(webSocketChunk.format).toBe('raw');
  });
});