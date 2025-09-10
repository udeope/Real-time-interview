'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription } from '../ui/Alert';
import { Wifi, WifiOff, Send, Mic, MessageSquare } from 'lucide-react';

interface WebSocketTestPanelProps {
  authToken: string;
  sessionId: string;
}

export function WebSocketTestPanel({ authToken, sessionId }: WebSocketTestPanelProps) {
  const {
    isConnected,
    isConnecting,
    error,
    transcriptions,
    responseSuggestions,
    sessionUsers,
    connect,
    disconnect,
    joinSession,
    leaveSession,
    streamAudio,
    requestTranscription,
    updateSessionStatus,
    clearError
  } = useWebSocket({ autoConnect: false, token: authToken });

  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runConnectionTest = async () => {
    addTestResult('Starting connection test...');
    try {
      await connect(authToken);
      addTestResult('✅ Connection successful');
    } catch (error) {
      addTestResult(`❌ Connection failed: ${error}`);
    }
  };

  const runSessionTest = async () => {
    if (!isConnected) {
      addTestResult('❌ Not connected - cannot test session');
      return;
    }

    addTestResult('Starting session test...');
    try {
      joinSession(sessionId);
      addTestResult('✅ Joined session successfully');
      
      setTimeout(() => {
        leaveSession();
        addTestResult('✅ Left session successfully');
      }, 2000);
    } catch (error) {
      addTestResult(`❌ Session test failed: ${error}`);
    }
  };

  const runAudioStreamTest = () => {
    if (!isConnected) {
      addTestResult('❌ Not connected - cannot test audio streaming');
      return;
    }

    addTestResult('Starting audio stream test...');
    try {
      // Create mock audio data
      const mockAudioChunk = {
        audioData: btoa('mock-audio-data-for-testing'),
        requestId: `test-${Date.now()}`,
        format: 'pcm',
        sampleRate: 16000,
        timestamp: new Date().toISOString()
      };

      streamAudio(mockAudioChunk);
      addTestResult('✅ Audio stream sent successfully');
    } catch (error) {
      addTestResult(`❌ Audio stream test failed: ${error}`);
    }
  };

  const runTranscriptionTest = () => {
    if (!isConnected) {
      addTestResult('❌ Not connected - cannot test transcription');
      return;
    }

    addTestResult('Starting transcription test...');
    try {
      const mockAudioChunk = {
        audioData: btoa('mock-audio-for-transcription'),
        requestId: `transcription-test-${Date.now()}`,
        format: 'pcm',
        sampleRate: 16000,
        timestamp: new Date().toISOString()
      };

      requestTranscription(mockAudioChunk);
      addTestResult('✅ Transcription request sent successfully');
    } catch (error) {
      addTestResult(`❌ Transcription test failed: ${error}`);
    }
  };

  const runStatusUpdateTest = () => {
    if (!isConnected) {
      addTestResult('❌ Not connected - cannot test status update');
      return;
    }

    addTestResult('Starting status update test...');
    try {
      updateSessionStatus({ status: 'active' });
      addTestResult('✅ Status update sent successfully');
      
      setTimeout(() => {
        updateSessionStatus({ status: 'paused' });
        addTestResult('✅ Status update (paused) sent successfully');
      }, 1000);
    } catch (error) {
      addTestResult(`❌ Status update test failed: ${error}`);
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    addTestResult('🚀 Starting comprehensive WebSocket tests...');
    
    // Test 1: Connection
    await runConnectionTest();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Session management
    await runSessionTest();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Audio streaming
    runAudioStreamTest();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Transcription
    runTranscriptionTest();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 5: Status updates
    runStatusUpdateTest();
    
    addTestResult('🏁 All tests completed');
    setIsRunningTests(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <span>WebSocket Connection Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <Badge variant={isConnected ? 'success' : 'destructive'}>
                {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Session Users:</span>
              <Badge variant="outline">{sessionUsers.length} online</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Transcriptions:</span>
              <Badge variant="outline">{transcriptions.length} received</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Response Suggestions:</span>
              <Badge variant="outline">{responseSuggestions.length} received</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={clearError}>
                Clear
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button
              onClick={runConnectionTest}
              disabled={isRunningTests}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Wifi className="h-4 w-4" />
              <span>Connection</span>
            </Button>
            
            <Button
              onClick={runSessionTest}
              disabled={isRunningTests || !isConnected}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Session</span>
            </Button>
            
            <Button
              onClick={runAudioStreamTest}
              disabled={isRunningTests || !isConnected}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Mic className="h-4 w-4" />
              <span>Audio Stream</span>
            </Button>
            
            <Button
              onClick={runTranscriptionTest}
              disabled={isRunningTests || !isConnected}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Transcription</span>
            </Button>
            
            <Button
              onClick={runStatusUpdateTest}
              disabled={isRunningTests || !isConnected}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Status Update</span>
            </Button>
            
            <Button
              onClick={runAllTests}
              disabled={isRunningTests}
              className="flex items-center space-x-2"
            >
              {isRunningTests ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>Run All Tests</span>
            </Button>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <Button
              onClick={clearResults}
              variant="outline"
              size="sm"
            >
              Clear Results
            </Button>
            
            {isConnected ? (
              <Button
                onClick={disconnect}
                variant="destructive"
                size="sm"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={() => connect(authToken)}
                size="sm"
              >
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-500">No test results yet. Run some tests to see output here.</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Data Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transcriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Live Transcriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {transcriptions.length === 0 ? (
                <div className="text-gray-500 text-sm">No transcriptions received yet</div>
              ) : (
                transcriptions.slice(-5).map((transcription, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={transcription.status === 'final' ? 'success' : 'warning'}>
                        {transcription.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {Math.round(transcription.confidence * 100)}%
                      </span>
                    </div>
                    <div>{transcription.text}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Response Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle>Response Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {responseSuggestions.length === 0 ? (
                <div className="text-gray-500 text-sm">No response suggestions received yet</div>
              ) : (
                responseSuggestions.slice(-3).map((response, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">{response.structure}</Badge>
                      <span className="text-xs text-gray-500">
                        {response.estimatedDuration}s
                      </span>
                    </div>
                    <div className="truncate">{response.content}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}