import { useCallback, useRef, useEffect } from 'react';
import { AudioChunk as AudioCaptureChunk } from '@/types/audio.types';
import { AudioChunk as WebSocketChunk } from '@/types/websocket.types';

export interface UseAudioStreamingOptions {
  onAudioChunk?: (chunk: WebSocketChunk) => void;
  bufferTime?: number;
  chunkSize?: number;
}

function convertAudioChunk(chunk: AudioCaptureChunk): WebSocketChunk {
  // Convert ArrayBuffer to base64
  const uint8Array = new Uint8Array(chunk.data);
  const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
  const base64Data = btoa(binaryString);

  return {
    audioData: base64Data,
    requestId: `chunk-${chunk.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
    format: 'raw', // or determine from chunk properties
    sampleRate: chunk.sampleRate,
    timestamp: new Date(chunk.timestamp).toISOString()
  };
}

export function useAudioStreaming(options: UseAudioStreamingOptions = {}) {
  const { onAudioChunk, bufferTime = 100, chunkSize = 4096 } = options;
  
  const chunkBuffer = useRef<AudioCaptureChunk[]>([]);
  const bufferTimer = useRef<NodeJS.Timeout | null>(null);
  const isStreaming = useRef(false);
  const stats = useRef({
    chunksProcessed: 0,
    bytesProcessed: 0,
    lastProcessedAt: 0
  });

  const flushBuffer = useCallback(() => {
    if (chunkBuffer.current.length === 0 || !onAudioChunk) {
      return;
    }

    // Process all chunks in buffer
    chunkBuffer.current.forEach(chunk => {
      const webSocketChunk = convertAudioChunk(chunk);
      onAudioChunk(webSocketChunk);
      stats.current.chunksProcessed++;
      stats.current.bytesProcessed += chunk.data.byteLength;
      stats.current.lastProcessedAt = Date.now();
    });

    // Clear buffer
    chunkBuffer.current = [];
  }, [onAudioChunk]);

  const startBufferTimer = useCallback(() => {
    if (bufferTimer.current) {
      clearInterval(bufferTimer.current);
    }

    bufferTimer.current = setInterval(() => {
      if (chunkBuffer.current.length > 0) {
        flushBuffer();
      }
    }, bufferTime);
  }, [bufferTime, flushBuffer]);

  const startStreaming = useCallback(() => {
    if (isStreaming.current) {
      return;
    }

    isStreaming.current = true;
    stats.current = {
      chunksProcessed: 0,
      bytesProcessed: 0,
      lastProcessedAt: 0
    };

    startBufferTimer();
  }, [startBufferTimer]);

  const stopStreaming = useCallback(() => {
    if (!isStreaming.current) {
      return;
    }

    isStreaming.current = false;

    // Flush remaining buffer
    flushBuffer();

    // Clear timer
    if (bufferTimer.current) {
      clearInterval(bufferTimer.current);
      bufferTimer.current = null;
    }
  }, [flushBuffer]);

  const streamAudioChunk = useCallback((chunk: AudioCaptureChunk) => {
    if (!isStreaming.current) {
      return;
    }

    // Add to buffer
    chunkBuffer.current.push(chunk);

    // Check if buffer is full
    const totalSize = chunkBuffer.current.reduce((sum, c) => sum + c.data.byteLength, 0);
    if (totalSize >= chunkSize) {
      flushBuffer();
    }
  }, [chunkSize, flushBuffer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    startStreaming,
    stopStreaming,
    streamAudioChunk,
    isStreaming: isStreaming.current,
    stats: stats.current
  };
}