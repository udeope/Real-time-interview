'use client';

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Users, Clock, Activity, Pause, Play, Square, Wifi } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface SessionUser {
  id: string;
  name: string;
  role: 'interviewer' | 'candidate' | 'observer';
  isActive: boolean;
  lastSeen: Date;
}

interface SessionState {
  id: string;
  status: 'waiting' | 'active' | 'paused' | 'recording' | 'completed';
  startTime: Date | null;
  duration: number;
  users: SessionUser[];
  isRecording: boolean;
  lastActivity: Date;
}

interface SessionSyncProps {
  sessionState: SessionState;
  currentUserId: string;
  onStatusChange: (status: SessionState['status']) => void;
  onUserAction: (action: 'join' | 'leave' | 'mute' | 'unmute') => void;
  isConnected: boolean;
  className?: string;
}

export function SessionSync({
  sessionState,
  currentUserId,
  onStatusChange,
  onUserAction,
  isConnected,
  className
}: SessionSyncProps) {
  const [localDuration, setLocalDuration] = useState(sessionState.duration);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Update local duration every second when session is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (sessionState.status === 'active' && sessionState.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - sessionState.startTime!.getTime()) / 1000);
        setLocalDuration(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [sessionState.status, sessionState.startTime]);

  // Sync with server state
  useEffect(() => {
    setLocalDuration(sessionState.duration);
    setLastSync(new Date());
  }, [sessionState.duration]);

  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }, []);

  const getStatusIcon = (status: SessionState['status']) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'active':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'recording':
        return <Activity className="h-4 w-4 text-red-500 animate-pulse" />;
      case 'completed':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: SessionState['status']) => {
    switch (status) {
      case 'waiting':
        return 'text-gray-600 bg-gray-100';
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'recording':
        return 'text-red-600 bg-red-100';
      case 'completed':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getUserRoleIcon = (role: SessionUser['role']) => {
    switch (role) {
      case 'interviewer':
        return '👔';
      case 'candidate':
        return '👤';
      case 'observer':
        return '👁️';
      default:
        return '👤';
    }
  };

  const getTimeSinceLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSeen.getTime()) / 1000);
    
    if (diff < 60) {
      return 'just now';
    } else if (diff < 3600) {
      return `${Math.floor(diff / 60)}m ago`;
    } else {
      return `${Math.floor(diff / 3600)}h ago`;
    }
  };

  const currentUser = sessionState.users.find(user => user.id === currentUserId);
  const otherUsers = sessionState.users.filter(user => user.id !== currentUserId);

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Session Status Header */}
      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-3">
          {getStatusIcon(sessionState.status)}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                Session {sessionState.id.slice(-8)}
              </span>
              <Badge className={clsx('text-xs', getStatusColor(sessionState.status))}>
                {sessionState.status.charAt(0).toUpperCase() + sessionState.status.slice(1)}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              <span>Duration: {formatDuration(localDuration)}</span>
              {sessionState.isRecording && (
                <span className="flex items-center space-x-1 text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span>Recording</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <div className="flex items-center space-x-1">
            <Wifi className={clsx(
              'h-4 w-4',
              isConnected ? 'text-green-500' : 'text-red-500'
            )} />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Last Sync */}
          <span className="text-xs text-gray-400">
            Synced {getTimeSinceLastSeen(lastSync)}
          </span>
        </div>
      </div>

      {/* Session Users */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Session Participants ({sessionState.users.length})</span>
          </h3>
        </div>

        <div className="space-y-2">
          {/* Current User */}
          {currentUser && (
            <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center space-x-2">
                <span className="text-sm">{getUserRoleIcon(currentUser.role)}</span>
                <span className="text-sm font-medium text-blue-900">
                  {currentUser.name} (You)
                </span>
                <Badge variant="outline" className="text-xs">
                  {currentUser.role}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={clsx(
                  'w-2 h-2 rounded-full',
                  currentUser.isActive ? 'bg-green-500' : 'bg-gray-300'
                )} />
                <span className="text-xs text-gray-600">
                  {currentUser.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          )}

          {/* Other Users */}
          {otherUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
              <div className="flex items-center space-x-2">
                <span className="text-sm">{getUserRoleIcon(user.role)}</span>
                <span className="text-sm text-gray-900">{user.name}</span>
                <Badge variant="outline" className="text-xs">
                  {user.role}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={clsx(
                  'w-2 h-2 rounded-full',
                  user.isActive ? 'bg-green-500' : 'bg-gray-300'
                )} />
                <span className="text-xs text-gray-600">
                  {user.isActive ? 'Active' : getTimeSinceLastSeen(user.lastSeen)}
                </span>
              </div>
            </div>
          ))}

          {/* No other users */}
          {otherUsers.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Waiting for other participants to join...</p>
            </div>
          )}
        </div>
      </div>

      {/* Session Controls */}
      {currentUser?.role === 'interviewer' && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Session Controls</h3>
          
          <div className="flex items-center space-x-2">
            {sessionState.status === 'waiting' && (
              <Button
                size="sm"
                onClick={() => onStatusChange('active')}
                disabled={!isConnected}
                className="flex items-center space-x-1"
              >
                <Play className="h-3 w-3" />
                <span>Start Session</span>
              </Button>
            )}
            
            {sessionState.status === 'active' && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onStatusChange('paused')}
                  disabled={!isConnected}
                  className="flex items-center space-x-1"
                >
                  <Pause className="h-3 w-3" />
                  <span>Pause</span>
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onStatusChange('completed')}
                  disabled={!isConnected}
                  className="flex items-center space-x-1"
                >
                  <Square className="h-3 w-3" />
                  <span>End Session</span>
                </Button>
              </>
            )}
            
            {sessionState.status === 'paused' && (
              <>
                <Button
                  size="sm"
                  onClick={() => onStatusChange('active')}
                  disabled={!isConnected}
                  className="flex items-center space-x-1"
                >
                  <Play className="h-3 w-3" />
                  <span>Resume</span>
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onStatusChange('completed')}
                  disabled={!isConnected}
                  className="flex items-center space-x-1"
                >
                  <Square className="h-3 w-3" />
                  <span>End Session</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Session Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-white border border-gray-200 rounded-lg text-center">
          <div className="text-lg font-semibold text-gray-900">
            {formatDuration(localDuration)}
          </div>
          <div className="text-xs text-gray-500">Duration</div>
        </div>
        
        <div className="p-3 bg-white border border-gray-200 rounded-lg text-center">
          <div className="text-lg font-semibold text-gray-900">
            {sessionState.users.filter(u => u.isActive).length}
          </div>
          <div className="text-xs text-gray-500">Active Users</div>
        </div>
        
        <div className="p-3 bg-white border border-gray-200 rounded-lg text-center">
          <div className="text-lg font-semibold text-gray-900">
            {sessionState.status === 'active' ? 'Live' : 'Paused'}
          </div>
          <div className="text-xs text-gray-500">Status</div>
        </div>
        
        <div className="p-3 bg-white border border-gray-200 rounded-lg text-center">
          <div className="text-lg font-semibold text-gray-900">
            {isConnected ? 'Good' : 'Poor'}
          </div>
          <div className="text-xs text-gray-500">Connection</div>
        </div>
      </div>
    </div>
  );
}