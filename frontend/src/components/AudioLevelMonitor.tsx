'use client';

import React, { useEffect, useState } from 'react';
import { AudioLevelData } from '@/types/audio.types';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface AudioLevelMonitorProps {
  audioLevel: AudioLevelData | null;
  isCapturing: boolean;
  className?: string;
  showNumericValues?: boolean;
  sensitivity?: number;
}

export function AudioLevelMonitor({
  audioLevel,
  isCapturing,
  className = '',
  showNumericValues = false,
  sensitivity = 1.0
}: AudioLevelMonitorProps) {
  const [peakHold, setPeakHold] = useState(0);
  const [peakHoldTimer, setPeakHoldTimer] = useState<NodeJS.Timeout | null>(null);

  // Update peak hold
  useEffect(() => {
    if (audioLevel && audioLevel.peak > peakHold) {
      setPeakHold(audioLevel.peak);
      
      // Clear existing timer
      if (peakHoldTimer) {
        clearTimeout(peakHoldTimer);
      }
      
      // Set new timer to decay peak hold
      const timer = setTimeout(() => {
        setPeakHold(0);
      }, 1500);
      
      setPeakHoldTimer(timer);
    }
  }, [audioLevel, peakHold, peakHoldTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (peakHoldTimer) {
        clearTimeout(peakHoldTimer);
      }
    };
  }, [peakHoldTimer]);

  const volume = audioLevel ? audioLevel.volume * sensitivity : 0;
  const peak = audioLevel ? audioLevel.peak * sensitivity : 0;
  const rms = audioLevel ? audioLevel.rms * sensitivity : 0;

  // Determine level status
  const getLevelStatus = () => {
    if (!isCapturing) return 'inactive';
    if (volume < 0.01) return 'silent';
    if (volume < 0.1) return 'low';
    if (volume < 0.5) return 'normal';
    if (volume < 0.8) return 'high';
    return 'peak';
  };

  const status = getLevelStatus();

  const getStatusColor = () => {
    switch (status) {
      case 'inactive': return 'bg-gray-300';
      case 'silent': return 'bg-gray-400';
      case 'low': return 'bg-yellow-400';
      case 'normal': return 'bg-green-400';
      case 'high': return 'bg-orange-400';
      case 'peak': return 'bg-red-400';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = () => {
    if (!isCapturing) {
      return <MicOff className="w-4 h-4 text-gray-500" />;
    }
    
    if (status === 'silent') {
      return <Mic className="w-4 h-4 text-gray-500" />;
    }
    
    return <Volume2 className="w-4 h-4 text-gray-700" />;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>

      {/* Level Bars */}
      <div className="flex-1 min-w-0">
        <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
          {/* RMS Level (background) */}
          <div
            className="absolute inset-y-0 left-0 bg-blue-300 transition-all duration-75 ease-out"
            style={{ width: `${Math.min(100, rms * 100)}%` }}
          />
          
          {/* Volume Level (main) */}
          <div
            className={`absolute inset-y-0 left-0 transition-all duration-75 ease-out ${getStatusColor()}`}
            style={{ width: `${Math.min(100, volume * 100)}%` }}
          />
          
          {/* Peak Hold Indicator */}
          {peakHold > 0 && (
            <div
              className="absolute inset-y-0 w-0.5 bg-red-600 transition-all duration-75"
              style={{ left: `${Math.min(100, peakHold * 100)}%` }}
            />
          )}
          
          {/* Level Markers */}
          <div className="absolute inset-0 flex items-center">
            {[0.2, 0.4, 0.6, 0.8].map((marker) => (
              <div
                key={marker}
                className="w-px h-3 bg-gray-400 opacity-50"
                style={{ marginLeft: `${marker * 100}%` }}
              />
            ))}
          </div>
        </div>
        
        {/* Status Text */}
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-600 capitalize">
            {status === 'inactive' ? 'Not capturing' : status}
          </span>
          
          {showNumericValues && audioLevel && (
            <div className="text-xs text-gray-500 font-mono">
              Vol: {(volume * 100).toFixed(0)}% | 
              Peak: {(peak * 100).toFixed(0)}% | 
              RMS: {(rms * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </div>

      {/* Peak Warning */}
      {status === 'peak' && (
        <div className="flex-shrink-0">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}

// Simplified version for compact display
export function CompactAudioLevelMonitor({
  audioLevel,
  isCapturing,
  className = ''
}: Pick<AudioLevelMonitorProps, 'audioLevel' | 'isCapturing' | 'className'>) {
  const volume = audioLevel ? audioLevel.volume : 0;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isCapturing ? (
        <Mic className={`w-4 h-4 ${volume > 0.1 ? 'text-green-500' : 'text-gray-400'}`} />
      ) : (
        <MicOff className="w-4 h-4 text-gray-400" />
      )}
      
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-75 ${
            volume > 0.8 ? 'bg-red-400' : 
            volume > 0.5 ? 'bg-orange-400' : 
            volume > 0.1 ? 'bg-green-400' : 'bg-gray-300'
          }`}
          style={{ width: `${Math.min(100, volume * 100)}%` }}
        />
      </div>
    </div>
  );
}