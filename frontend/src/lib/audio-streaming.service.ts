import { Socket } from 'socket.io-client';
import { AudioChunk, AudioFormat } from '@/types/audio.types';
import { audioConverterService } from './audio-converter.service';

export interface StreamingConfig {
  chunkSize?: number;
  format?: AudioFormat;
  compressionQuality?: number;
  bufferTime?: number;
  enableCompression?: boolean;
}

export interface StreamingStats {
  bytesSent: number;
  chunksSent: number;
  averageLatency: number;
  compressionRatio: number;
  lastSentAt: number;
}

export class AudioStreamingService {
  private socket: Socket | null = null;
  private isStreaming = false;
  private config: Required<StreamingConfig>;
  private stats: StreamingStats;
  private chunkBuffer: AudioChunk[] = [];
  private bufferTimer: NodeJS.Timeout | null = null;

  constructor(socket?: Socket) {
    this.socket = socket || null;
    this.config = {
      chunkSize: 4096,
      format: 'wav',
      compressionQuality: 0.7,
      bufferTime: 100, // ms
      enableCompression: true
    };
    this.stats = {
      bytesSent: 0,
      chunksSent: 0,
      averageLatency: 0,
      compressionRatio: 1.0,
      lastSentAt: 0
    };
  }

  setSocket(socket: Socket): void {
    this.socket = socket;
  }

  updateConfig(config: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async startStreaming(config?: Partial<StreamingConfig>): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket connection required for streaming');
    }

    if (this.isStreaming) {
      throw new Error('Streaming already in progress');
    }

    if (config) {
      this.updateConfig(config);
    }

    this.isStreaming = true;
    this.resetStats();

    // Set up buffer flushing
    this.startBufferTimer();

    console.log('Audio streaming started with config:', this.config);
  }

  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) {
      return;
    }

    this.isStreaming = false;

    // Flush remaining buffer
    await this.flushBuffer();

    // Clear timer
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer);
      this.bufferTimer = null;
    }

    console.log('Audio streaming stopped. Final stats:', this.stats);
  }

  async streamAudioChunk(chunk: AudioChunk): Promise<void> {
    if (!this.isStreaming || !this.socket) {
      return;
    }

    // Add to buffer
    this.chunkBuffer.push(chunk);

    // Check if buffer is full
    const totalSize = this.chunkBuffer.reduce((sum, c) => sum + c.data.byteLength, 0);
    if (totalSize >= this.config.chunkSize) {
      await this.flushBuffer();
    }
  }

  private startBufferTimer(): void {
    this.bufferTimer = setInterval(async () => {
      if (this.chunkBuffer.length > 0) {
        await this.flushBuffer();
      }
    }, this.config.bufferTime);
  }

  private async flushBuffer(): Promise<void> {
    if (this.chunkBuffer.length === 0 || !this.socket) {
      return;
    }

    try {
      const startTime = Date.now();
      
      // Convert chunks to desired format
      const audioBlob = await audioConverterService.convertChunksToBlob(
        this.chunkBuffer, 
        this.config.format
      );

      let finalData: ArrayBuffer = await audioBlob.arrayBuffer();

      // Apply compression if enabled
      if (this.config.enableCompression) {
        const originalSize = finalData.byteLength;
        finalData = await audioConverterService.compressAudio(
          finalData, 
          this.config.compressionQuality
        );
        
        // Update compression ratio
        const compressionRatio = finalData.byteLength / originalSize;
        this.stats.compressionRatio = (this.stats.compressionRatio + compressionRatio) / 2;
      }

      // Create streaming packet
      const packet = {
        id: `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        format: this.config.format,
        sampleRate: this.chunkBuffer[0].sampleRate,
        channelCount: this.chunkBuffer[0].channelCount,
        data: Array.from(new Uint8Array(finalData)),
        metadata: {
          originalChunks: this.chunkBuffer.length,
          originalSize: this.chunkBuffer.reduce((sum, c) => sum + c.data.byteLength, 0),
          compressedSize: finalData.byteLength,
          compressionRatio: this.stats.compressionRatio
        }
      };

      // Send via Socket.IO
      this.socket.emit('audio-stream', packet, (ack: { received: boolean; timestamp: number }) => {
        if (ack?.received) {
          const latency = Date.now() - startTime;
          this.updateLatencyStats(latency);
        }
      });

      // Update stats
      this.stats.bytesSent += finalData.byteLength;
      this.stats.chunksSent++;
      this.stats.lastSentAt = Date.now();

      // Clear buffer
      this.chunkBuffer = [];

    } catch (error) {
      console.error('Failed to flush audio buffer:', error);
      // Clear buffer on error to prevent buildup
      this.chunkBuffer = [];
    }
  }

  private updateLatencyStats(latency: number): void {
    if (this.stats.averageLatency === 0) {
      this.stats.averageLatency = latency;
    } else {
      // Exponential moving average
      this.stats.averageLatency = (this.stats.averageLatency * 0.8) + (latency * 0.2);
    }
  }

  private resetStats(): void {
    this.stats = {
      bytesSent: 0,
      chunksSent: 0,
      averageLatency: 0,
      compressionRatio: 1.0,
      lastSentAt: 0
    };
  }

  getStats(): StreamingStats {
    return { ...this.stats };
  }

  getConfig(): StreamingConfig {
    return { ...this.config };
  }

  isActive(): boolean {
    return this.isStreaming;
  }

  // Event handlers for Socket.IO responses
  onTranscriptionResult(callback: (result: any) => void): void {
    if (this.socket) {
      this.socket.on('transcription-result', callback);
    }
  }

  onStreamingError(callback: (error: any) => void): void {
    if (this.socket) {
      this.socket.on('streaming-error', callback);
    }
  }

  onStreamingStatus(callback: (status: any) => void): void {
    if (this.socket) {
      this.socket.on('streaming-status', callback);
    }
  }

  // Cleanup
  cleanup(): void {
    this.stopStreaming();
    
    if (this.socket) {
      this.socket.off('transcription-result');
      this.socket.off('streaming-error');
      this.socket.off('streaming-status');
    }
  }
}

export const audioStreamingService = new AudioStreamingService();