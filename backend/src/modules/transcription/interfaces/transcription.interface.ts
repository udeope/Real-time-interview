import { Observable } from 'rxjs';

export interface TranscriptionResult {
  id: string;
  sessionId: string;
  interactionId?: string;
  audioChunkId: string;
  text: string;
  confidence: number;
  isFinal: boolean;
  provider: 'google' | 'whisper';
  language: string;
  speakerId?: string;
  startTime?: number;
  endTime?: number;
  alternatives?: AlternativeTranscription[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AlternativeTranscription {
  text: string;
  confidence: number;
}

export interface AudioChunk {
  id: string;
  sessionId: string;
  chunkIndex: number;
  audioData?: Buffer;
  audioUrl?: string;
  format: string;
  sampleRate: number;
  channels: number;
  duration?: number;
  size?: number;
  checksum?: string;
  processedAt?: Date;
  createdAt: Date;
}

export interface TranscriptionConfig {
  provider?: 'google' | 'whisper';
  language?: string;
  sampleRate?: number;
  channels?: number;
  format?: string;
  enableSpeakerDiarization?: boolean;
  enableProfanityFilter?: boolean;
  enableAutomaticPunctuation?: boolean;
  confidenceThreshold?: number;
}

export interface SpeakerInfo {
  speakerId: string;
  name?: string;
  confidence: number;
  startTime: number;
  endTime: number;
}

export interface TranscriptionQuality {
  wordErrorRate: number;
  averageConfidence: number;
  totalWords: number;
  correctWords: number;
  substitutions: number;
  deletions: number;
  insertions: number;
}

export interface CacheStats {
  hitCount: number;
  missCount: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
}

export interface ITranscriptionProvider {
  transcribeRealTime(audioStream: Observable<Buffer>, config: TranscriptionConfig): Observable<TranscriptionResult>;
  transcribeAudio(audioBuffer: Buffer, config: TranscriptionConfig): Promise<TranscriptionResult>;
  isAvailable(): Promise<boolean>;
  getProviderName(): string;
}

export interface IAudioProcessor {
  processAudioChunk(audioData: Buffer, format: string): Promise<Buffer>;
  convertFormat(audioData: Buffer, fromFormat: string, toFormat: string): Promise<Buffer>;
  extractAudioFeatures(audioData: Buffer): Promise<AudioFeatures>;
  validateAudioFormat(audioData: Buffer, expectedFormat: string): boolean;
}

export interface AudioFeatures {
  duration: number;
  sampleRate: number;
  channels: number;
  bitRate?: number;
  format: string;
  size: number;
}

export interface ISpeakerDiarization {
  identifySpeakers(audioData: Buffer, config: TranscriptionConfig): Promise<SpeakerInfo[]>;
  assignSpeakerToTranscription(transcription: TranscriptionResult, speakers: SpeakerInfo[]): TranscriptionResult;
}

export interface ITranscriptionCache {
  get(audioHash: string): Promise<TranscriptionResult | null>;
  set(audioHash: string, result: TranscriptionResult, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  getStats(): Promise<CacheStats>;
  cleanup(): Promise<void>;
}

export interface TranscriptionMetrics {
  latency: number;
  accuracy: number;
  confidence: number;
  provider: string;
  cacheHit: boolean;
  processingTime: number;
  audioSize: number;
  wordCount: number;
}