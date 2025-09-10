import { useEffect, useRef, useCallback, useState } from 'react';
import { getWebSocketService, WebSocketEventHandlers } from '@/lib/websocket.service';
import {
  AudioChunk,
  SessionStatus,
  TranscriptionResult,
  ResponseSuggestion,
  WebSocketError,
} from '@/types/websocket.types';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  token?: string;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  currentSession: string | null;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { autoConnect = false, token } = options;
  const wsService = useRef(getWebSocketService());
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    currentSession: null,
  });

  // Event handlers state
  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([]);
  const [responseSuggestions, setResponseSuggestions] = useState<ResponseSuggestion[]>([]);
  const [sessionUsers, setSessionUsers] = useState<Set<string>>(new Set());

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) {
      setState(prev => ({ ...prev, error: 'No authentication token provided' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      await wsService.current.connect(tokenToUse);
      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false, 
        error: null 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      }));
    }
  }, [token]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    wsService.current.disconnect();
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      currentSession: null,
    });
    setTranscriptions([]);
    setResponseSuggestions([]);
    setSessionUsers(new Set());
  }, []);

  /**
   * Join a session
   */
  const joinSession = useCallback((sessionId: string) => {
    try {
      wsService.current.joinSession(sessionId);
      setState(prev => ({ ...prev, currentSession: sessionId }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to join session' 
      }));
    }
  }, []);

  /**
   * Leave current session
   */
  const leaveSession = useCallback(() => {
    try {
      wsService.current.leaveSession();
      setState(prev => ({ ...prev, currentSession: null }));
      setSessionUsers(new Set());
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to leave session' 
      }));
    }
  }, []);

  /**
   * Stream audio data
   */
  const streamAudio = useCallback((audioChunk: AudioChunk) => {
    try {
      wsService.current.streamAudio(audioChunk);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to stream audio' 
      }));
    }
  }, []);

  /**
   * Request transcription
   */
  const requestTranscription = useCallback((audioChunk: AudioChunk) => {
    try {
      wsService.current.requestTranscription(audioChunk);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to request transcription' 
      }));
    }
  }, []);

  /**
   * Update session status
   */
  const updateSessionStatus = useCallback((status: SessionStatus) => {
    try {
      wsService.current.updateSessionStatus(status);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update session status' 
      }));
    }
  }, []);

  /**
   * Add event listener
   */
  const addEventListener = useCallback(<K extends keyof WebSocketEventHandlers>(
    event: K,
    handler: WebSocketEventHandlers[K]
  ) => {
    wsService.current.on(event, handler);
    
    // Return cleanup function
    return () => {
      wsService.current.off(event, handler);
    };
  }, []);

  // Setup default event handlers
  useEffect(() => {
    const ws = wsService.current;

    // Connection events
    const handleConnectionSuccess = () => {
      setState(prev => ({ ...prev, isConnected: true, error: null }));
    };

    const handleConnectionError = (error: WebSocketError) => {
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        error: error.message 
      }));
    };

    // Session events
    const handleSessionJoined = (data: any) => {
      setState(prev => ({ ...prev, currentSession: data.sessionId }));
    };

    const handleSessionLeft = () => {
      setState(prev => ({ ...prev, currentSession: null }));
      setSessionUsers(new Set());
    };

    const handleSessionError = (error: WebSocketError) => {
      setState(prev => ({ ...prev, error: error.message }));
    };

    // User events
    const handleUserJoined = (data: any) => {
      setSessionUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(data.userId);
        return newSet;
      });
    };

    const handleUserLeft = (data: any) => {
      setSessionUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    };

    // Transcription events
    const handleTranscriptionResult = (data: TranscriptionResult) => {
      setTranscriptions(prev => {
        // Replace partial transcriptions or add new ones
        if (data.status === 'partial' && data.requestId) {
          const filtered = prev.filter(t => t.requestId !== data.requestId);
          return [...filtered, data];
        }
        return [...prev, data];
      });
    };

    // Response events
    const handleResponseSuggestions = (data: any) => {
      setResponseSuggestions(data.responses);
    };

    // Register event handlers
    ws.on('connection:success', handleConnectionSuccess);
    ws.on('connection:error', handleConnectionError);
    ws.on('session:joined', handleSessionJoined);
    ws.on('session:left', handleSessionLeft);
    ws.on('session:error', handleSessionError);
    ws.on('user:joined', handleUserJoined);
    ws.on('user:left', handleUserLeft);
    ws.on('user:disconnected', handleUserLeft);
    ws.on('transcription:result', handleTranscriptionResult);
    ws.on('responses:suggestions', handleResponseSuggestions);

    // Cleanup function
    return () => {
      ws.off('connection:success', handleConnectionSuccess);
      ws.off('connection:error', handleConnectionError);
      ws.off('session:joined', handleSessionJoined);
      ws.off('session:left', handleSessionLeft);
      ws.off('session:error', handleSessionError);
      ws.off('user:joined', handleUserJoined);
      ws.off('user:left', handleUserLeft);
      ws.off('user:disconnected', handleUserLeft);
      ws.off('transcription:result', handleTranscriptionResult);
      ws.off('responses:suggestions', handleResponseSuggestions);
    };
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && token && !state.isConnected && !state.isConnecting) {
      connect();
    }
  }, [autoConnect, token, connect, state.isConnected, state.isConnecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isConnected) {
        disconnect();
      }
    };
  }, []);

  return {
    // State
    ...state,
    transcriptions,
    responseSuggestions,
    sessionUsers: Array.from(sessionUsers),
    
    // Actions
    connect,
    disconnect,
    joinSession,
    leaveSession,
    streamAudio,
    requestTranscription,
    updateSessionStatus,
    addEventListener,
    
    // Utilities
    clearError: () => setState(prev => ({ ...prev, error: null })),
    clearTranscriptions: () => setTranscriptions([]),
    clearResponseSuggestions: () => setResponseSuggestions([]),
  };
};