'use client';

import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { TranscriptionData } from '@/types/ui.types';

interface TranscriptionPanelProps {
  transcriptions: TranscriptionData[];
  isActive: boolean;
  className?: string;
}

export function TranscriptionPanel({ 
  transcriptions, 
  isActive, 
  className 
}: TranscriptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new transcriptions arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return <Badge variant="success">High</Badge>;
    } else if (confidence >= 0.7) {
      return <Badge variant="warning">Medium</Badge>;
    } else {
      return <Badge variant="destructive">Low</Badge>;
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

  return (
    <Card className={clsx('h-full flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Transcription</CardTitle>
          <div className="flex items-center space-x-2">
            <div className={clsx(
              'w-3 h-3 rounded-full',
              isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            )} />
            <span className="text-sm text-gray-500">
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col min-h-0">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-3 pr-2"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
        >
          {transcriptions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <div className="text-lg mb-2">🎤</div>
                <p>Waiting for audio input...</p>
                <p className="text-sm">Start speaking to see transcription</p>
              </div>
            </div>
          ) : (
            transcriptions.map((transcription) => (
              <div
                key={transcription.id}
                className={clsx(
                  'p-3 rounded-lg border transition-all duration-200',
                  transcription.isFinal 
                    ? 'bg-white border-gray-200' 
                    : 'bg-blue-50 border-blue-200 border-dashed'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTimestamp(transcription.timestamp)}
                    </span>
                    {transcription.speakerId && (
                      <Badge variant="outline" className="text-xs">
                        Speaker {transcription.speakerId}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getConfidenceBadge(transcription.confidence)}
                    {!transcription.isFinal && (
                      <Badge variant="outline" className="text-xs">
                        Processing...
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className={clsx(
                  'text-sm leading-relaxed',
                  transcription.isFinal ? 'text-gray-900' : 'text-blue-700'
                )}>
                  {transcription.text}
                </p>
                
                {transcription.confidence < 0.7 && transcription.isFinal && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    ⚠️ Low confidence transcription - please verify accuracy
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Transcription stats */}
        {transcriptions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{transcriptions.length} segments</span>
              <span>
                Avg. confidence: {
                  Math.round(
                    transcriptions.reduce((acc, t) => acc + t.confidence, 0) / 
                    transcriptions.length * 100
                  )
                }%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}