'use client';

import React, { useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export const WebSocketTest: React.FC = () => {
  const [token, setToken] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [message, setMessage] = useState('');

  const {
    isConnected,
    isConnecting,
    error,
    currentSession,
    transcriptions,
    responseSuggestions,
    sessionUsers,
    connect,
    disconnect,
    joinSession,
    leaveSession,
    updateSessionStatus,
    clearError,
  } = useWebSocket();

  const handleConnect = async () => {
    if (token) {
      await connect(token);
    }
  };

  const handleJoinSession = () => {
    if (sessionId) {
      joinSession(sessionId);
    }
  };

  const handleUpdateStatus = () => {
    updateSessionStatus({
      status: 'active',
      message: message || 'Test status update',
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">WebSocket Test Interface</h1>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
        <div className="space-y-2">
          <div className={`inline-block px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 
            isConnecting ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
          </div>
          {currentSession && (
            <div className="text-sm text-gray-600">
              Current Session: {currentSession}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {error}
              <button 
                onClick={clearError}
                className="ml-2 text-red-800 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connection Controls */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Connection Controls</h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="JWT Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={handleConnect}
              disabled={isConnecting || isConnected}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Connect
            </button>
            <button
              onClick={disconnect}
              disabled={!isConnected}
              className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* Session Controls */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Session Controls</h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Session ID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={handleJoinSession}
              disabled={!isConnected || !sessionId}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Join Session
            </button>
            <button
              onClick={leaveSession}
              disabled={!currentSession}
              className="px-4 py-2 bg-yellow-500 text-white rounded disabled:opacity-50"
            >
              Leave Session
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Status message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={handleUpdateStatus}
              disabled={!currentSession}
              className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
            >
              Update Status
            </button>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Session Information</h2>
        <div className="space-y-2">
          <div>
            <strong>Users in session:</strong> {sessionUsers.length}
            {sessionUsers.length > 0 && (
              <ul className="ml-4 mt-1">
                {sessionUsers.map(userId => (
                  <li key={userId} className="text-sm text-gray-600">• {userId}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Transcriptions */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Transcriptions ({transcriptions.length})</h2>
        <div className="max-h-40 overflow-y-auto space-y-2">
          {transcriptions.length === 0 ? (
            <p className="text-gray-500 text-sm">No transcriptions yet</p>
          ) : (
            transcriptions.map((transcription, index) => (
              <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                <div className="flex justify-between items-start">
                  <span className="flex-1">{transcription.text}</span>
                  <div className="ml-2 text-xs text-gray-500">
                    <div>{transcription.status}</div>
                    <div>{(transcription.confidence * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Response Suggestions */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Response Suggestions ({responseSuggestions.length})</h2>
        <div className="space-y-2">
          {responseSuggestions.length === 0 ? (
            <p className="text-gray-500 text-sm">No response suggestions yet</p>
          ) : (
            responseSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="p-3 bg-blue-50 rounded">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">{suggestion.structure}</span>
                  <div className="text-xs text-gray-500">
                    {suggestion.estimatedDuration}s • {(suggestion.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <p className="text-sm">{suggestion.content}</p>
                {suggestion.tags.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {suggestion.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};