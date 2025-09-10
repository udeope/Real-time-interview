import { io, Socket } from 'socket.io-client';
import {
  AudioChunk,
  TranscriptionResult,
  SessionStatus,
  ConnectionInfo,
  UserJoined,
  UserLeft,
  SessionJoined,
  WebSocketError,
  AudioReceived,
  SessionStatusUpdate,
  ResponseSuggestions,
  TranscriptionProcessing,
} from '@/types/websocket.types';

export type WebSocketEventHandlers = {
  // Connection events
  'connection:success': (data: ConnectionInfo) => void;
  'connection:error': (data: WebSocketError) => void;
  
  // Session events
  'session:joined': (data: SessionJoined) => void;
  'session:left': (data: { sessionId: string; timestamp: string }) => void;
  'session:error': (data: WebSocketError) => void;
  'session:status:updated': (data: SessionStatusUpdate) => void;
  
  // User events
  'user:joined': (data: UserJoined) => void;
  'user:left': (data: UserLeft) => void;
  'user:disconnected': (data: UserLeft) => void;
  
  // Audio events
  'audio:received': (data: AudioReceived) => void;
  'audio:error': (data: WebSocketError) => void;
  
  // Transcription events
  'transcription:result': (data: TranscriptionResult) => void;
  'transcription:processing': (data: TranscriptionProcessing) => void;
  'transcription:error': (data: WebSocketError) => void;
  
  // Response events
  'responses:suggestions': (data: ResponseSuggestions) => void;
};

export class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<keyof WebSocketEventHandlers, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor(
    private baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    private namespace: string = '/interview'
  ) {}

  /**
   * Connect to the WebSocket server
   */
  async connect(token: string): Promise<void> {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      return;
    }

    this.isConnecting = true;

    try {
      this.socket = io(`${this.baseUrl}${this.namespace}`, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      this.setupEventListeners();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket!.on('connection:success', () => {
          clearTimeout(timeout);
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve();
        });

        this.socket!.on('connection:error', (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          reject(new Error(error.message || 'Connection failed'));
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          reject(error);
        });
      });
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Join a session room
   */
  joinSession(sessionId: string): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to WebSocket server');
    }
    
    this.socket.emit('session:join', { sessionId });
  }

  /**
   * Leave current session
   */
  leaveSession(): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to WebSocket server');
    }
    
    this.socket.emit('session:leave');
  }

  /**
   * Stream audio data
   */
  streamAudio(audioChunk: AudioChunk): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to WebSocket server');
    }
    
    this.socket.emit('audio:stream', audioChunk);
  }

  /**
   * Request transcription for audio
   */
  requestTranscription(audioChunk: AudioChunk): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to WebSocket server');
    }
    
    this.socket.emit('transcription:request', audioChunk);
  }

  /**
   * Update session status
   */
  updateSessionStatus(status: SessionStatus): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to WebSocket server');
    }
    
    this.socket.emit('session:status', status);
  }

  /**
   * Add event listener
   */
  on<K extends keyof WebSocketEventHandlers>(
    event: K,
    handler: WebSocketEventHandlers[K]
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof WebSocketEventHandlers>(
    event: K,
    handler: WebSocketEventHandlers[K]
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Remove all event listeners for an event
   */
  removeAllListeners<K extends keyof WebSocketEventHandlers>(event?: K): void {
    if (event) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
    }
  }

  /**
   * Setup internal event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnection();
    });

    // Setup custom event listeners
    (Object.keys(this.eventHandlers) as Array<keyof WebSocketEventHandlers>)
      .forEach(event => {
        this.socket!.on(event as string, (data: any) => {
          this.emitToHandlers(event, data);
        });
      });

    // Dynamic event listener setup for new handlers
    this.socket.onAny((event: string, data: any) => {
      if (this.eventHandlers.has(event as keyof WebSocketEventHandlers)) {
        this.emitToHandlers(event as keyof WebSocketEventHandlers, data);
      }
    });
  }

  /**
   * Emit event to all registered handlers
   */
  private emitToHandlers<K extends keyof WebSocketEventHandlers>(
    event: K,
    data: any
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }
}

// Singleton instance
let webSocketService: WebSocketService | null = null;

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService();
  }
  return webSocketService;
};