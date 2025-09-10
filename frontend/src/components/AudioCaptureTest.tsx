'use client';

import React from 'react';
import { AudioCapturePanel } from './AudioCapturePanel';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAudioStreaming } from '@/hooks/useAudioStreaming';

export function AudioCaptureTest() {
  const { isConnected, streamAudio } = useWebSocket();
  
  const audioStreaming = useAudioStreaming({
    onAudioChunk: (chunk) => {
      if (isConnected) {
        streamAudio(chunk);
      }
    }
  });

  return (
    <div className="space-y-4">

      {/* WebSocket Status */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">WebSocket Status:</span>
          <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Audio Capture Panel */}
      <AudioCapturePanel
        streamToSocket={isConnected}
        onAudioChunk={audioStreaming.streamAudioChunk}
        onError={(error) => {
          console.error('Audio capture error:', error);
        }}
      />

      {/* Feature Status */}
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-medium text-green-900 mb-1">✅ Features Implemented</h4>
        <ul className="text-xs text-green-800 space-y-0.5">
          <li>• Device detection & enumeration</li>
          <li>• Permission handling & fallbacks</li>
          <li>• Socket.IO audio streaming</li>
          <li>• Format conversion (WAV, WebM)</li>
          <li>• Audio source selection UI</li>
          <li>• Real-time level monitoring</li>
        </ul>
      </div>
    </div>
  );
}