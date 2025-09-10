import { 
  AudioSource, 
  CaptureConfig, 
  AudioChunk, 
  AudioStream, 
  AudioLevelData, 
  AudioError, 
  AudioRecoveryAction 
} from '@/types/audio.types';

export class AudioCaptureService {
  private currentStream: AudioStream | null = null;
  private audioContext: AudioContext | null = null;
  private isCapturing = false;
  private audioDataCallbacks: ((chunk: AudioChunk) => void)[] = [];
  private audioLevelCallbacks: ((level: AudioLevelData) => void)[] = [];
  private errorCallbacks: ((error: AudioError) => void)[] = [];

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      throw new Error('Web Audio API not supported');
    }
  }

  async detectAvailableSources(): Promise<AudioSource[]> {
    try {
      // Request permissions first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      const sources: AudioSource[] = audioInputs.map(device => ({
        id: device.deviceId,
        type: 'microphone' as const,
        name: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
        isAvailable: true,
        requiresPermission: true,
        deviceInfo: device
      }));

      // Add system audio option (if supported)
      if (this.isSystemAudioSupported()) {
        sources.push({
          id: 'system-audio',
          type: 'system',
          name: 'System Audio',
          isAvailable: true,
          requiresPermission: true
        });
      }

      return sources;
    } catch (error) {
      console.error('Failed to detect audio sources:', error);
      
      // Return default microphone option even if enumeration fails
      return [{
        id: 'default',
        type: 'microphone',
        name: 'Default Microphone',
        isAvailable: true,
        requiresPermission: true
      }];
    }
  }

  private isSystemAudioSupported(): boolean {
    return 'getDisplayMedia' in navigator.mediaDevices;
  }

  async selectAudioSource(sourceId: string): Promise<MediaStream> {
    try {
      let constraints: MediaStreamConstraints;

      if (sourceId === 'system-audio') {
        // Use getDisplayMedia for system audio
        constraints = {
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } as any,
          video: false
        };
        return await (navigator.mediaDevices as any).getDisplayMedia(constraints);
      } else {
        // Use getUserMedia for microphone
        constraints = {
          audio: sourceId === 'default' ? true : { deviceId: { exact: sourceId } }
        };
        return await navigator.mediaDevices.getUserMedia(constraints);
      }
    } catch (error) {
      console.error('Failed to select audio source:', error);
      throw this.createAudioError('DEVICE_NOT_FOUND', 'Failed to access selected audio source', error as Error);
    }
  }

  async startCapture(config: CaptureConfig = {}): Promise<AudioStream> {
    try {
      if (this.isCapturing) {
        throw new Error('Audio capture already in progress');
      }

      if (!this.audioContext) {
        await this.initializeAudioContext();
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          sampleRate: config.sampleRate || 44100,
          channelCount: config.channelCount || 1,
          echoCancellation: config.echoCancellation ?? true,
          noiseSuppression: config.noiseSuppression ?? true,
          autoGainControl: config.autoGainControl ?? true,
          ...(config.deviceId && { deviceId: { exact: config.deviceId } })
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      const source = this.audioContext!.createMediaStreamSource(mediaStream);
      
      // Create analyser for audio level monitoring
      const analyser = this.audioContext!.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      // Create processor for audio data extraction
      const processor = this.audioContext!.createScriptProcessor(4096, 1, 1);
      
      // Connect the audio graph
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(this.audioContext!.destination);

      const audioStream: AudioStream = {
        id: `stream-${Date.now()}`,
        mediaStream,
        audioContext: this.audioContext!,
        analyser,
        processor
      };

      // Set up audio data processing
      processor.onaudioprocess = (event) => {
        if (!this.isCapturing) return;

        const inputBuffer = event.inputBuffer;
        const channelData = inputBuffer.getChannelData(0);
        
        // Convert to ArrayBuffer
        const arrayBuffer = new ArrayBuffer(channelData.length * 4);
        const view = new Float32Array(arrayBuffer);
        view.set(channelData);

        const chunk: AudioChunk = {
          data: arrayBuffer,
          timestamp: Date.now(),
          sampleRate: inputBuffer.sampleRate,
          channelCount: inputBuffer.numberOfChannels
        };

        // Emit audio data to callbacks
        this.audioDataCallbacks.forEach(callback => callback(chunk));

        // Calculate and emit audio levels
        this.emitAudioLevels(analyser);
      };

      this.currentStream = audioStream;
      this.isCapturing = true;

      return audioStream;
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw this.createAudioError('PERMISSION_DENIED', 'Microphone permission denied', error);
        } else if (error.name === 'NotFoundError') {
          throw this.createAudioError('DEVICE_NOT_FOUND', 'No audio input device found', error);
        }
      }
      
      throw this.createAudioError('CONTEXT_ERROR', 'Failed to initialize audio capture', error as Error);
    }
  }

  private emitAudioLevels(analyser: AnalyserNode): void {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate RMS and peak values
    let sum = 0;
    let peak = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const value = dataArray[i] / 255;
      sum += value * value;
      peak = Math.max(peak, value);
    }
    
    const rms = Math.sqrt(sum / dataArray.length);
    const volume = rms;

    const levelData: AudioLevelData = {
      volume,
      peak,
      rms,
      timestamp: Date.now()
    };

    this.audioLevelCallbacks.forEach(callback => callback(levelData));
  }

  async stopCapture(): Promise<void> {
    try {
      if (!this.isCapturing || !this.currentStream) {
        return;
      }

      this.isCapturing = false;

      // Stop all tracks
      this.currentStream.mediaStream.getTracks().forEach(track => track.stop());

      // Disconnect audio nodes
      this.currentStream.processor.disconnect();
      this.currentStream.analyser.disconnect();

      // Clean up
      this.currentStream = null;
    } catch (error) {
      console.error('Failed to stop audio capture:', error);
      throw this.createAudioError('CONTEXT_ERROR', 'Failed to stop audio capture', error as Error);
    }
  }

  onAudioData(callback: (chunk: AudioChunk) => void): () => void {
    this.audioDataCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.audioDataCallbacks.indexOf(callback);
      if (index > -1) {
        this.audioDataCallbacks.splice(index, 1);
      }
    };
  }

  onAudioLevel(callback: (level: AudioLevelData) => void): () => void {
    this.audioLevelCallbacks.push(callback);
    
    return () => {
      const index = this.audioLevelCallbacks.indexOf(callback);
      if (index > -1) {
        this.audioLevelCallbacks.splice(index, 1);
      }
    };
  }

  onError(callback: (error: AudioError) => void): () => void {
    this.errorCallbacks.push(callback);
    
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  private createAudioError(type: AudioError['type'], message: string, originalError?: Error): AudioError {
    const error: AudioError = { type, message, originalError };
    
    // Emit to error callbacks
    this.errorCallbacks.forEach(callback => callback(error));
    
    return error;
  }

  async handleAudioError(error: AudioError): Promise<AudioRecoveryAction> {
    switch (error.type) {
      case 'PERMISSION_DENIED':
        return {
          action: 'SHOW_INSTRUCTIONS',
          fallback: 'MANUAL_UPLOAD',
          message: 'Microphone access is required for real-time transcription',
          instructions: [
            'Click the microphone icon in your browser\'s address bar',
            'Select "Allow" to grant microphone permission',
            'Refresh the page if needed',
            'Alternatively, you can upload audio files manually'
          ]
        };
      
      case 'DEVICE_NOT_FOUND':
        return {
          action: 'AUTO_DETECT',
          fallback: 'DEFAULT_DEVICE',
          message: 'No microphone detected. Searching for available devices...'
        };
      
      case 'STREAM_INTERRUPTED':
        return {
          action: 'RETRY',
          message: 'Audio stream was interrupted. Attempting to reconnect...'
        };
      
      default:
        return {
          action: 'FALLBACK',
          fallback: 'MANUAL_MODE',
          message: 'Audio capture unavailable. Please try manual mode.'
        };
    }
  }

  getStatus(): { isCapturing: boolean; currentStream: AudioStream | null } {
    return {
      isCapturing: this.isCapturing,
      currentStream: this.currentStream
    };
  }

  async cleanup(): Promise<void> {
    await this.stopCapture();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    
    this.audioDataCallbacks = [];
    this.audioLevelCallbacks = [];
    this.errorCallbacks = [];
  }
}

// Singleton instance
export const audioCaptureService = new AudioCaptureService();