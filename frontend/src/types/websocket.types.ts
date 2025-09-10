export interface AudioChunk {
  audioData: string; // Base64 encoded audio data
  requestId?: string;
  format?: string;
  sampleRate?: number;
  timestamp?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  status: 'partial' | 'final';
  requestId?: string;
  speakerId?: string;
  timestamp: string;
}

export interface SessionStatus {
  status: 'active' | 'paused' | 'recording' | 'processing';
  message?: string;
}

export interface ResponseSuggestion {
  id: string;
  content: string;
  structure: 'STAR' | 'direct' | 'technical';
  estimatedDuration: number;
  confidence: number;
  tags: string[];
}

export interface ConnectionInfo {
  message: string;
  userId: string;
  timestamp: string;
}

export interface UserJoined {
  userId: string;
  userName: string;
  timestamp: string;
}

export interface UserLeft {
  userId: string;
  timestamp: string;
}

export interface SessionJoined {
  sessionId: string;
  stats?: {
    totalConnections: number;
    uniqueUsers: number;
    createdAt: Date;
    lastActivity: Date;
  };
  timestamp: string;
}

export interface WebSocketError {
  message: string;
  error?: string;
  code?: string;
  timestamp: string;
}

export interface AudioReceived {
  userId: string;
  audioData: string;
  timestamp: string;
  format?: string;
  sampleRate?: number;
}

export interface SessionStatusUpdate {
  userId: string;
  status: string;
  timestamp: string;
}

export interface ResponseSuggestions {
  responses: ResponseSuggestion[];
  timestamp: string;
}

export interface TranscriptionProcessing {
  requestId: string;
  status: 'processing';
  timestamp: string;
}