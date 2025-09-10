'use client';

import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Badge } from '../ui/Badge';
import { TranscriptionData } from '@/types/ui.types';
import { Volume2, VolumeX } from 'lucide-react';

interface LiveTranscriptionDisplayProps {
  transcriptions: TranscriptionData[];
  isActive: boolean;
  autoScroll?: boolean;
  showConfidence?: boolean;
  showTimestamps?: boolean;
  className?: string;
}

export function LiveTranscriptionDisplay({
  transcriptions,
  isActive,
  autoScroll = true,
  showConfidence = true,
  showTimestamps = true,
  className
}: LiveTranscriptionDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [newTranscriptionCount, setNewTranscriptionCount] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom when new transcriptions arrive
  useEffect(() => {
    if (autoScroll && !isUserScrolling && scrollRef.current) {
      const element = scrollRef.current;
      const isAtBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 1;
      
      if (isAtBottom || transcriptions.length === 1) {
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        // User is not at bottom, increment new transcription count
        setNewTranscriptionCount(prev => prev + 1);
      }
    }
  }, [transcriptions, autoScroll, isUserScrolling]);

  // Handle scroll events to detect user scrolling
  const handleScroll = () => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;
    const isAtBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 10;

    if (isAtBottom) {
      setNewTranscriptionCount(0);
      setIsUserScrolling(false);
    } else {
      setIsUserScrolling(true);
    }

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Reset user scrolling after 3 seconds of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 3000);
  };

  // Scroll to bottom manually
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setNewTranscriptionCount(0);
      setIsUserScrolling(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return <Badge variant="success" className="text-xs">High</Badge>;
    } else if (confidence >= 0.7) {
      return <Badge variant="warning" className="text-xs">Medium</Badge>;
    } else {
      return <Badge variant="destructive" className="text-xs">Low</Badge>;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getTranscriptionAnimation = (transcription: TranscriptionData, index: number) => {
    const isLatest = index === transcriptions.length - 1;
    const isPartial = !transcription.isFinal;
    
    if (isLatest && isPartial) {
      return 'animate-pulse';
    } else if (isLatest) {
      return 'animate-fade-in';
    }
    return '';
  };

  return (
    <div className={clsx('relative flex flex-col h-full', className)}>
      {/* Header with status */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className={clsx(
            'w-3 h-3 rounded-full transition-colors',
            isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
          )} />
          <span className="text-sm font-medium text-gray-700">
            Live Transcription
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {isActive ? (
            <Volume2 className="h-4 w-4 text-green-500" />
          ) : (
            <VolumeX className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-xs text-gray-500">
            {transcriptions.length} segment{transcriptions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Transcription content */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ maxHeight: 'calc(100% - 60px)' }}
      >
        {transcriptions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-3">🎤</div>
              <p className="text-lg font-medium mb-1">Waiting for audio input...</p>
              <p className="text-sm">Start speaking to see live transcription</p>
            </div>
          </div>
        ) : (
          transcriptions.map((transcription, index) => (
            <div
              key={transcription.id}
              className={clsx(
                'p-3 rounded-lg border transition-all duration-300',
                transcription.isFinal 
                  ? 'bg-white border-gray-200 shadow-sm' 
                  : 'bg-blue-50 border-blue-200 border-dashed',
                getTranscriptionAnimation(transcription, index)
              )}
            >
              {/* Header with metadata */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {showTimestamps && (
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTimestamp(transcription.timestamp)}
                    </span>
                  )}
                  {transcription.speakerId && (
                    <Badge variant="outline" className="text-xs">
                      {transcription.speakerId === 'interviewer' ? '👔 Interviewer' : '👤 You'}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {showConfidence && getConfidenceBadge(transcription.confidence)}
                  {!transcription.isFinal && (
                    <Badge variant="outline" className="text-xs animate-pulse">
                      Processing...
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Transcription text */}
              <p className={clsx(
                'text-sm leading-relaxed',
                transcription.isFinal ? 'text-gray-900' : 'text-blue-700 font-medium'
              )}>
                {transcription.text}
                {!transcription.isFinal && (
                  <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse" />
                )}
              </p>
              
              {/* Low confidence warning */}
              {transcription.confidence < 0.7 && transcription.isFinal && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⚠️ Low confidence transcription - please verify accuracy
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New transcriptions indicator */}
      {newTranscriptionCount > 0 && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={scrollToBottom}
            className="bg-blue-600 text-white px-3 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <span>{newTranscriptionCount} new</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}

      {/* Statistics footer */}
      {transcriptions.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {transcriptions.filter(t => t.isFinal).length} final, {transcriptions.filter(t => !t.isFinal).length} processing
            </span>
            <span>
              Avg. confidence: {
                Math.round(
                  transcriptions
                    .filter(t => t.isFinal)
                    .reduce((acc, t) => acc + t.confidence, 0) / 
                  Math.max(transcriptions.filter(t => t.isFinal).length, 1) * 100
                )
              }%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}