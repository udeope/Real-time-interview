import { Injectable, Logger } from '@nestjs/common';
import { TranscriptionService } from '../transcription.service';
import { WhisperService } from '../providers/whisper.service';
import { CircuitBreakerService } from '../../../common/circuit-breaker/circuit-breaker.service';
import { ErrorHandlerService } from '../../../common/errors/error-handler.service';
import { ErrorType, ErrorSeverity } from '../../../common/errors/error-types';
import { TranscriptionResult, TranscriptionProvider } from '../interfaces/transcription.interface';

@Injectable()
export class TranscriptionFallbackService {
  private readonly logger = new Logger(TranscriptionFallbackService.name);
  private currentProvider: TranscriptionProvider = 'google';
  private readonly providerPriority: TranscriptionProvider[] = ['google', 'whisper'];

  constructor(
    private readonly transcriptionService: TranscriptionService,
    private readonly whisperService: WhisperService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async transcribeWithFallback(
    audioBuffer: Buffer,
    sessionId: string,
    userId?: string,
  ): Promise<TranscriptionResult> {
    const context = {
      userId,
      sessionId,
      service: 'transcription',
      operation: 'transcribe',
      timestamp: new Date(),
    };

    // Try primary provider first
    try {
      return await this.tryProvider(this.currentProvider, audioBuffer, context);
    } catch (error) {
      this.logger.warn(`Primary provider ${this.currentProvider} failed, trying fallback`);
      
      // Try fallback providers
      for (const provider of this.providerPriority) {
        if (provider === this.currentProvider) continue;
        
        try {
          const result = await this.tryProvider(provider, audioBuffer, context);
          
          // Switch to working provider
          if (provider !== this.currentProvider) {
            this.logger.log(`Switched transcription provider from ${this.currentProvider} to ${provider}`);
            this.currentProvider = provider;
          }
          
          return result;
        } catch (fallbackError) {
          this.logger.warn(`Fallback provider ${provider} also failed`);
          continue;
        }
      }

      // All providers failed
      const appError = this.errorHandler.createError(
        ErrorType.TRANSCRIPTION_API_FAILURE,
        ErrorSeverity.HIGH,
        context,
        'All transcription providers failed',
        error,
      );

      throw appError;
    }
  }

  private async tryProvider(
    provider: TranscriptionProvider,
    audioBuffer: Buffer,
    context: any,
  ): Promise<TranscriptionResult> {
    const circuitName = `transcription-${provider}`;
    
    return await this.circuitBreaker.execute(
      circuitName,
      async () => {
        switch (provider) {
          case 'google':
            return await this.transcriptionService.transcribeAudio(audioBuffer);
          case 'whisper':
            return await this.whisperService.transcribe(audioBuffer);
          default:
            throw new Error(`Unknown transcription provider: ${provider}`);
        }
      },
      async () => {
        // Fallback to next provider in priority list
        const nextProvider = this.getNextProvider(provider);
        if (nextProvider && nextProvider !== provider) {
          return await this.tryProvider(nextProvider, audioBuffer, context);
        }
        throw new Error('No fallback provider available');
      },
    );
  }

  private getNextProvider(currentProvider: TranscriptionProvider): TranscriptionProvider | null {
    const currentIndex = this.providerPriority.indexOf(currentProvider);
    if (currentIndex === -1 || currentIndex === this.providerPriority.length - 1) {
      return null;
    }
    return this.providerPriority[currentIndex + 1];
  }

  async streamTranscribeWithFallback(
    audioStream: AsyncIterable<Buffer>,
    sessionId: string,
    userId?: string,
  ): Promise<AsyncIterable<TranscriptionResult>> {
    const context = {
      userId,
      sessionId,
      service: 'transcription',
      operation: 'streamTranscribe',
      timestamp: new Date(),
    };

    try {
      return await this.tryStreamProvider(this.currentProvider, audioStream, context);
    } catch (error) {
      this.logger.warn(`Primary streaming provider ${this.currentProvider} failed, trying fallback`);
      
      // For streaming, we need to handle fallback differently
      // We'll switch provider but may lose some audio data
      for (const provider of this.providerPriority) {
        if (provider === this.currentProvider) continue;
        
        try {
          const result = await this.tryStreamProvider(provider, audioStream, context);
          
          if (provider !== this.currentProvider) {
            this.logger.log(`Switched streaming provider from ${this.currentProvider} to ${provider}`);
            this.currentProvider = provider;
          }
          
          return result;
        } catch (fallbackError) {
          this.logger.warn(`Fallback streaming provider ${provider} also failed`);
          continue;
        }
      }

      // All streaming providers failed
      const appError = this.errorHandler.createError(
        ErrorType.TRANSCRIPTION_API_FAILURE,
        ErrorSeverity.HIGH,
        context,
        'All streaming transcription providers failed',
        error,
      );

      throw appError;
    }
  }

  private async tryStreamProvider(
    provider: TranscriptionProvider,
    audioStream: AsyncIterable<Buffer>,
    context: any,
  ): Promise<AsyncIterable<TranscriptionResult>> {
    const circuitName = `transcription-${provider}`;
    
    return await this.circuitBreaker.execute(
      circuitName,
      async () => {
        switch (provider) {
          case 'google':
            return await this.transcriptionService.streamTranscribe(audioStream);
          case 'whisper':
            // Whisper doesn't support streaming, so we'll buffer and process in chunks
            return await this.whisperService.streamTranscribe(audioStream);
          default:
            throw new Error(`Unknown streaming transcription provider: ${provider}`);
        }
      },
    );
  }

  getCurrentProvider(): TranscriptionProvider {
    return this.currentProvider;
  }

  setProvider(provider: TranscriptionProvider): void {
    if (this.providerPriority.includes(provider)) {
      this.currentProvider = provider;
      this.logger.log(`Manually switched transcription provider to ${provider}`);
    } else {
      throw new Error(`Invalid transcription provider: ${provider}`);
    }
  }

  getProviderStatus(): Record<TranscriptionProvider, boolean> {
    const status: Record<TranscriptionProvider, boolean> = {} as any;
    
    for (const provider of this.providerPriority) {
      const circuitName = `transcription-${provider}`;
      status[provider] = !this.circuitBreaker.isCircuitOpen(circuitName);
    }
    
    return status;
  }

  async testProvider(provider: TranscriptionProvider): Promise<boolean> {
    try {
      // Create a small test audio buffer
      const testAudio = Buffer.alloc(1024);
      await this.tryProvider(provider, testAudio, {
        service: 'transcription',
        operation: 'test',
        timestamp: new Date(),
      });
      return true;
    } catch (error) {
      this.logger.warn(`Provider ${provider} test failed:`, error.message);
      return false;
    }
  }

  async getProviderHealth(): Promise<Record<TranscriptionProvider, { available: boolean; latency?: number }>> {
    const health: Record<TranscriptionProvider, { available: boolean; latency?: number }> = {} as any;
    
    for (const provider of this.providerPriority) {
      const startTime = Date.now();
      const available = await this.testProvider(provider);
      const latency = available ? Date.now() - startTime : undefined;
      
      health[provider] = { available, latency };
    }
    
    return health;
  }
}