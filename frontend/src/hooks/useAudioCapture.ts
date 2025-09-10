import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AudioSource, 
  CaptureConfig, 
  AudioChunk, 
  AudioLevelData, 
  AudioError, 
  AudioRecoveryAction 
} from '@/types/audio.types';
import { audioCaptureService } from '@/lib/audio-capture.service';
import { audioStreamingService } from '@/lib/audio-streaming.service';

export interface UseAudioCaptureOptions {
  autoStart?: boolean;
  streamToSocket?: boolean;
  onError?: (error: AudioError) => void;
  onRecoveryAction?: (action: AudioRecoveryAction) => void;
  onAudioChunk?: (chunk: AudioChunk) => void;
}

export interface AudioCaptureState {
  isCapturing: boolean;
  isInitialized: boolean;
  availableSources: AudioSource[];
  selectedSource: AudioSource | null;
  audioLevel: AudioLevelData | null;
  error: AudioError | null;
  recoveryAction: AudioRecoveryAction | null;
  stats: {
    chunksProcessed: number;
    totalDuration: number;
    averageLevel: number;
  };
}

export function useAudioCapture(options: UseAudioCaptureOptions = {}) {
  const [state, setState] = useState<AudioCaptureState>({
    isCapturing: false,
    isInitialized: false,
    availableSources: [],
    selectedSource: null,
    audioLevel: null,
    error: null,
    recoveryAction: null,
    stats: {
      chunksProcessed: 0,
      totalDuration: 0,
      averageLevel: 0
    }
  });

  const unsubscribeRefs = useRef<(() => void)[]>([]);
  const startTimeRef = useRef<number>(0);
  const levelHistoryRef = useRef<number[]>([]);

  // Initialize audio sources
  const initializeAudio = useCallback(async () => {
    try {
      const sources = await audioCaptureService.detectAvailableSources();
      setState(prev => ({
        ...prev,
        availableSources: sources,
        selectedSource: sources[0] || null,
        isInitialized: true,
        error: null
      }));
    } catch (error) {
      const audioError: AudioError = {
        type: 'DEVICE_NOT_FOUND',
        message: 'Failed to initialize audio system',
        originalError: error as Error
      };
      
      setState(prev => ({ ...prev, error: audioError, isInitialized: false }));
      options.onError?.(audioError);
    }
  }, [options]);

  // Start audio capture
  const startCapture = useCallback(async (config?: CaptureConfig) => {
    try {
      setState(prev => ({ ...prev, error: null, recoveryAction: null }));
      
      const audioStream = await audioCaptureService.startCapture(config);
      startTimeRef.current = Date.now();
      levelHistoryRef.current = [];
      
      setState(prev => ({
        ...prev,
        isCapturing: true,
        stats: { ...prev.stats, chunksProcessed: 0, totalDuration: 0, averageLevel: 0 }
      }));

      // Start streaming if enabled
      if (options.streamToSocket) {
        await audioStreamingService.startStreaming();
      }

    } catch (error) {
      const audioError = error as AudioError;
      const recoveryAction = await audioCaptureService.handleAudioError(audioError);
      
      setState(prev => ({ 
        ...prev, 
        error: audioError, 
        recoveryAction,
        isCapturing: false 
      }));
      
      options.onError?.(audioError);
      options.onRecoveryAction?.(recoveryAction);
    }
  }, [options]);

  // Stop audio capture
  const stopCapture = useCallback(async () => {
    try {
      await audioCaptureService.stopCapture();
      
      if (options.streamToSocket) {
        await audioStreamingService.stopStreaming();
      }

      const totalDuration = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      const averageLevel = levelHistoryRef.current.length > 0 
        ? levelHistoryRef.current.reduce((sum, level) => sum + level, 0) / levelHistoryRef.current.length
        : 0;

      setState(prev => ({
        ...prev,
        isCapturing: false,
        stats: {
          ...prev.stats,
          totalDuration,
          averageLevel
        }
      }));
    } catch (error) {
      console.error('Failed to stop capture:', error);
    }
  }, [options]);

  // Select audio source
  const selectSource = useCallback(async (source: AudioSource) => {
    const wasCapturing = state.isCapturing;
    
    if (wasCapturing) {
      await stopCapture();
    }

    setState(prev => ({ ...prev, selectedSource: source }));

    if (wasCapturing) {
      // Restart with new source
      await startCapture({ deviceId: source.id });
    }
  }, [state.isCapturing, stopCapture, startCapture]);

  // Handle recovery action
  const executeRecoveryAction = useCallback(async (action: AudioRecoveryAction) => {
    switch (action.action) {
      case 'RETRY':
        await startCapture();
        break;
      case 'AUTO_DETECT':
        await initializeAudio();
        break;
      case 'FALLBACK':
        // Implement fallback logic (e.g., switch to manual mode)
        console.log('Fallback to:', action.fallback);
        break;
      case 'SHOW_INSTRUCTIONS':
        // Instructions should be handled by the UI component
        break;
    }
  }, [startCapture, initializeAudio]);

  // Set up event listeners
  useEffect(() => {
    const unsubscribeAudioData = audioCaptureService.onAudioData((chunk: AudioChunk) => {
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          chunksProcessed: prev.stats.chunksProcessed + 1
        }
      }));

      // Call the callback if provided
      if (options.onAudioChunk) {
        options.onAudioChunk(chunk);
      }

      // Stream to socket if enabled (legacy support)
      if (options.streamToSocket) {
        audioStreamingService.streamAudioChunk(chunk);
      }
    });

    const unsubscribeAudioLevel = audioCaptureService.onAudioLevel((level: AudioLevelData) => {
      levelHistoryRef.current.push(level.volume);
      
      // Keep only last 100 level readings
      if (levelHistoryRef.current.length > 100) {
        levelHistoryRef.current.shift();
      }

      setState(prev => ({ ...prev, audioLevel: level }));
    });

    const unsubscribeError = audioCaptureService.onError((error: AudioError) => {
      setState(prev => ({ ...prev, error }));
      options.onError?.(error);
    });

    unsubscribeRefs.current = [unsubscribeAudioData, unsubscribeAudioLevel, unsubscribeError];

    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
    };
  }, [options]);

  // Initialize on mount
  useEffect(() => {
    initializeAudio();

    // Auto-start if enabled
    if (options.autoStart && state.isInitialized && !state.isCapturing) {
      startCapture();
    }
  }, [options.autoStart, state.isInitialized, state.isCapturing, initializeAudio, startCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
      audioCaptureService.cleanup();
      audioStreamingService.cleanup();
    };
  }, [stopCapture]);

  return {
    // State
    ...state,
    
    // Actions
    startCapture,
    stopCapture,
    selectSource,
    initializeAudio,
    executeRecoveryAction,
    
    // Utilities
    isSupported: () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    getPermissionStatus: async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state;
      } catch {
        return 'prompt';
      }
    }
  };
}