'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { LiveTranscriptionDisplay } from '@/components/transcription/LiveTranscriptionDisplay';
import { LiveResponseSuggestions } from '@/components/responses/LiveResponseSuggestions';
import { ConnectionStatus } from '@/components/websocket/ConnectionStatus';
import { ContextPanel } from '@/components/context/ContextPanel';
import { AudioCapturePanel } from '@/components/AudioCapturePanel';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { 
  TranscriptionData, 
  ResponseOption, 
  JobContext, 
  UserProfile, 
  ProcessingStatus 
} from '@/types/ui.types';
import { TranscriptionResult, ResponseSuggestion } from '@/types/websocket.types';
import { AudioChunk } from '@/types/audio.types';
import { Play, Square, Pause, Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface InterviewSessionProps {
  sessionId: string;
  jobContext: JobContext;
  userProfile: UserProfile;
  authToken: string;
  onSessionEnd?: () => void;
}

export function InterviewSession({
  sessionId,
  jobContext,
  userProfile,
  authToken,
  onSessionEnd
}: InterviewSessionProps) {
  // WebSocket connection
  const {
    isConnected,
    isConnecting,
    error: wsError,
    transcriptions: wsTranscriptions,
    responseSuggestions: wsResponses,
    sessionUsers,
    connect,
    disconnect,
    joinSession,
    leaveSession,
    streamAudio,
    requestTranscription,
    updateSessionStatus,
    clearError,
    clearTranscriptions,
    clearResponseSuggestions
  } = useWebSocket({ autoConnect: false, token: authToken });

  // Audio capture
  const {
    isCapturing,
    audioLevel,
    error: audioError,
    startCapture,
    stopCapture,
    clearError: clearAudioError
  } = useAudioCapture();

  // Local state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionData[]>([]);
  const [responses, setResponses] = useState<ResponseOption[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isListening: false,
    isTranscribing: false,
    isGeneratingResponse: false,
    lastUpdate: new Date()
  });

  // Connection status tracking
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastReconnectTime, setLastReconnectTime] = useState<Date | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Audio streaming
  const audioStreamIntervalRef = useRef<NodeJS.Timeout>();
  const lastAudioChunkRef = useRef<AudioChunk | null>(null);

  // Convert WebSocket transcriptions to UI format
  const convertTranscription = useCallback((wsTranscription: TranscriptionResult): TranscriptionData => {
    return {
      id: wsTranscription.requestId || `${Date.now()}-${Math.random()}`,
      text: wsTranscription.text,
      confidence: wsTranscription.confidence,
      isFinal: wsTranscription.status === 'final',
      timestamp: new Date(wsTranscription.timestamp).getTime(),
      speakerId: wsTranscription.speakerId
    };
  }, []);

  // Convert WebSocket responses to UI format
  const convertResponse = useCallback((wsResponse: ResponseSuggestion): ResponseOption => {
    return {
      id: wsResponse.id,
      content: wsResponse.content,
      structure: wsResponse.structure,
      estimatedDuration: wsResponse.estimatedDuration,
      confidence: wsResponse.confidence,
      tags: wsResponse.tags
    };
  }, []);

  // Update transcriptions from WebSocket
  useEffect(() => {
    const newTranscriptions = wsTranscriptions.map(convertTranscription);
    setTranscriptions(newTranscriptions);
  }, [wsTranscriptions, convertTranscription]);

  // Update responses from WebSocket
  useEffect(() => {
    const newResponses = wsResponses.map(convertResponse);
    setResponses(newResponses);
    
    // Update processing status when responses arrive
    if (newResponses.length > 0) {
      setProcessingStatus(prev => ({
        ...prev,
        isGeneratingResponse: false,
        lastUpdate: new Date()
      }));
    }
  }, [wsResponses, convertResponse]);

  // Handle connection establishment
  const handleConnect = useCallback(async () => {
    try {
      setConnectionAttempts(prev => prev + 1);
      await connect(authToken);
      
      // Join the session once connected
      if (sessionId) {
        joinSession(sessionId);
      }
      
      setConnectionAttempts(0);
      clearError();
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      
      // Implement exponential backoff for reconnection
      if (connectionAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
        setLastReconnectTime(new Date());
        
        reconnectTimeoutRef.current = setTimeout(() => {
          handleConnect();
        }, delay);
      }
    }
  }, [authToken, sessionId, connect, joinSession, clearError, connectionAttempts]);

  // Auto-connect on mount
  useEffect(() => {
    handleConnect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Handle audio data streaming
  const handleAudioData = useCallback((audioChunk: AudioChunk) => {
    if (!isConnected || !sessionActive) return;

    // Convert audio chunk to WebSocket format
    const wsAudioChunk = {
      audioData: btoa(String.fromCharCode(...new Uint8Array(audioChunk.data))),
      requestId: `${Date.now()}-${Math.random()}`,
      format: 'pcm',
      sampleRate: audioChunk.sampleRate,
      timestamp: new Date().toISOString()
    };

    // Stream audio and request transcription
    streamAudio(wsAudioChunk);
    requestTranscription(wsAudioChunk);
    
    lastAudioChunkRef.current = audioChunk;
    
    // Update processing status
    setProcessingStatus(prev => ({
      ...prev,
      isTranscribing: true,
      lastUpdate: new Date()
    }));
  }, [isConnected, sessionActive, streamAudio, requestTranscription]);

  // Start interview session
  const handleStartSession = useCallback(async () => {
    try {
      if (!isConnected) {
        await handleConnect();
      }

      // Start audio capture
      await startCapture({
        onAudioData: handleAudioData,
        sampleRate: 16000,
        channelCount: 1
      });

      setSessionActive(true);
      setSessionPaused(false);
      
      // Update session status
      updateSessionStatus({ status: 'active' });
      
      setProcessingStatus(prev => ({
        ...prev,
        isListening: true,
        lastUpdate: new Date()
      }));

      // Clear previous data
      clearTranscriptions();
      clearResponseSuggestions();
      setTranscriptions([]);
      setResponses([]);

    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }, [isConnected, handleConnect, startCapture, handleAudioData, updateSessionStatus, clearTranscriptions, clearResponseSuggestions]);

  // Pause session
  const handlePauseSession = useCallback(() => {
    setSessionPaused(true);
    updateSessionStatus({ status: 'paused' });
    
    setProcessingStatus(prev => ({
      ...prev,
      isListening: false,
      isTranscribing: false,
      lastUpdate: new Date()
    }));
  }, [updateSessionStatus]);

  // Resume session
  const handleResumeSession = useCallback(() => {
    setSessionPaused(false);
    updateSessionStatus({ status: 'active' });
    
    setProcessingStatus(prev => ({
      ...prev,
      isListening: true,
      lastUpdate: new Date()
    }));
  }, [updateSessionStatus]);

  // Stop session
  const handleStopSession = useCallback(async () => {
    try {
      await stopCapture();
      
      setSessionActive(false);
      setSessionPaused(false);
      
      // Update session status
      updateSessionStatus({ status: 'recording' });
      
      setProcessingStatus({
        isListening: false,
        isTranscribing: false,
        isGeneratingResponse: false,
        lastUpdate: new Date()
      });

      // Clear audio streaming interval
      if (audioStreamIntervalRef.current) {
        clearInterval(audioStreamIntervalRef.current);
      }

      onSessionEnd?.();
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  }, [stopCapture, updateSessionStatus, onSessionEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionActive) {
        handleStopSession();
      }
      
      leaveSession();
      disconnect();
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (audioStreamIntervalRef.current) {
        clearInterval(audioStreamIntervalRef.current);
      }
    };
  }, []);

  // Response handlers
  const handleCopyResponse = useCallback((response: ResponseOption) => {
    console.log('Copied response:', response.id);
  }, []);

  const handleEditResponse = useCallback((response: ResponseOption) => {
    console.log('Edit response:', response.id);
  }, []);

  const handleSelectResponse = useCallback((response: ResponseOption) => {
    console.log('Selected response:', response.id);
  }, []);

  // Connection status indicator
  const getConnectionStatus = () => {
    if (isConnecting) {
      return { icon: Wifi, color: 'text-yellow-500', text: 'Connecting...' };
    } else if (isConnected) {
      return { icon: Wifi, color: 'text-green-500', text: 'Connected' };
    } else {
      return { icon: WifiOff, color: 'text-red-500', text: 'Disconnected' };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <ConnectionStatus
        isConnected={isConnected}
        isConnecting={isConnecting}
        error={wsError}
        sessionUsers={sessionUsers}
        connectionAttempts={connectionAttempts}
        maxAttempts={5}
        lastReconnectTime={lastReconnectTime}
        onRetryConnection={handleConnect}
        onClearError={clearError}
      />

      {/* Audio Error */}
      {audioError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Audio Error</div>
                <div className="text-sm mt-1">{audioError.message}</div>
              </div>
              <Button size="sm" variant="outline" onClick={clearAudioError}>
                Clear Error
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Session Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Interview Session</span>
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <connectionStatus.icon className={`h-4 w-4 ${connectionStatus.color}`} />
                <span className="text-sm text-gray-600">{connectionStatus.text}</span>
              </div>
              
              {/* Session Users */}
              {sessionUsers.length > 0 && (
                <Badge variant="outline">
                  {sessionUsers.length} user{sessionUsers.length !== 1 ? 's' : ''} online
                </Badge>
              )}
              
              {/* Session Controls */}
              <div className="flex items-center space-x-2">
                {!sessionActive ? (
                  <Button 
                    onClick={handleStartSession} 
                    disabled={!isConnected}
                    className="flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>Start Session</span>
                  </Button>
                ) : (
                  <>
                    {!sessionPaused ? (
                      <Button 
                        onClick={handlePauseSession}
                        variant="secondary"
                        className="flex items-center space-x-2"
                      >
                        <Pause className="h-4 w-4" />
                        <span>Pause</span>
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleResumeSession}
                        className="flex items-center space-x-2"
                      >
                        <Play className="h-4 w-4" />
                        <span>Resume</span>
                      </Button>
                    )}
                    
                    <Button 
                      onClick={handleStopSession} 
                      variant="destructive"
                      className="flex items-center space-x-2"
                    >
                      <Square className="h-4 w-4" />
                      <span>Stop Session</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AudioCapturePanel />
        </CardContent>
      </Card>

      {/* Main Interview Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Transcription */}
        <div className="lg:col-span-1">
          <Card className="h-[600px]">
            <LiveTranscriptionDisplay
              transcriptions={transcriptions}
              isActive={sessionActive && !sessionPaused}
              autoScroll={true}
              showConfidence={true}
              showTimestamps={true}
              className="h-full"
            />
          </Card>
        </div>

        {/* Middle Column - Response Suggestions */}
        <div className="lg:col-span-1">
          <Card className="h-[600px]">
            <LiveResponseSuggestions
              responses={responses}
              isGenerating={processingStatus.isGeneratingResponse}
              onCopyResponse={handleCopyResponse}
              onEditResponse={handleEditResponse}
              onSelectResponse={handleSelectResponse}
              enableNotifications={true}
              className="h-full"
            />
          </Card>
        </div>

        {/* Right Column - Context */}
        <div className="lg:col-span-1">
          <ContextPanel
            jobContext={jobContext}
            userProfile={userProfile}
            className="h-[600px] overflow-y-auto"
          />
        </div>
      </div>

      {/* Session Statistics */}
      {sessionActive && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-900">Connection</div>
                <div className={connectionStatus.color}>
                  {connectionStatus.text}
                </div>
              </div>
              
              <div className="text-center">
                <div className="font-medium text-gray-900">Transcriptions</div>
                <div className="text-gray-600">{transcriptions.length}</div>
              </div>
              
              <div className="text-center">
                <div className="font-medium text-gray-900">Responses</div>
                <div className="text-gray-600">{responses.length}</div>
              </div>
              
              <div className="text-center">
                <div className="font-medium text-gray-900">Status</div>
                <div className="text-gray-600">
                  {sessionPaused ? 'Paused' : sessionActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reconnection Status */}
      {!isConnected && connectionAttempts > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">
                  Reconnecting... (Attempt {connectionAttempts}/5)
                </span>
              </div>
              
              {lastReconnectTime && (
                <span className="text-xs text-gray-500">
                  Last attempt: {lastReconnectTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}