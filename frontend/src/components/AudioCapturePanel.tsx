'use client';

import React, { useState } from 'react';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { AudioSourceSelector } from './AudioSourceSelector';
import { AudioLevelMonitor } from './AudioLevelMonitor';
import { AudioError, AudioRecoveryAction, AudioChunk } from '@/types/audio.types';
import { 
  Play, 
  Square, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Info,
  X
} from 'lucide-react';

interface AudioCapturePanelProps {
  streamToSocket?: boolean;
  onError?: (error: AudioError) => void;
  onAudioChunk?: (chunk: AudioChunk) => void;
  className?: string;
}

export function AudioCapturePanel({
  streamToSocket = false,
  onError,
  onAudioChunk,
  className = ''
}: AudioCapturePanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRecoveryInstructions, setShowRecoveryInstructions] = useState(false);

  const {
    isCapturing,
    isInitialized,
    availableSources,
    selectedSource,
    audioLevel,
    error,
    recoveryAction,
    stats,
    startCapture,
    stopCapture,
    selectSource,
    initializeAudio,
    executeRecoveryAction,
    isSupported,
    getPermissionStatus
  } = useAudioCapture({
    streamToSocket,
    onError,
    onAudioChunk,
    onRecoveryAction: (action) => {
      if (action.action === 'SHOW_INSTRUCTIONS') {
        setShowRecoveryInstructions(true);
      }
    }
  });

  const handleStartStop = async () => {
    if (isCapturing) {
      await stopCapture();
    } else {
      await startCapture();
    }
  };

  const handleRetry = async () => {
    if (recoveryAction) {
      await executeRecoveryAction(recoveryAction);
    } else {
      await initializeAudio();
    }
  };

  if (!isSupported()) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Audio capture not supported</span>
        </div>
        <p className="mt-2 text-sm text-red-700">
          Your browser doesn't support the Web Audio API required for real-time audio capture.
          Please use a modern browser like Chrome, Firefox, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Audio Capture</h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
        >
          <Settings className="w-4 h-4" />
          Advanced
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-red-800">{error.message}</div>
              {recoveryAction && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-red-700">{recoveryAction.message}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                    {recoveryAction.instructions && (
                      <button
                        onClick={() => setShowRecoveryInstructions(true)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm"
                      >
                        <Info className="w-3 h-3" />
                        Instructions
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recovery Instructions Modal */}
      {showRecoveryInstructions && recoveryAction?.instructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Setup Instructions</h4>
              <button
                onClick={() => setShowRecoveryInstructions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {recoveryAction.instructions.map((instruction, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700">{instruction}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowRecoveryInstructions(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowRecoveryInstructions(false);
                  handleRetry();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Source Selection */}
      {isInitialized && (
        <AudioSourceSelector
          sources={availableSources}
          selectedSource={selectedSource}
          onSourceSelect={selectSource}
          disabled={isCapturing}
        />
      )}

      {/* Audio Level Monitor */}
      <AudioLevelMonitor
        audioLevel={audioLevel}
        isCapturing={isCapturing}
        showNumericValues={showAdvanced}
      />

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleStartStop}
          disabled={!isInitialized || !selectedSource}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${isCapturing 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
            }
          `}
        >
          {isCapturing ? (
            <>
              <Square className="w-4 h-4" />
              Stop Capture
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Capture
            </>
          )}
        </button>

        {!isInitialized && (
          <button
            onClick={initializeAudio}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Initialize Audio
          </button>
        )}

        {isCapturing && streamToSocket && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Streaming to server
          </div>
        )}
      </div>

      {/* Advanced Stats */}
      {showAdvanced && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Statistics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Chunks Processed:</span>
              <span className="ml-2 font-mono">{stats.chunksProcessed}</span>
            </div>
            <div>
              <span className="text-gray-600">Duration:</span>
              <span className="ml-2 font-mono">
                {Math.floor(stats.totalDuration / 1000)}s
              </span>
            </div>
            <div>
              <span className="text-gray-600">Avg Level:</span>
              <span className="ml-2 font-mono">
                {(stats.averageLevel * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-600">Sources:</span>
              <span className="ml-2 font-mono">{availableSources.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}