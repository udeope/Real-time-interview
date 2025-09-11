import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum TranscriptionProvider {
  GOOGLE = 'google',
  WHISPER = 'whisper',
}

export enum AudioFormat {
  WEBM = 'webm',
  WAV = 'wav',
  MP3 = 'mp3',
  OGG = 'ogg',
}

export class TranscriptionConfigDto {
  @IsEnum(TranscriptionProvider)
  @IsOptional()
  provider?: TranscriptionProvider = TranscriptionProvider.GOOGLE;

  @IsString()
  @IsOptional()
  language?: string = 'en-US';

  @IsNumber()
  @Min(8000)
  @Max(48000)
  @IsOptional()
  sampleRate?: number = 16000;

  @IsNumber()
  @Min(1)
  @Max(2)
  @IsOptional()
  channels?: number = 1;

  @IsBoolean()
  @IsOptional()
  enableSpeakerDiarization?: boolean = false;

  @IsBoolean()
  @IsOptional()
  enableProfanityFilter?: boolean = false;

  @IsBoolean()
  @IsOptional()
  enableAutomaticPunctuation?: boolean = true;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  confidenceThreshold?: number = 0.8;
}

export class AudioChunkDto {
  @IsString()
  sessionId: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsNumber()
  @Min(0)
  chunkIndex: number;

  @IsString()
  audioData: string; // Base64 encoded

  @IsEnum(AudioFormat)
  @IsOptional()
  format?: AudioFormat = AudioFormat.WEBM;

  @IsNumber()
  @IsOptional()
  sampleRate?: number = 16000;

  @IsNumber()
  @IsOptional()
  channels?: number = 1;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @ValidateNested()
  @Type(() => TranscriptionConfigDto)
  @IsOptional()
  config?: TranscriptionConfigDto;
}

export class TranscriptionResultDto {
  @IsString()
  id: string;

  @IsString()
  sessionId: string;

  @IsString()
  @IsOptional()
  interactionId?: string;

  @IsString()
  audioChunkId: string;

  @IsString()
  text: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsBoolean()
  isFinal: boolean;

  @IsEnum(TranscriptionProvider)
  provider: TranscriptionProvider;

  @IsString()
  language: string;

  @IsString()
  @IsOptional()
  speakerId?: string;

  @IsNumber()
  @IsOptional()
  startTime?: number;

  @IsNumber()
  @IsOptional()
  endTime?: number;

  @IsArray()
  @IsOptional()
  alternatives?: AlternativeTranscription[];

  @IsOptional()
  metadata?: Record<string, any>;

  @Transform(({ value }) => new Date(value))
  createdAt: Date;
}

export class AlternativeTranscription {
  @IsString()
  text: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

export class SpeakerInfo {
  @IsString()
  speakerId: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsNumber()
  startTime: number;

  @IsNumber()
  endTime: number;
}

export class TranscriptionStreamDto {
  @IsString()
  sessionId: string;

  @ValidateNested()
  @Type(() => TranscriptionConfigDto)
  @IsOptional()
  config?: TranscriptionConfigDto;
}

export class TranscriptionQualityDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  wordErrorRate: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  averageConfidence: number;

  @IsNumber()
  @Min(0)
  totalWords: number;

  @IsNumber()
  @Min(0)
  correctWords: number;

  @IsNumber()
  @Min(0)
  substitutions: number;

  @IsNumber()
  @Min(0)
  deletions: number;

  @IsNumber()
  @Min(0)
  insertions: number;
}

export class CacheStatsDto {
  @IsNumber()
  @Min(0)
  hitCount: number;

  @IsNumber()
  @Min(0)
  missCount: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  hitRate: number;

  @IsNumber()
  @Min(0)
  totalRequests: number;

  @IsNumber()
  @Min(0)
  cacheSize: number;
}