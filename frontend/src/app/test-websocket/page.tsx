'use client';

import { useState, useEffect } from 'react';
import { WebSocketTestPanel } from '@/components/websocket/WebSocketTestPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { AlertCircle } from 'lucide-react';

export default function TestWebSocketPage() {
  const [authToken, setAuthToken] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Try to get auth token from localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
    } else {
      // Generate a test token for development
      setAuthToken('test-token-' + Date.now());
    }

    // Generate a test session ID
    setSessionId('test-session-' + Date.now());
    setIsReady(true);
  }, []);

  const generateNewSession = () => {
    setSessionId('test-session-' + Date.now());
  };

  const generateNewToken = () => {
    const newToken = 'test-token-' + Date.now();
    setAuthToken(newToken);
    localStorage.setItem('authToken', newToken);
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading WebSocket test environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">WebSocket Integration Test</h1>
          <p className="mt-2 text-gray-600">
            Test real-time WebSocket communication between frontend and backend services.
          </p>
        </div>

        {/* Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auth Token
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Enter auth token"
                  />
                  <Button size="sm" onClick={generateNewToken}>
                    Generate New
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session ID
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Enter session ID"
                  />
                  <Button size="sm" onClick={generateNewSession}>
                    Generate New
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Test Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Ensure the backend server is running on http://localhost:3001</li>
                <li>Click "Run All Tests" to execute comprehensive WebSocket tests</li>
                <li>Monitor the test results and real-time data panels</li>
                <li>Individual tests can be run separately for debugging</li>
                <li>Check browser console for additional debugging information</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        {/* WebSocket Test Panel */}
        {authToken && sessionId && (
          <WebSocketTestPanel
            authToken={authToken}
            sessionId={sessionId}
          />
        )}

        {/* Backend Status Check */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Backend Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>API Server:</span>
                <span className="text-sm text-gray-600">http://localhost:3001</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>WebSocket Namespace:</span>
                <span className="text-sm text-gray-600">/interview</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Expected Services:</span>
                <div className="text-sm text-gray-600">
                  <div>• Authentication</div>
                  <div>• Session Management</div>
                  <div>• Audio Streaming</div>
                  <div>• Transcription</div>
                  <div>• Response Generation</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Notes */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Development Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Task 11 Implementation:</strong> This page tests the real-time WebSocket 
                communication implementation for the AI Interview Assistant.
              </p>
              
              <p>
                <strong>Features Tested:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>WebSocket connection with authentication</li>
                <li>Session management (join/leave)</li>
                <li>Real-time audio streaming</li>
                <li>Transcription request/response flow</li>
                <li>Session status synchronization</li>
                <li>Error handling and reconnection</li>
                <li>User presence and activity tracking</li>
              </ul>
              
              <p>
                <strong>Requirements Covered:</strong> 2.1 (real-time transcription), 
                5.1 (real-time display), 5.2 (WebSocket communication)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}