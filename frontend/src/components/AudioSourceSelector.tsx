'use client';

import React, { useState } from 'react';
import { AudioSource } from '@/types/audio.types';
import { Mic, Monitor, Headphones, Settings, ChevronDown, Check, AlertCircle } from 'lucide-react';

interface AudioSourceSelectorProps {
  sources: AudioSource[];
  selectedSource: AudioSource | null;
  onSourceSelect: (source: AudioSource) => void;
  disabled?: boolean;
  className?: string;
}

export function AudioSourceSelector({
  sources,
  selectedSource,
  onSourceSelect,
  disabled = false,
  className = ''
}: AudioSourceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getSourceIcon = (type: AudioSource['type']) => {
    switch (type) {
      case 'microphone':
        return <Mic className="w-4 h-4" />;
      case 'system':
        return <Monitor className="w-4 h-4" />;
      case 'webrtc':
        return <Headphones className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getSourceTypeLabel = (type: AudioSource['type']) => {
    switch (type) {
      case 'microphone':
        return 'Microphone';
      case 'system':
        return 'System Audio';
      case 'webrtc':
        return 'WebRTC';
      default:
        return 'Other';
    }
  };

  const handleSourceSelect = (source: AudioSource) => {
    if (!source.isAvailable || disabled) return;
    
    onSourceSelect(source);
    setIsOpen(false);
  };

  if (sources.length === 0) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <AlertCircle className="w-5 h-5 text-yellow-600" />
        <span className="text-sm text-yellow-800">No audio sources detected</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-3 p-3 
          bg-white border border-gray-300 rounded-lg
          hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        `}
      >
        <div className="flex items-center gap-3">
          {selectedSource ? (
            <>
              {getSourceIcon(selectedSource.type)}
              <div className="text-left">
                <div className="font-medium text-gray-900">
                  {selectedSource.name}
                </div>
                <div className="text-sm text-gray-500">
                  {getSourceTypeLabel(selectedSource.type)}
                </div>
              </div>
            </>
          ) : (
            <>
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Select audio source</span>
            </>
          )}
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {sources.map((source) => (
              <button
                key={source.id}
                onClick={() => handleSourceSelect(source)}
                disabled={!source.isAvailable}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-left
                  hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                  ${selectedSource?.id === source.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                `}
              >
                <div className="flex items-center gap-3 flex-1">
                  {getSourceIcon(source.type)}
                  <div>
                    <div className="font-medium">
                      {source.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getSourceTypeLabel(source.type)}
                      {source.requiresPermission && (
                        <span className="ml-1 text-xs">(requires permission)</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedSource?.id === source.id && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
                
                {!source.isAvailable && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-200 p-2">
            <div className="text-xs text-gray-500">
              {sources.filter(s => s.isAvailable).length} of {sources.length} sources available
            </div>
          </div>
        </div>
      )}
    </div>
  );
}