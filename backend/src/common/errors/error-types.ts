export enum ErrorType {
  // Audio Capture Errors
  AUDIO_PERMISSION_DENIED = 'AUDIO_PERMISSION_DENIED',
  AUDIO_DEVICE_NOT_FOUND = 'AUDIO_DEVICE_NOT_FOUND',
  AUDIO_STREAM_INTERRUPTED = 'AUDIO_STREAM_INTERRUPTED',
  AUDIO_FORMAT_UNSUPPORTED = 'AUDIO_FORMAT_UNSUPPORTED',

  // Transcription Errors
  TRANSCRIPTION_API_TIMEOUT = 'TRANSCRIPTION_API_TIMEOUT',
  TRANSCRIPTION_API_FAILURE = 'TRANSCRIPTION_API_FAILURE',
  TRANSCRIPTION_LOW_CONFIDENCE = 'TRANSCRIPTION_LOW_CONFIDENCE',
  TRANSCRIPTION_RATE_LIMITED = 'TRANSCRIPTION_RATE_LIMITED',

  // Response Generation Errors
  LLM_API_FAILURE = 'LLM_API_FAILURE',
  LLM_CONTEXT_MISSING = 'LLM_CONTEXT_MISSING',
  LLM_RESPONSE_TOO_LONG = 'LLM_RESPONSE_TOO_LONG',
  LLM_RATE_LIMITED = 'LLM_RATE_LIMITED',

  // System Errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  REDIS_CONNECTION_FAILED = 'REDIS_CONNECTION_FAILED',
  WEBSOCKET_CONNECTION_FAILED = 'WEBSOCKET_CONNECTION_FAILED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Network Errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  service: string;
  operation: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'manual' | 'ignore';
  description: string;
  automated: boolean;
  userMessage?: string;
  instructions?: string[];
}

export class AppError extends Error {
  constructor(
    public readonly type: ErrorType,
    public readonly severity: ErrorSeverity,
    public readonly context: ErrorContext,
    public readonly recoveryAction: RecoveryAction,
    message?: string,
    public readonly originalError?: Error,
  ) {
    super(message || type);
    this.name = 'AppError';
  }
}