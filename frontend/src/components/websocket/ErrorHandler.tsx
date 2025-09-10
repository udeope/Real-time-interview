'use client';

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, RefreshCw, Wifi, WifiOff, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert';

interface ErrorInfo {
  type: 'websocket' | 'audio' | 'transcription' | 'response' | 'network';
  message: string;
  code?: string;
  timestamp: Date;
  retryable: boolean;
  autoRetry?: boolean;
}

interface ErrorHandlerProps {
  errors: ErrorInfo[];
  onRetry: (errorType: ErrorInfo['type']) => void;
  onDismiss: (errorIndex: number) => void;
  onDismissAll: () => void;
  maxErrors?: number;
  autoRetryDelay?: number;
  className?: string;
}

export function ErrorHandler({
  errors,
  onRetry,
  onDismiss,
  onDismissAll,
  maxErrors = 5,
  autoRetryDelay = 5000,
  className
}: ErrorHandlerProps) {
  const [retryCountdowns, setRetryCountdowns] = useState<Map<number, number>>(new Map());
  const [dismissedErrors, setDismissedErrors] = useState<Set<number>>(new Set());

  // Auto-retry logic
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    errors.forEach((error, index) => {
      if (error.autoRetry && error.retryable && !dismissedErrors.has(index)) {
        const interval = setInterval(() => {
          setRetryCountdowns(prev => {
            const newMap = new Map(prev);
            const currentCountdown = newMap.get(index) || autoRetryDelay / 1000;
            
            if (currentCountdown <= 1) {
              onRetry(error.type);
              newMap.delete(index);
            } else {
              newMap.set(index, currentCountdown - 1);
            }
            
            return newMap;
          });
        }, 1000);

        intervals.push(interval);
        
        // Initialize countdown
        setRetryCountdowns(prev => {
          const newMap = new Map(prev);
          newMap.set(index, autoRetryDelay / 1000);
          return newMap;
        });
      }
    });

    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [errors, autoRetryDelay, onRetry, dismissedErrors]);

  const handleDismiss = useCallback((index: number) => {
    setDismissedErrors(prev => new Set(prev).add(index));
    setRetryCountdowns(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
    onDismiss(index);
  }, [onDismiss]);

  const handleRetry = useCallback((errorType: ErrorInfo['type'], index: number) => {
    setRetryCountdowns(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
    onRetry(errorType);
  }, [onRetry]);

  const getErrorIcon = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'websocket':
      case 'network':
        return <WifiOff className="h-4 w-4" />;
      case 'audio':
        return <AlertCircle className="h-4 w-4" />;
      case 'transcription':
      case 'response':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getErrorTitle = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'websocket':
        return 'WebSocket Connection Error';
      case 'audio':
        return 'Audio Capture Error';
      case 'transcription':
        return 'Transcription Service Error';
      case 'response':
        return 'Response Generation Error';
      case 'network':
        return 'Network Connection Error';
      default:
        return 'System Error';
    }
  };

  const getErrorSuggestion = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'websocket':
      case 'network':
        return 'Check your internet connection and try reconnecting.';
      case 'audio':
        return 'Check microphone permissions and device availability.';
      case 'transcription':
        return 'The transcription service may be temporarily unavailable.';
      case 'response':
        return 'The AI response service may be experiencing high load.';
      default:
        return 'Please try again or contact support if the issue persists.';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Filter out dismissed errors and limit to maxErrors
  const visibleErrors = errors
    .map((error, index) => ({ error, originalIndex: index }))
    .filter(({ originalIndex }) => !dismissedErrors.has(originalIndex))
    .slice(-maxErrors);

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Dismiss All Button */}
      {visibleErrors.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onDismissAll}
            className="text-xs"
          >
            Dismiss All ({visibleErrors.length})
          </Button>
        </div>
      )}

      {/* Error Alerts */}
      {visibleErrors.map(({ error, originalIndex }) => {
        const countdown = retryCountdowns.get(originalIndex);
        
        return (
          <Alert key={originalIndex} variant="destructive" className="relative">
            {getErrorIcon(error.type)}
            <div className="flex-1">
              <AlertTitle className="flex items-center justify-between">
                <span>{getErrorTitle(error.type)}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(error.timestamp)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(originalIndex)}
                    className="p-1 h-auto"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </AlertTitle>
              
              <AlertDescription>
                <div className="space-y-2">
                  <div className="text-sm">
                    {error.message}
                  </div>
                  
                  {error.code && (
                    <div className="text-xs text-gray-600">
                      Error Code: {error.code}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-600">
                    {getErrorSuggestion(error.type)}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      {error.retryable && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(error.type, originalIndex)}
                          disabled={!!countdown}
                          className="flex items-center space-x-1"
                        >
                          <RefreshCw className={clsx(
                            'h-3 w-3',
                            countdown && 'animate-spin'
                          )} />
                          <span>
                            {countdown ? `Retry in ${countdown}s` : 'Retry Now'}
                          </span>
                        </Button>
                      )}
                    </div>
                    
                    {/* Auto-retry countdown */}
                    {countdown && error.autoRetry && (
                      <div className="text-xs text-gray-500">
                        Auto-retry in {countdown} seconds
                      </div>
                    )}
                  </div>
                  
                  {/* Progress bar for auto-retry */}
                  {countdown && error.autoRetry && (
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                      <div 
                        className="bg-red-500 h-1 rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${((autoRetryDelay / 1000 - countdown) / (autoRetryDelay / 1000)) * 100}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              </AlertDescription>
            </div>
          </Alert>
        );
      })}

      {/* Error Summary */}
      {errors.length > maxErrors && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {errors.length - maxErrors} more error{errors.length - maxErrors !== 1 ? 's' : ''} not shown
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onDismissAll}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Error factory functions
export const createWebSocketError = (message: string, code?: string): ErrorInfo => ({
  type: 'websocket',
  message,
  code,
  timestamp: new Date(),
  retryable: true,
  autoRetry: true
});

export const createAudioError = (message: string, code?: string): ErrorInfo => ({
  type: 'audio',
  message,
  code,
  timestamp: new Date(),
  retryable: true,
  autoRetry: false
});

export const createTranscriptionError = (message: string, code?: string): ErrorInfo => ({
  type: 'transcription',
  message,
  code,
  timestamp: new Date(),
  retryable: true,
  autoRetry: true
});

export const createResponseError = (message: string, code?: string): ErrorInfo => ({
  type: 'response',
  message,
  code,
  timestamp: new Date(),
  retryable: true,
  autoRetry: true
});

export const createNetworkError = (message: string, code?: string): ErrorInfo => ({
  type: 'network',
  message,
  code,
  timestamp: new Date(),
  retryable: true,
  autoRetry: true
});