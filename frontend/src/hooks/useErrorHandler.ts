'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppError, ErrorType } from '../types/error.types';
import { errorHandler } from '../lib/error-handler.service';

interface UseErrorHandlerOptions {
  onError?: (error: AppError) => void;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface ErrorState {
  error: AppError | null;
  isRetrying: boolean;
  retryCount: number;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
  });

  const {
    onError,
    autoRetry = false,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  // Handle error
  const handleError = useCallback((error: Error | AppError, context?: any) => {
    const appError = errorHandler.handleError(error, context);
    
    setErrorState(prev => ({
      ...prev,
      error: appError,
      retryCount: 0,
    }));

    if (onError) {
      onError(appError);
    }

    return appError;
  }, [onError]);

  // Clear error
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  // Retry operation
  const retry = useCallback(async (operation?: () => Promise<void>) => {
    if (!errorState.error) return;

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
    }));

    try {
      if (operation) {
        await operation();
      }
      clearError();
    } catch (error) {
      const newError = handleError(error as Error);
      
      // Auto-retry if enabled and under limit
      if (autoRetry && errorState.retryCount < maxRetries) {
        setTimeout(() => {
          retry(operation);
        }, retryDelay * (errorState.retryCount + 1));
      } else {
        setErrorState(prev => ({
          ...prev,
          isRetrying: false,
          error: newError,
        }));
      }
    }
  }, [errorState.error, errorState.retryCount, autoRetry, maxRetries, retryDelay, handleError, clearError]);

  // Wrap async operations with error handling
  const wrapAsync = useCallback(<T>(
    operation: () => Promise<T>,
    context?: any,
  ): Promise<T> => {
    return errorHandler.handleAsyncError(operation(), context);
  }, []);

  // Wrap operations with retry logic
  const withRetry = useCallback(<T>(
    operation: () => Promise<T>,
    retryOptions?: {
      maxAttempts?: number;
      delay?: number;
    },
  ): Promise<T> => {
    return errorHandler.retryOperation(
      operation,
      retryOptions?.maxAttempts || maxRetries,
      retryOptions?.delay || retryDelay,
    );
  }, [maxRetries, retryDelay]);

  // Listen for global errors
  useEffect(() => {
    const unsubscribe = errorHandler.addErrorListener((error) => {
      setErrorState(prev => ({
        ...prev,
        error,
        retryCount: 0,
      }));
    });

    return unsubscribe;
  }, []);

  return {
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    handleError,
    clearError,
    retry,
    wrapAsync,
    withRetry,
  };
}

// Hook for specific error types
export function useErrorFilter(errorTypes: ErrorType[]) {
  const { error, ...rest } = useErrorHandler();
  
  const filteredError = error && errorTypes.includes(error.type) ? error : null;
  
  return {
    error: filteredError,
    ...rest,
  };
}

// Hook for audio-related errors
export function useAudioErrorHandler() {
  return useErrorFilter([
    'AUDIO_PERMISSION_DENIED',
    'AUDIO_DEVICE_NOT_FOUND',
    'AUDIO_STREAM_INTERRUPTED',
    'AUDIO_FORMAT_UNSUPPORTED',
  ]);
}

// Hook for network-related errors
export function useNetworkErrorHandler() {
  return useErrorFilter([
    'NETWORK_TIMEOUT',
    'NETWORK_UNREACHABLE',
    'WEBSOCKET_CONNECTION_FAILED',
  ]);
}

// Hook for transcription-related errors
export function useTranscriptionErrorHandler() {
  return useErrorFilter([
    'TRANSCRIPTION_API_TIMEOUT',
    'TRANSCRIPTION_API_FAILURE',
    'TRANSCRIPTION_LOW_CONFIDENCE',
    'TRANSCRIPTION_RATE_LIMITED',
  ]);
}

// Hook for LLM-related errors
export function useLLMErrorHandler() {
  return useErrorFilter([
    'LLM_API_FAILURE',
    'LLM_CONTEXT_MISSING',
    'LLM_RESPONSE_TOO_LONG',
    'LLM_RATE_LIMITED',
  ]);
}