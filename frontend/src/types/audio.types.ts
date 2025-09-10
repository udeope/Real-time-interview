export interface AudioSource {
  id: string;
  type: 'microphone' | 'system' | 'webrtc' | 'plugin';
  name: string;
  isAvailable: boolean;
  requiresPermission: boolean;
  deviceInfo?: MediaDeviceInfo;
}

export interface CaptureConfig {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  deviceId?: string;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  sampleRate: number;
  channelCount: number;
}

export interface AudioStream {
  id: string;
  mediaStream: MediaStream;
  audioContext: AudioContext;
  analyser: AnalyserNode;
  processor: ScriptProcessorNode | AudioWorkletNode;
}

export interface AudioLevelData {
  volume: number;
  peak: number;
  rms: number;
  timestamp: number;
}

export interface AudioRecoveryAction {
  action: 'SHOW_INSTRUCTIONS' | 'AUTO_DETECT' | 'FALLBACK' | 'RETRY';
  fallback?: string;
  message: string;
  instructions?: string[];
}

export type AudioError = {
  type: 'PERMISSION_DENIED' | 'DEVICE_NOT_FOUND' | 'STREAM_INTERRUPTED' | 'CONTEXT_ERROR' | 'CONVERSION_ERROR';
  message: string;
  originalError?: Error;
};

export type AudioFormat = 'webm' | 'wav' | 'mp3';

export interface ConversionOptions {
  format: AudioFormat;
  bitRate?: number;
  sampleRate?: number;
  quality?: number;
}