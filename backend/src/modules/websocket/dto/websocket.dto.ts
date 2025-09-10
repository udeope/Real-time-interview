import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsArray } from 'class-validator';

export class JoinSessionDto {
  @IsString()
  sessionId: string;
}

export class AudioChunkDto {
  @IsString()
  audioData: string; // Base64 encoded audio data

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  format?: string; // 'webm', 'wav', 'mp3', etc.

  @IsOptional()
  @IsNumber()
  sampleRate?: number;

  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class TranscriptionResultDto {
  @IsString()
  text: string;

  @IsNumber()
  confidence: number;

  @IsString()
  @IsEnum(['partial', 'final'])
  status: 'partial' | 'final';

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  speakerId?: string;

  @IsDateString()
  timestamp: string;
}

export class SessionStatusDto {
  @IsString()
  @IsEnum(['active', 'paused', 'recording', 'processing'])
  status: 'active' | 'paused' | 'recording' | 'processing';

  @IsOptional()
  @IsString()
  message?: string;
}

export class ResponseSuggestionDto {
  @IsString()
  id: string;

  @IsString()
  content: string;

  @IsString()
  @IsEnum(['STAR', 'direct', 'technical'])
  structure: 'STAR' | 'direct' | 'technical';

  @IsNumber()
  estimatedDuration: number;

  @IsNumber()
  confidence: number;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

export class ErrorResponseDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsDateString()
  timestamp: string;
}

export class ConnectionSuccessDto {
  @IsString()
  message: string;

  @IsString()
  userId: string;

  @IsDateString()
  timestamp: string;
}

export class UserJoinedDto {
  @IsString()
  userId: string;

  @IsString()
  userName: string;

  @IsDateString()
  timestamp: string;
}

export class UserLeftDto {
  @IsString()
  userId: string;

  @IsDateString()
  timestamp: string;
}

export class SessionJoinedDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  stats?: {
    totalConnections: number;
    uniqueUsers: number;
    createdAt: Date;
    lastActivity: Date;
  };

  @IsDateString()
  timestamp: string;
}