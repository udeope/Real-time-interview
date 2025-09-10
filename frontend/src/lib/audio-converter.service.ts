import { AudioFormat, ConversionOptions, AudioChunk } from '@/types/audio.types';

export class AudioConverterService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  async convertToFormat(
    audioData: ArrayBuffer | AudioChunk[], 
    options: ConversionOptions
  ): Promise<Blob> {
    switch (options.format) {
      case 'wav':
        return this.convertToWav(audioData, options);
      case 'webm':
        return this.convertToWebM(audioData, options);
      case 'mp3':
        return this.convertToMp3(audioData, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  private async convertToWav(
    audioData: ArrayBuffer | AudioChunk[], 
    options: ConversionOptions
  ): Promise<Blob> {
    let buffer: ArrayBuffer;
    let sampleRate = options.sampleRate || 44100;
    let channelCount = 1;

    if (Array.isArray(audioData)) {
      // Concatenate multiple chunks
      const totalLength = audioData.reduce((sum, chunk) => sum + chunk.data.byteLength, 0);
      buffer = new ArrayBuffer(totalLength);
      const view = new Uint8Array(buffer);
      let offset = 0;

      for (const chunk of audioData) {
        view.set(new Uint8Array(chunk.data), offset);
        offset += chunk.data.byteLength;
        sampleRate = chunk.sampleRate;
        channelCount = chunk.channelCount;
      }
    } else {
      buffer = audioData;
    }

    return this.createWavBlob(buffer, sampleRate, channelCount);
  }

  private createWavBlob(audioBuffer: ArrayBuffer, sampleRate: number, channelCount: number): Blob {
    const audioData = new Float32Array(audioBuffer);
    const length = audioData.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channelCount * 2, true);
    view.setUint16(32, channelCount * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private async convertToWebM(
    audioData: ArrayBuffer | AudioChunk[], 
    options: ConversionOptions
  ): Promise<Blob> {
    // For WebM, we'll use MediaRecorder if available
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      throw new Error('WebM format not supported by this browser');
    }

    // Create a temporary audio context and stream
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    
    // Create buffer source from audio data
    let buffer: ArrayBuffer;
    if (Array.isArray(audioData)) {
      const totalLength = audioData.reduce((sum, chunk) => sum + chunk.data.byteLength / 4, 0);
      const float32Array = new Float32Array(totalLength);
      let offset = 0;

      for (const chunk of audioData) {
        const chunkData = new Float32Array(chunk.data);
        float32Array.set(chunkData, offset);
        offset += chunkData.length;
      }
      buffer = float32Array.buffer;
    } else {
      buffer = audioData;
    }

    const audioBuffer = await audioContext.decodeAudioData(buffer.slice(0));
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);

    return new Promise((resolve, reject) => {
      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: options.bitRate || 128000
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        audioContext.close();
        resolve(blob);
      };

      mediaRecorder.onerror = (event) => {
        audioContext.close();
        reject(new Error('MediaRecorder error'));
      };

      mediaRecorder.start();
      source.start();
      
      // Stop after the audio finishes
      source.onended = () => {
        mediaRecorder.stop();
      };
    });
  }

  private async convertToMp3(
    audioData: ArrayBuffer | AudioChunk[], 
    options: ConversionOptions
  ): Promise<Blob> {
    // MP3 encoding requires a library like lamejs
    // For now, we'll throw an error and suggest using WAV or WebM
    throw new Error('MP3 conversion requires additional library. Please use WAV or WebM format.');
  }

  async convertChunksToBlob(chunks: AudioChunk[], format: AudioFormat = 'wav'): Promise<Blob> {
    const options: ConversionOptions = {
      format,
      sampleRate: chunks[0]?.sampleRate || 44100,
      bitRate: 128000
    };

    return this.convertToFormat(chunks, options);
  }

  async resampleAudio(
    audioBuffer: ArrayBuffer, 
    fromSampleRate: number, 
    toSampleRate: number
  ): Promise<ArrayBuffer> {
    if (fromSampleRate === toSampleRate) {
      return audioBuffer;
    }

    const audioContext = new AudioContext({ sampleRate: toSampleRate });
    const buffer = await audioContext.decodeAudioData(audioBuffer.slice(0));
    
    // Create offline context for resampling
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      Math.ceil(buffer.length * toSampleRate / fromSampleRate),
      toSampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start();

    const resampledBuffer = await offlineContext.startRendering();
    
    // Convert back to ArrayBuffer
    const channelData = resampledBuffer.getChannelData(0);
    const arrayBuffer = new ArrayBuffer(channelData.length * 4);
    const view = new Float32Array(arrayBuffer);
    view.set(channelData);

    await audioContext.close();
    return arrayBuffer;
  }

  async compressAudio(audioData: ArrayBuffer, quality: number = 0.7): Promise<ArrayBuffer> {
    // Simple compression by reducing bit depth
    const inputData = new Float32Array(audioData);
    const compressionFactor = Math.max(0.1, Math.min(1.0, quality));
    
    // Reduce dynamic range
    const outputData = new Float32Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      outputData[i] = inputData[i] * compressionFactor;
    }

    return outputData.buffer;
  }

  getFormatInfo(format: AudioFormat): { mimeType: string; extension: string; description: string } {
    switch (format) {
      case 'wav':
        return {
          mimeType: 'audio/wav',
          extension: '.wav',
          description: 'Uncompressed WAV audio'
        };
      case 'webm':
        return {
          mimeType: 'audio/webm',
          extension: '.webm',
          description: 'WebM audio container'
        };
      case 'mp3':
        return {
          mimeType: 'audio/mpeg',
          extension: '.mp3',
          description: 'MP3 compressed audio'
        };
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  isFormatSupported(format: AudioFormat): boolean {
    switch (format) {
      case 'wav':
        return true; // Always supported via Web Audio API
      case 'webm':
        return MediaRecorder.isTypeSupported('audio/webm');
      case 'mp3':
        return false; // Requires additional library
      default:
        return false;
    }
  }
}

export const audioConverterService = new AudioConverterService();