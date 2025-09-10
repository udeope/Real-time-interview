'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription } from '../ui/Alert';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sessionUsers: string[];
  connectionAttempts?: number;
  maxAttempts?: number;
  lastReconnectTime?: Date | null;
  onRetryConnection?: () => void;
  onClearError?: () => void;
  className?: string;
}

export function ConnectionStatus({
  isConnected,
  isConnecting,
  error,
  sessionUsers,
  connectionAttempts = 0,
  maxAttempts = 5,
  lastReconnectTime,
  onRetryConnection,
  onClearError,
  className
}: ConnectionStatusProps) {
  const [connectionDuration, setConnectionDuration] = useState<number>(0);
  const [connectionStartTime, setConnectionStartTime] = useState<Date | null>(null);

  // Track connection duration
  useEffect(() => {
    if (isConnected && !connectionStartTime) {
      setConnectionStartTime(new Date());
    } else if (!isConnected) {
      setConnectionStartTime(null);
      setConnectionDuration(0);
    }
  }, [isConnected, connectionStartTime]);

  // Update connection duration every second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isConnected && connectionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - connectionStartTime.getTime()) / 1000);
        setConnectionDuration(duration);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected, connectionStartTime]);

  const getConnectionIcon = () => {
    if (isConnecting) {
      return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />;
    } else if (isConnected) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    } else {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getConnectionText = () => {
    if (isConnecting) {
      return 'Connecting...';
    } else if (isConnected) {
      return 'Connected';
    } else if (error) {
      return 'Connection Failed';
    } else {
      return 'Disconnected';
    }
  };

  const getConnectionColor = () => {
    if (isConnecting) {
      return 'text-yellow-600';
    } else if (isConnected) {
      return 'text-green-600';
    } else {
      return 'text-red-600';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const formatLastReconnect = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) {
      return `${diff}s ago`;
    } else if (diff < 3600) {
      return `${Math.floor(diff / 60)}m ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Main Connection Status */}
      <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-3">
          {getConnectionIcon()}
          <div>
            <div className={clsx('font-medium text-sm', getConnectionColor())}>
              {getConnectionText()}
            </div>
            {isConnected && connectionDuration > 0 && (
              <div className="text-xs text-gray-500">
                Connected for {formatDuration(connectionDuration)}
              </div>
            )}
            {isConnecting && connectionAttempts > 0 && (
              <div className="text-xs text-yellow-600">
                Attempt {connectionAttempts}/{maxAttempts}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Session Users */}
          {sessionUsers.length > 0 && (
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-gray-400" />
              <Badge variant="outline" className="text-xs">
                {sessionUsers.length} online
              </Badge>
            </div>
          )}

          {/* Connection Quality Indicator */}
          {isConnected && (
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div className="w-1 h-3 bg-green-500 rounded-full"></div>
                <div className="w-1 h-3 bg-green-500 rounded-full"></div>
                <div className="w-1 h-3 bg-green-500 rounded-full"></div>
                <div className="w-1 h-3 bg-green-300 rounded-full"></div>
              </div>
              <span className="text-xs text-gray-500">Good</span>
            </div>
          )}

          {/* Retry Button */}
          {!isConnected && !isConnecting && onRetryConnection && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetryConnection}
              disabled={connectionAttempts >= maxAttempts}
              className="text-xs"
            >
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Connection Error</div>
                <div className="text-sm mt-1">{error}</div>
                {lastReconnectTime && (
                  <div className="text-xs mt-1 text-gray-600">
                    Last attempt: {formatLastReconnect(lastReconnectTime)}
                  </div>
                )}
              </div>
              {onClearError && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearError}
                  className="ml-3"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Reconnection Progress */}
      {isConnecting && connectionAttempts > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-yellow-800">
                Reconnecting to server...
              </div>
              <div className="text-xs text-yellow-600 mt-1">
                This may take a few moments. Please wait.
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-yellow-200 rounded-full h-1">
              <div 
                className="bg-yellow-600 h-1 rounded-full transition-all duration-1000"
                style={{ width: `${(connectionAttempts / maxAttempts) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-yellow-600 mt-1">
              <span>Attempt {connectionAttempts}</span>
              <span>{maxAttempts - connectionAttempts} remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* Max Attempts Reached */}
      {connectionAttempts >= maxAttempts && !isConnected && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Connection Failed</div>
                <div className="text-sm mt-1">
                  Maximum reconnection attempts reached. Please check your internet connection and try again.
                </div>
              </div>
              {onRetryConnection && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetryConnection}
                  className="ml-3"
                >
                  Try Again
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Success */}
      {isConnected && connectionAttempts > 0 && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Connection Restored</div>
            <div className="text-sm mt-1">
              Successfully reconnected to the server. You can continue your interview session.
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}