'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Wifi, Mic, Settings, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { ErrorType, UserMessage } from '../../types/error.types';
import { getUserMessage } from '../../lib/error-messages';

interface ErrorDisplayProps {
  errorType: ErrorType;
  error?: Error;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errorType,
  error,
  onRetry,
  onDismiss,
  compact = false,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const userMessage = getUserMessage(errorType);

  useEffect(() => {
    if (userMessage.estimatedRecoveryTime && !compact) {
      // Parse recovery time and start countdown
      const timeMatch = userMessage.estimatedRecoveryTime.match(/(\d+)/);
      if (timeMatch) {
        const seconds = parseInt(timeMatch[1]);
        setCountdown(seconds);
        
        const interval = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(interval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(interval);
      }
    }
  }, [userMessage.estimatedRecoveryTime, compact]);

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'retry_audio_permission':
        // Request microphone permission
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => handleRetry())
          .catch(console.error);
        break;
      
      case 'detect_audio_devices':
        // Trigger audio device detection
        navigator.mediaDevices.enumerateDevices()
          .then(() => handleRetry())
          .catch(console.error);
        break;
      
      case 'reconnect_websocket':
        // Trigger WebSocket reconnection
        handleRetry();
        break;
      
      case 'refresh_page':
        window.location.reload();
        break;
      
      case 'test_connection':
        // Test network connection
        fetch('/api/health')
          .then(() => handleRetry())
          .catch(console.error);
        break;
      
      case 'update_profile':
        // Navigate to profile page
        window.location.href = '/profile';
        break;
      
      case 'upgrade_plan':
        // Navigate to upgrade page
        window.location.href = '/upgrade';
        break;
      
      default:
        handleRetry();
    }
  };

  const getIcon = () => {
    switch (errorType) {
      case 'AUDIO_PERMISSION_DENIED':
      case 'AUDIO_DEVICE_NOT_FOUND':
      case 'AUDIO_STREAM_INTERRUPTED':
        return <Mic className="w-6 h-6" />;
      
      case 'NETWORK_TIMEOUT':
      case 'NETWORK_UNREACHABLE':
      case 'WEBSOCKET_CONNECTION_FAILED':
        return <Wifi className="w-6 h-6" />;
      
      case 'SERVICE_UNAVAILABLE':
      case 'DATABASE_CONNECTION_FAILED':
        return <Settings className="w-6 h-6" />;
      
      default:
        return <AlertTriangle className="w-6 h-6" />;
    }
  };

  const getSeverityColor = () => {
    switch (userMessage.severity) {
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-md border ${getSeverityColor()}`}>
        {getIcon()}
        <span className="text-sm font-medium">{userMessage.title}</span>
        {userMessage.canRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={isRetrying}
            className="ml-auto"
          >
            {isRetrying ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Retry'}
          </Button>
        )}
        {onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="p-1"
          >
            ×
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto p-6 rounded-lg border ${getSeverityColor()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">
            {userMessage.title}
          </h3>
          
          <p className="text-sm mb-4">
            {userMessage.message}
          </p>
          
          {userMessage.instructions && userMessage.instructions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">What you can do:</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                {userMessage.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
          )}
          
          {countdown !== null && (
            <div className="mb-4 p-2 bg-white/50 rounded text-sm">
              Estimated recovery time: {countdown} seconds
            </div>
          )}
          
          <div className="flex gap-2">
            {userMessage.actionButton && (
              <Button
                onClick={() => handleAction(userMessage.actionButton!.action)}
                disabled={isRetrying}
                className="flex items-center gap-2"
              >
                {isRetrying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  userMessage.actionButton.action.includes('external') && (
                    <ExternalLink className="w-4 h-4" />
                  )
                )}
                {userMessage.actionButton.text}
              </Button>
            )}
            
            {userMessage.canRetry && !userMessage.actionButton && (
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex items-center gap-2"
              >
                {isRetrying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Try Again
              </Button>
            )}
            
            {onDismiss && (
              <Button
                variant="outline"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
          
          {error && process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-gray-600">
                Technical Details
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};