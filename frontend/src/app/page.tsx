'use client';

import { WebSocketTest } from '@/components/WebSocketTest';
import { AudioCaptureTest } from '@/components/AudioCaptureTest';
import { WebSocketProvider } from '@/lib/websocket.context';

export default function Home() {
  return (
    <WebSocketProvider>
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Interview Assistant</h1>
            <p className="text-lg text-gray-600">
              Real-time transcription and intelligent response generation
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* WebSocket Test */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">WebSocket Connection</h2>
              <WebSocketTest />
            </div>

            {/* Audio Capture Test */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Audio Capture System</h2>
              <AudioCaptureTest />
            </div>
          </div>
        </div>
      </main>
    </WebSocketProvider>
  );
}