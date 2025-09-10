'use client';

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Copy, Edit, Check, Clock, Tag, Bell, BellOff, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ResponseOption } from '@/types/ui.types';

interface LiveResponseSuggestionsProps {
  responses: ResponseOption[];
  isGenerating: boolean;
  onCopyResponse: (response: ResponseOption) => void;
  onEditResponse: (response: ResponseOption) => void;
  onSelectResponse: (response: ResponseOption) => void;
  enableNotifications?: boolean;
  className?: string;
}

export function LiveResponseSuggestions({
  responses,
  isGenerating,
  onCopyResponse,
  onEditResponse,
  onSelectResponse,
  enableNotifications = true,
  className
}: LiveResponseSuggestionsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [newResponsesCount, setNewResponsesCount] = useState(0);
  const [lastResponseCount, setLastResponseCount] = useState(0);
  const [animatingResponses, setAnimatingResponses] = useState<Set<string>>(new Set());

  // Request notification permission
  useEffect(() => {
    if (enableNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationsEnabled(permission === 'granted');
        });
      } else {
        setNotificationsEnabled(Notification.permission === 'granted');
      }
    }
  }, [enableNotifications]);

  // Handle new responses and notifications
  useEffect(() => {
    if (responses.length > lastResponseCount && lastResponseCount > 0) {
      const newResponses = responses.slice(lastResponseCount);
      setNewResponsesCount(prev => prev + newResponses.length);

      // Add animation to new responses
      const newIds = new Set(newResponses.map(r => r.id));
      setAnimatingResponses(newIds);
      
      // Remove animation after 2 seconds
      setTimeout(() => {
        setAnimatingResponses(new Set());
      }, 2000);

      // Send notification for new responses
      if (notificationsEnabled && document.hidden) {
        const notification = new Notification('New Response Suggestions', {
          body: `${newResponses.length} new response${newResponses.length > 1 ? 's' : ''} available`,
          icon: '/favicon.ico',
          tag: 'response-suggestions'
        });

        // Auto-close notification after 5 seconds
        setTimeout(() => notification.close(), 5000);
      }

      // Play subtle notification sound (if available)
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio play errors (user interaction required)
        });
      } catch (error) {
        // Ignore audio errors
      }
    }

    setLastResponseCount(responses.length);
  }, [responses.length, lastResponseCount, notificationsEnabled]);

  // Clear new responses count when user interacts
  const clearNewCount = useCallback(() => {
    setNewResponsesCount(0);
  }, []);

  const handleCopy = async (response: ResponseOption) => {
    try {
      await navigator.clipboard.writeText(response.content);
      setCopiedId(response.id);
      onCopyResponse(response);
      clearNewCount();
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy response:', error);
    }
  };

  const handleSelect = (response: ResponseOption) => {
    setSelectedId(response.id);
    onSelectResponse(response);
    clearNewCount();
  };

  const handleEdit = (response: ResponseOption) => {
    onEditResponse(response);
    clearNewCount();
  };

  const toggleNotifications = () => {
    if (!notificationsEnabled && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotificationsEnabled(permission === 'granted');
      });
    } else {
      setNotificationsEnabled(!notificationsEnabled);
    }
  };

  const getStructureBadge = (structure: ResponseOption['structure']) => {
    switch (structure) {
      case 'STAR':
        return <Badge variant="default" className="text-xs">STAR Method</Badge>;
      case 'technical':
        return <Badge variant="secondary" className="text-xs">Technical</Badge>;
      case 'direct':
        return <Badge variant="outline" className="text-xs">Direct</Badge>;
      default:
        return null;
    }
  };

  const getDurationColor = (duration: number) => {
    if (duration <= 60) return 'text-green-600';
    if (duration <= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponsePriority = (response: ResponseOption) => {
    // Higher confidence and STAR structure get higher priority
    let priority = response.confidence;
    if (response.structure === 'STAR') priority += 0.1;
    if (response.estimatedDuration <= 90) priority += 0.05;
    return priority;
  };

  // Sort responses by priority
  const sortedResponses = [...responses].sort((a, b) => 
    getResponsePriority(b) - getResponsePriority(a)
  );

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">
            Response Suggestions
          </span>
          {newResponsesCount > 0 && (
            <Badge variant="default" className="text-xs animate-pulse">
              {newResponsesCount} new
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {enableNotifications && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleNotifications}
              className="p-1"
              title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
            >
              {notificationsEnabled ? (
                <Bell className="h-4 w-4 text-blue-500" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          )}
          
          <span className="text-xs text-gray-500">
            {responses.length} suggestion{responses.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isGenerating ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <Sparkles className="h-4 w-4 text-blue-500 absolute top-1 right-1 animate-pulse" />
              </div>
              <p className="text-gray-600 font-medium">Generating responses...</p>
              <p className="text-sm text-gray-500">AI is analyzing the question</p>
            </div>
          </div>
        ) : responses.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-3">💡</div>
              <p className="text-lg font-medium mb-1">No responses available</p>
              <p className="text-sm">Responses will appear when a question is detected</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedResponses.map((response, index) => (
              <div
                key={response.id}
                className={clsx(
                  'p-4 border rounded-lg transition-all duration-300 hover:shadow-md',
                  selectedId === response.id 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-gray-300',
                  animatingResponses.has(response.id) && 'animate-slide-in-right shadow-lg',
                  index === 0 && 'ring-2 ring-blue-200' // Highlight best response
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      Option {index + 1}
                      {index === 0 && (
                        <Badge variant="success" className="ml-2 text-xs">
                          Recommended
                        </Badge>
                      )}
                    </span>
                    {getStructureBadge(response.structure)}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className={clsx(
                      'text-xs font-medium',
                      getDurationColor(response.estimatedDuration)
                    )}>
                      {response.estimatedDuration}s
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-3">
                  <p className="text-sm text-gray-900 leading-relaxed">
                    {response.content}
                  </p>
                </div>

                {/* Tags */}
                {response.tags.length > 0 && (
                  <div className="flex items-center space-x-1 mb-3">
                    <Tag className="h-3 w-3 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {response.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(response)}
                      className="flex items-center space-x-1"
                    >
                      {copiedId === response.id ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedId === response.id ? 'Copied!' : 'Copy'}</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(response)}
                      className="flex items-center space-x-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </Button>
                  </div>

                  <Button
                    variant={selectedId === response.id ? "secondary" : "default"}
                    size="sm"
                    onClick={() => handleSelect(response)}
                  >
                    {selectedId === response.id ? 'Selected' : 'Select'}
                  </Button>
                </div>

                {/* Confidence indicator */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Confidence: {Math.round(response.confidence * 100)}%</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={clsx(
                            'h-full transition-all duration-300',
                            response.confidence >= 0.8 ? 'bg-green-500' :
                            response.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${response.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with quick stats */}
      {responses.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Best: {Math.round(Math.max(...responses.map(r => r.confidence)) * 100)}% confidence
            </span>
            <span>
              Avg. duration: {Math.round(responses.reduce((acc, r) => acc + r.estimatedDuration, 0) / responses.length)}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
}