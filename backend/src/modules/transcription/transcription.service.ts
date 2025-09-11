import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import * as crypto from 'crypto';
import { TranscriptionRepository } from './transcription.repository';
import { GoogleSpeechService } from './providers/google-speech.service';
import { WhisperService } from './providers/whisper.service';
import { AudioProcessingService } from './services/audio-processing.service';
import { SpeakerDiarizationService } from './services/speaker-diarization.service';
import { TranscriptionCacheService } from './services/transcription-cache.service';
import { TranscriptionFallbackService } from './services/transcription-fallback.service';
import { ErrorHandlerService } from '../../common/errors/error-handler.service';
import { ErrorType, ErrorSeverity } from '../../common/errors/error-types';
import {
  TranscriptionResult,
  AudioChunk,
  TranscriptionConfig,
  TranscriptionQuality,
  TranscriptionMetrics,
  ITranscriptionProvider,
} from './interfaces/transcription.interface';
import { AudioChunkDto, TranscriptionConfigDto } from './dto/transcription.dto';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly providers = new Map<string, ITranscriptionProvider>();

  constructor(
    private readonly repository: TranscriptionRepository,
    private readonly googleSpeech: GoogleSpeechService,
    private readonly whisper: WhisperService,
    private readonly audioProcessor: AudioProcessingService,
    private readonly speakerDiarization: SpeakerDiarizationService,
    private readonly cache: TranscriptionCacheService,
    private readonly fallbackService: TranscriptionFallbackService,
    private readonly errorHandler: ErrorHandlerService,
  ) {
    this.initializeProviders();
  }

  transcribeRealTime(
    sessionId: string,
    audioStream: Observable<Buffer>,
    config: TranscriptionConfig = {},
  ): Observable<TranscriptionResult> {
    const startTime = Date.now();
    const resultSubject = new Subject<TranscriptionResult>();

    // Initialize the transcription pipeline asynchronously
    this.initializeTranscriptionPipeline(sessionId, audioStream, config, resultSubject, startTime);

    return resultSubject.asObservable();
  }

  private async initializeTranscriptionPipeline(
    sessionId: string,
    audioStream: Observable<Buffer>,
    config: TranscriptionConfig,
    resultSubject: Subject<TranscriptionResult>,
    startTime: number,
  ): Promise<void> {
    try {
      const provider = await this.selectProvider(config.provider);
      
      if (!provider) {
        throw new Error('No transcription provider available');
      }

      this.logger.log(`Starting real-time transcription for session ${sessionId} with provider: ${provider.getProviderName()}`);

      // Process audio stream and transcribe
      const processedStream = audioStream.pipe(
        mergeMap(async (audioChunk) => {
          try {
            // Process audio chunk
            const processedAudio = await this.audioProcessor.processAudioChunk(audioChunk, config.format || 'webm');
            
            // Check cache first
            const audioHash = this.audioProcessor.generateAudioHash(processedAudio);
            const cachedResult = await this.cache.get(audioHash);
            
            if (cachedResult) {
              this.logger.debug('Using cached transcription result');
              return { audioChunk: processedAudio, cachedResult, audioHash };
            }

            return { audioChunk: processedAudio, cachedResult: null, audioHash };
          } catch (error) {
            this.logger.error('Error processing audio chunk', error);
            throw error;
          }
        }),
      );

      // Subscribe to processed stream and handle transcription
      processedStream.subscribe({
        next: async ({ audioChunk, cachedResult, audioHash }) => {
          try {
            if (cachedResult) {
              // Use cached result
              const result = {
                ...cachedResult,
                sessionId,
                id: crypto.randomUUID(),
                createdAt: new Date(),
              };
              
              await this.saveTranscriptionResult(result);
              resultSubject.next(result);
              return;
            }

            // Create audio chunk record
            const audioChunkRecord = await this.saveAudioChunk({
              sessionId,
              chunkIndex: Date.now(), // Use timestamp as chunk index for real-time
              audioData: audioChunk,
              format: config.format || 'webm',
              sampleRate: config.sampleRate || 16000,
              channels: config.channels || 1,
              duration: await this.estimateAudioDuration(audioChunk),
            });

            // Transcribe with primary provider
            const transcriptionStream = provider.transcribeRealTime(of(audioChunk), config);
            
            transcriptionStream.subscribe({
              next: async (result) => {
                try {
                  // Enhance result with session and chunk info
                  const enhancedResult = {
                    ...result,
                    sessionId,
                    audioChunkId: audioChunkRecord.id,
                  };

                  // Apply speaker diarization if enabled
                  if (config.enableSpeakerDiarization) {
                    const speakers = await this.speakerDiarization.identifySpeakers(audioChunk, config);
                    enhancedResult.speakerId = speakers[0]?.speakerId;
                  }

                  // Save to database
                  await this.saveTranscriptionResult(enhancedResult);

                  // Cache the result
                  await this.cache.set(audioHash, enhancedResult);

                  // Emit result
                  resultSubject.next(enhancedResult);

                  // Record metrics
                  await this.recordMetrics({
                    latency: Date.now() - startTime,
                    accuracy: result.confidence,
                    confidence: result.confidence,
                    provider: provider.getProviderName(),
                    cacheHit: false,
                    processingTime: Date.now() - startTime,
                    audioSize: audioChunk.length,
                    wordCount: result.text.split(/\s+/).length,
                  });
                } catch (error) {
                  this.logger.error('Error processing transcription result', error);
                }
              },
              error: (error) => {
                this.logger.error('Transcription stream error', error);
                this.handleTranscriptionError(error, audioChunk, config, resultSubject);
              },
            });
          } catch (error) {
            this.logger.error('Error in transcription pipeline', error);
            resultSubject.error(error);
          }
        },
        error: (error) => {
          this.logger.error('Audio stream error', error);
          resultSubject.error(error);
        },
        complete: () => {
          this.logger.debug('Audio stream completed');
          resultSubject.complete();
        },
      });
    } catch (error) {
      this.logger.error('Error setting up real-time transcription', error);
      resultSubject.error(error);
    }
  }

  async transcribeAudioChunk(audioChunkDto: AudioChunkDto): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const context = {
      userId: audioChunkDto.userId,
      sessionId: audioChunkDto.sessionId,
      service: 'transcription',
      operation: 'transcribeAudioChunk',
      timestamp: new Date(),
    };

    try {
      // Decode audio data
      const audioBuffer = Buffer.from(audioChunkDto.audioData, 'base64');
      
      // Process audio
      const processedAudio = await this.audioProcessor.processAudioChunk(
        audioBuffer,
        audioChunkDto.format || 'webm'
      );

      // Check cache
      const audioHash = this.audioProcessor.generateAudioHash(processedAudio);
      const cachedResult = await this.cache.get(audioHash);
      
      if (cachedResult) {
        this.logger.debug('Using cached transcription result');
        return {
          ...cachedResult,
          sessionId: audioChunkDto.sessionId,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        };
      }

      // Use fallback service for transcription with error handling
      const result = await this.fallbackService.transcribeWithFallback(
        processedAudio,
        audioChunkDto.sessionId,
        audioChunkDto.userId,
      );

      // Save audio chunk
      const audioChunkRecord = await this.saveAudioChunk({
        sessionId: audioChunkDto.sessionId,
        chunkIndex: audioChunkDto.chunkIndex,
        audioData: processedAudio,
        format: audioChunkDto.format || 'webm',
        sampleRate: audioChunkDto.sampleRate || 16000,
        channels: audioChunkDto.channels || 1,
        duration: audioChunkDto.duration,
      });

      // Enhance result
      const enhancedResult = {
        ...result,
        sessionId: audioChunkDto.sessionId,
        audioChunkId: audioChunkRecord.id,
      };

      // Apply speaker diarization if enabled
      const config = audioChunkDto.config || {};
      if (config.enableSpeakerDiarization) {
        try {
          const speakers = await this.speakerDiarization.identifySpeakers(processedAudio, config);
          if (speakers.length > 0) {
            const assignedResult = this.speakerDiarization.assignSpeakerToTranscription(enhancedResult, speakers);
            Object.assign(enhancedResult, assignedResult);
          }
        } catch (diarizationError) {
          this.logger.warn('Speaker diarization failed, continuing without it', diarizationError);
        }
      }

      // Save result
      await this.saveTranscriptionResult(enhancedResult);

      // Cache result
      await this.cache.set(audioHash, enhancedResult);

      // Record metrics
      await this.recordMetrics({
        latency: Date.now() - startTime,
        accuracy: result.confidence,
        confidence: result.confidence,
        provider: result.provider || 'unknown',
        cacheHit: false,
        processingTime: Date.now() - startTime,
        audioSize: processedAudio.length,
        wordCount: result.text.split(/\s+/).length,
      });

      return enhancedResult;
    } catch (error) {
      const appError = this.errorHandler.createError(
        ErrorType.TRANSCRIPTION_API_FAILURE,
        ErrorSeverity.HIGH,
        context,
        'Failed to transcribe audio chunk',
        error,
      );
      
      await this.errorHandler.handleError(appError);
      throw appError;
    }
  }

  async refineTranscription(transcriptionId: string): Promise<TranscriptionResult> {
    try {
      const existingResult = await this.repository.getTranscriptionsBySession(transcriptionId);
      
      if (!existingResult || existingResult.length === 0) {
        throw new Error('Transcription not found');
      }

      const originalResult = existingResult[0];
      
      // Get the audio chunk
      const audioChunk = await this.repository.getAudioChunk(originalResult.audioChunkId);
      
      if (!audioChunk || !audioChunk.audioData) {
        throw new Error('Audio data not found for refinement');
      }

      // Use Whisper for refinement (higher accuracy)
      const whisperResult = await this.whisper.transcribeAudio(audioChunk.audioData, {
        language: originalResult.language,
        enableAutomaticPunctuation: true,
      });

      // Create refined result
      const refinedResult = {
        ...whisperResult,
        sessionId: originalResult.sessionId,
        audioChunkId: originalResult.audioChunkId,
        interactionId: originalResult.interactionId,
        metadata: {
          ...whisperResult.metadata,
          originalProvider: originalResult.provider,
          originalConfidence: originalResult.confidence,
          refinedAt: new Date().toISOString(),
        },
      };

      // Save refined result
      await this.saveTranscriptionResult(refinedResult);

      return refinedResult;
    } catch (error) {
      this.logger.error('Error refining transcription', error);
      throw error;
    }
  }

  async getTranscriptionsBySession(sessionId: string): Promise<TranscriptionResult[]> {
    return this.repository.getTranscriptionsBySession(sessionId);
  }

  async getTranscriptionsByInteraction(interactionId: string): Promise<TranscriptionResult[]> {
    return this.repository.getTranscriptionsByInteraction(interactionId);
  }

  async assessTranscriptionQuality(sessionId: string): Promise<TranscriptionQuality> {
    try {
      const transcriptions = await this.repository.getTranscriptionsBySession(sessionId);
      
      if (transcriptions.length === 0) {
        return {
          wordErrorRate: 1.0,
          averageConfidence: 0,
          totalWords: 0,
          correctWords: 0,
          substitutions: 0,
          deletions: 0,
          insertions: 0,
        };
      }

      const totalWords = transcriptions.reduce((sum, t) => sum + t.text.split(/\s+/).length, 0);
      const averageConfidence = transcriptions.reduce((sum, t) => sum + t.confidence, 0) / transcriptions.length;
      
      // Estimate quality based on confidence scores
      // In a real implementation, you would compare against ground truth
      const estimatedCorrectWords = Math.floor(totalWords * averageConfidence);
      const estimatedErrors = totalWords - estimatedCorrectWords;
      const wordErrorRate = totalWords > 0 ? estimatedErrors / totalWords : 1.0;

      return {
        wordErrorRate,
        averageConfidence,
        totalWords,
        correctWords: estimatedCorrectWords,
        substitutions: Math.floor(estimatedErrors * 0.6), // Rough estimates
        deletions: Math.floor(estimatedErrors * 0.2),
        insertions: Math.floor(estimatedErrors * 0.2),
      };
    } catch (error) {
      this.logger.error('Error assessing transcription quality', error);
      throw error;
    }
  }

  private async initializeProviders(): Promise<void> {
    try {
      // Register Google Speech provider
      if (await this.googleSpeech.isAvailable()) {
        this.providers.set('google', this.googleSpeech);
        this.logger.log('Google Speech-to-Text provider initialized');
      }

      // Register Whisper provider
      if (await this.whisper.isAvailable()) {
        this.providers.set('whisper', this.whisper);
        this.logger.log('Whisper provider initialized');
      }

      if (this.providers.size === 0) {
        this.logger.warn('No transcription providers available');
      }
    } catch (error) {
      this.logger.error('Error initializing transcription providers', error);
    }
  }

  private async selectProvider(preferredProvider?: string): Promise<ITranscriptionProvider | null> {
    if (preferredProvider && this.providers.has(preferredProvider)) {
      const provider = this.providers.get(preferredProvider);
      if (provider && await provider.isAvailable()) {
        return provider;
      }
    }

    // Fallback to any available provider
    for (const [name, provider] of this.providers) {
      if (await provider.isAvailable()) {
        this.logger.debug(`Using fallback provider: ${name}`);
        return provider;
      }
    }

    return null;
  }

  private async handleTranscriptionError(
    error: any,
    audioChunk: Buffer,
    config: TranscriptionConfig,
    resultSubject: Subject<TranscriptionResult>
  ): Promise<void> {
    try {
      this.logger.warn('Primary transcription failed, trying fallback provider', error);
      
      // Try fallback provider
      const fallbackProvider = config.provider === 'google' ? 'whisper' : 'google';
      const provider = await this.selectProvider(fallbackProvider);
      
      if (provider) {
        const result = await provider.transcribeAudio(audioChunk, config);
        result.metadata = {
          ...result.metadata,
          fallbackUsed: true,
          originalError: error.message,
        };
        resultSubject.next(result);
      } else {
        resultSubject.error(new Error('All transcription providers failed'));
      }
    } catch (fallbackError) {
      this.logger.error('Fallback transcription also failed', fallbackError);
      resultSubject.error(fallbackError);
    }
  }

  private async saveAudioChunk(data: Omit<AudioChunk, 'id' | 'createdAt'>): Promise<AudioChunk> {
    return this.repository.createAudioChunk(data);
  }

  private async saveTranscriptionResult(result: TranscriptionResult): Promise<TranscriptionResult> {
    return this.repository.createTranscriptionResult(result);
  }

  private async estimateAudioDuration(audioData: Buffer): Promise<number> {
    const features = await this.audioProcessor.extractAudioFeatures(audioData);
    return features.duration;
  }

  private async recordMetrics(metrics: TranscriptionMetrics): Promise<void> {
    try {
      // In a production environment, you would send these metrics to a monitoring system
      this.logger.debug('Transcription metrics', metrics);
    } catch (error) {
      this.logger.error('Error recording metrics', error);
    }
  }
}