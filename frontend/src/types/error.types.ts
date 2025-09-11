export type ErrorType = 
  // Audio Capture Errors
  | 'AUDIO_PERMISSION_DENIED'
  | 'AUDIO_DEVICE_NOT_FOUND'
  | 'AUDIO_STREAM_INTERRUPTED'
  | 'AUDIO_FORMAT_UNSUPPORTED'
  
  // Transcription Errors
  | 'TRANSCRIPTION_API_TIMEOUT'
  | 'TRANSCRIPTION_API_FAILURE'
  | 'TRANSCRIPTION_LOW_CONFIDENCE'
  | 'TRANSCRIPTION_RATE_LIMITED'
  
  // Response Generation Errors
  | 'LLM_API_FAILURE'
  | 'LLM_CONTEXT_MISSING'
  | 'LLM_RESPONSE_TOO_LONG'
  | 'LLM_RATE_LIMITED'
  
  // System Errors
  | 'DATABASE_CONNECTION_FAILED'
  | 'REDIS_CONNECTION_FAILED'
  | 'WEBSOCKET_CONNECTION_FAILED'
  | 'SERVICE_UNAVAILABLE'
  
  // Network Errors
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_UNREACHABLE'
  | 'API_QUOTA_EXCEEDED';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface UserMessage {
  title: string;
  message: string;
  instructions?: string[];
  actionButton?: {
    text: string;
    action: string;
  };
  severity: 'info' | 'warning' | 'error';
  canRetry: boolean;
  estimatedRecoveryTime?: string;
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

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  context: ErrorContext;
  recoveryAction: RecoveryAction;
  message?: string;
  originalError?: Error;
}