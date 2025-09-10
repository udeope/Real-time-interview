/**
 * WebSocket Integration Tests
 * 
 * These tests verify that the WebSocket communication components
 * work correctly with the backend services.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketService } from '@/lib/websocket.service';
import { AudioChunk, TranscriptionResult } from '@/types/websocket.types';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocol: string;
  
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string, protocol?: string) {
    this.url = url;
    this.protocol = protocol || '';
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    
    // Echo back for testing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data }));
      }
    }, 5);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  addEventListener(type: string, listener: EventListener) {
    switch (type) {
      case 'open':
        this.onopen = listener as (event: Event) => void;
        break;
      case 'close':
        this.onclose = listener as (event: CloseEvent) => void;
        break;
      case 'message':
        this.onmessage = listener as (event: MessageEvent) => void;
        break;
      case 'error':
        this.onerror = listener as (event: Event) => void;
        break;
    }
  }

  removeEventListener(type: string, listener: EventListener) {
    switch (type) {
      case 'open':
        this.onopen = null;
        break;
      case 'close':
        this.onclose = null;
        break;
      case 'message':
        this.onmessage = null;
        break;
      case 'error':
        this.onerror = null;
        break;
    }
  }
}

// Mock Socket.IO
const mockSocket = {
  connected: false,
  id: 'test-socket-id',
  
  connect: vi.fn(() => {
    mockSocket.connected = true;
    return mockSocket;
  }),
  
  disconnect: vi.fn(() => {
    mockSocket.connected = false;
  }),
  
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  onAny: vi.fn(),
  
  // Simulate events
  simulateEvent: (event: string, data: any) => {
    const handlers = mockSocket.on.mock.calls
      .filter(call => call[0] === event)
      .map(call => call[1]);
    
    handlers.forEach(handler => handler(data));
  }
};

const mockIo = vi.fn(() => mockSocket);

// Mock modules
vi.mock('socket.io-client', () => ({
  io: mockIo
}));

describe('WebSocket Integration', () => {
  let wsService: WebSocketService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    wsService = new WebSocketService('http://localhost:3001', '/interview');
  });

  afterEach(() => {
    wsService.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect to WebSocket server with authentication', async () => {
      const token = 'test-auth-token';
      
      // Mock successful connection
      setTimeout(() => {
        mockSocket.connected = true;
        mockSocket.simulateEvent('connection:success', {
          message: 'Connected successfully',
          userId: 'test-user-id'
        });
      }, 20);

      await wsService.connect(token);
      
      expect(mockIo).toHaveBeenCalledWith('http://localhost:3001/interview', {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });
      
      expect(wsService.isConnected()).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      const token = 'invalid-token';
      
      // Mock connection error
      setTimeout(() => {
        mockSocket.simulateEvent('connection:error', {
          message: 'Authentication failed'
        });
      }, 20);

      await expect(wsService.connect(token)).rejects.toThrow('Authentication failed');
      expect(wsService.isConnected()).toBe(false);
    });

    it('should implement automatic reconnection with exponential backoff', async () => {
      const token = 'test-token';
      
      // Connect first
      setTimeout(() => {
        mockSocket.connected = true;
        mockSocket.simulateEvent('connection:success', {
          message: 'Connected successfully',
          userId: 'test-user-id'
        });
      }, 20);

      await wsService.connect(token);
      expect(wsService.isConnected()).toBe(true);

      // Simulate disconnection
      mockSocket.connected = false;
      mockSocket.simulateEvent('disconnect', 'transport close');

      // Should attempt to reconnect
      expect(mockSocket.connect).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      // Ensure connected for session tests
      setTimeout(() => {
        mockSocket.connected = true;
        mockSocket.simulateEvent('connection:success', {
          message: 'Connected successfully',
          userId: 'test-user-id'
        });
      }, 20);

      await wsService.connect('test-token');
    });

    it('should join a session room', () => {
      const sessionId = 'test-session-123';
      
      wsService.joinSession(sessionId);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('session:join', { sessionId });
    });

    it('should leave current session', () => {
      wsService.leaveSession();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('session:leave');
    });

    it('should handle session events', () => {
      const sessionJoinedHandler = vi.fn();
      const userJoinedHandler = vi.fn();
      
      wsService.on('session:joined', sessionJoinedHandler);
      wsService.on('user:joined', userJoinedHandler);

      // Simulate session events
      mockSocket.simulateEvent('session:joined', {
        sessionId: 'test-session',
        stats: { totalConnections: 1, uniqueUsers: 1 },
        timestamp: new Date().toISOString()
      });

      mockSocket.simulateEvent('user:joined', {
        userId: 'other-user',
        userName: 'Other User',
        timestamp: new Date().toISOString()
      });

      expect(sessionJoinedHandler).toHaveBeenCalled();
      expect(userJoinedHandler).toHaveBeenCalled();
    });
  });

  describe('Audio Streaming', () => {
    beforeEach(async () => {
      setTimeout(() => {
        mockSocket.connected = true;
        mockSocket.simulateEvent('connection:success', {
          message: 'Connected successfully',
          userId: 'test-user-id'
        });
      }, 20);

      await wsService.connect('test-token');
    });

    it('should stream audio data to server', () => {
      const audioChunk: AudioChunk = {
        audioData: 'base64-encoded-audio-data',
        requestId: 'audio-request-123',
        format: 'pcm',
        sampleRate: 16000,
        timestamp: new Date().toISOString()
      };

      wsService.streamAudio(audioChunk);

      expect(mockSocket.emit).toHaveBeenCalledWith('audio:stream', audioChunk);
    });

    it('should request transcription for audio', () => {
      const audioChunk: AudioChunk = {
        audioData: 'base64-encoded-audio-data',
        requestId: 'transcription-request-456',
        format: 'pcm',
        sampleRate: 16000,
        timestamp: new Date().toISOString()
      };

      wsService.requestTranscription(audioChunk);

      expect(mockSocket.emit).toHaveBeenCalledWith('transcription:request', audioChunk);
    });

    it('should handle audio errors', () => {
      const errorHandler = vi.fn();
      wsService.on('audio:error', errorHandler);

      mockSocket.simulateEvent('audio:error', {
        message: 'Audio processing failed',
        timestamp: new Date().toISOString()
      });

      expect(errorHandler).toHaveBeenCalledWith({
        message: 'Audio processing failed',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Transcription Events', () => {
    beforeEach(async () => {
      setTimeout(() => {
        mockSocket.connected = true;
        mockSocket.simulateEvent('connection:success', {
          message: 'Connected successfully',
          userId: 'test-user-id'
        });
      }, 20);

      await wsService.connect('test-token');
    });

    it('should receive transcription results', () => {
      const transcriptionHandler = vi.fn();
      wsService.on('transcription:result', transcriptionHandler);

      const transcriptionResult: TranscriptionResult = {
        text: 'Hello, this is a test transcription',
        confidence: 0.95,
        status: 'final',
        requestId: 'transcription-request-456',
        speakerId: 'interviewer',
        timestamp: new Date().toISOString()
      };

      mockSocket.simulateEvent('transcription:result', transcriptionResult);

      expect(transcriptionHandler).toHaveBeenCalledWith(transcriptionResult);
    });

    it('should handle partial transcription updates', () => {
      const transcriptionHandler = vi.fn();
      wsService.on('transcription:result', transcriptionHandler);

      const partialResult: TranscriptionResult = {
        text: 'Hello, this is a partial...',
        confidence: 0.8,
        status: 'partial',
        requestId: 'transcription-request-789',
        timestamp: new Date().toISOString()
      };

      mockSocket.simulateEvent('transcription:result', partialResult);

      expect(transcriptionHandler).toHaveBeenCalledWith(partialResult);
    });

    it('should handle transcription processing status', () => {
      const processingHandler = vi.fn();
      wsService.on('transcription:processing', processingHandler);

      mockSocket.simulateEvent('transcription:processing', {
        requestId: 'transcription-request-789',
        status: 'processing',
        timestamp: new Date().toISOString()
      });

      expect(processingHandler).toHaveBeenCalled();
    });
  });

  describe('Response Suggestions', () => {
    beforeEach(async () => {
      setTimeout(() => {
        mockSocket.connected = true;
        mockSocket.simulateEvent('connection:success', {
          message: 'Connected successfully',
          userId: 'test-user-id'
        });
      }, 20);

      await wsService.connect('test-token');
    });

    it('should receive response suggestions', () => {
      const responseHandler = vi.fn();
      wsService.on('responses:suggestions', responseHandler);

      const suggestions = {
        responses: [
          {
            id: 'response-1',
            content: 'I have extensive experience with React...',
            structure: 'STAR' as const,
            estimatedDuration: 75,
            confidence: 0.92,
            tags: ['React', 'Experience']
          }
        ],
        timestamp: new Date().toISOString()
      };

      mockSocket.simulateEvent('responses:suggestions', suggestions);

      expect(responseHandler).toHaveBeenCalledWith(suggestions);
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket connection timeout', async () => {
      const token = 'test-token';
      
      // Don't simulate connection success - let it timeout
      await expect(wsService.connect(token)).rejects.toThrow('Connection timeout');
    });

    it('should throw error when not connected', () => {
      expect(() => {
        wsService.joinSession('test-session');
      }).toThrow('Not connected to WebSocket server');

      expect(() => {
        wsService.streamAudio({
          audioData: 'test-data',
          timestamp: new Date().toISOString()
        });
      }).toThrow('Not connected to WebSocket server');
    });

    it('should clean up event handlers on disconnect', () => {
      const handler = vi.fn();
      wsService.on('transcription:result', handler);
      
      wsService.disconnect();
      
      // Verify handlers are cleaned up
      expect(wsService['eventHandlers'].size).toBe(0);
    });
  });

  describe('Event Handler Management', () => {
    it('should add and remove event handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsService.on('transcription:result', handler1);
      wsService.on('transcription:result', handler2);

      // Remove specific handler
      wsService.off('transcription:result', handler1);

      // Simulate event
      mockSocket.simulateEvent('transcription:result', {
        text: 'test',
        confidence: 0.9,
        status: 'final',
        timestamp: new Date().toISOString()
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should remove all handlers for an event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsService.on('transcription:result', handler1);
      wsService.on('transcription:result', handler2);

      wsService.removeAllListeners('transcription:result');

      // Simulate event
      mockSocket.simulateEvent('transcription:result', {
        text: 'test',
        confidence: 0.9,
        status: 'final',
        timestamp: new Date().toISOString()
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });
});