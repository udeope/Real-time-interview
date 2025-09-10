import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechClient } from '@google-cloud/speech';
import { Observable, Subject, from, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ITranscriptionProvider, TranscriptionResult, TranscriptionConfig } from '../interfaces/transcription.interface';
import * as crypto from 'crypto';

@Injectable()
export class GoogleSpeechService implements ITranscriptionProvider {
  private readonly logger = new Logger(GoogleSpeechService.name);
  private readonly speechClient: SpeechClient;
  private readonly projectId: string;

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    
    // Initialize Google Speech client
    const credentials = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    
    if (credentials) {
      this.speechClient = new SpeechClient({
        keyFilename: credentials,
        projectId: this.projectId,
      });
    } else {
      // Use default credentials (for Cloud Run, GKE, etc.)
      this.speechClient = new SpeechClient({
        projectId: this.projectId,
      });
    }
  }

  getProviderName(): string {
    return 'google';
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test the connection by making a simple request
      await this.speechClient.initialize();
      return true;
    } catch (error) {
      this.logger.error('Google Speech-to-Text service is not available', error);
      return false;
    }
  }

  transcribeRealTime(audioStream: Observable<Buffer>, config: TranscriptionConfig): Observable<TranscriptionResult> {
    const resultSubject = new Subject<TranscriptionResult>();

    this.setupStreamingRecognition(audioStream, config, resultSubject);

    return resultSubject.asObservable();
  }

  async transcribeAudio(audioBuffer: Buffer, config: TranscriptionConfig): Promise<TranscriptionResult> {
    try {
      const request = {
        audio: {
          content: audioBuffer.toString('base64'),
        },
        config: this.buildRecognitionConfig(config),
      };

      const [response] = await this.speechClient.recognize(request);
      
      if (!response.results || response.results.length === 0) {
        throw new Error('No transcription results received from Google Speech-to-Text');
      }

      const result = response.results[0];
      const alternative = result.alternatives?.[0];

      if (!alternative) {
        throw new Error('No alternative transcriptions received');
      }

      return {
        id: crypto.randomUUID(),
        sessionId: '', // Will be set by caller
        audioChunkId: '', // Will be set by caller
        text: alternative.transcript || '',
        confidence: alternative.confidence || 0,
        isFinal: true,
        provider: 'google',
        language: config.language || 'en-US',
        startTime: result.resultEndTime?.seconds ? Number(result.resultEndTime.seconds) : undefined,
        endTime: result.resultEndTime?.seconds ? Number(result.resultEndTime.seconds) : undefined,
        alternatives: result.alternatives?.slice(1).map(alt => ({
          text: alt.transcript || '',
          confidence: alt.confidence || 0,
        })),
        metadata: {
          languageCode: response.results[0].languageCode,
          channelTag: result.channelTag,
        },
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error transcribing audio with Google Speech-to-Text', error);
      throw error;
    }
  }

  private setupStreamingRecognition(
    audioStream: Observable<Buffer>,
    config: TranscriptionConfig,
    resultSubject: Subject<TranscriptionResult>
  ): void {
    try {
      const recognizeStream = this.speechClient
        .streamingRecognize({
          config: this.buildRecognitionConfig(config),
          interimResults: true,
          enableVoiceActivityEvents: true,
        })
        .on('error', (error) => {
          this.logger.error('Google Speech streaming error', error);
          resultSubject.error(error);
        })
        .on('data', (data) => {
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const alternative = result.alternatives?.[0];

            if (alternative) {
              const transcriptionResult: TranscriptionResult = {
                id: crypto.randomUUID(),
                sessionId: '', // Will be set by caller
                audioChunkId: '', // Will be set by caller
                text: alternative.transcript || '',
                confidence: alternative.confidence || 0,
                isFinal: result.isFinal || false,
                provider: 'google',
                language: config.language || 'en-US',
                startTime: result.resultEndTime?.seconds ? Number(result.resultEndTime.seconds) : undefined,
                endTime: result.resultEndTime?.seconds ? Number(result.resultEndTime.seconds) : undefined,
                alternatives: result.alternatives?.slice(1).map(alt => ({
                  text: alt.transcript || '',
                  confidence: alt.confidence || 0,
                })),
                metadata: {
                  languageCode: data.results[0].languageCode,
                  channelTag: result.channelTag,
                  speechEventType: data.speechEventType,
                },
                createdAt: new Date(),
              };

              resultSubject.next(transcriptionResult);
            }
          }
        })
        .on('end', () => {
          this.logger.debug('Google Speech streaming ended');
          resultSubject.complete();
        });

      // Pipe audio stream to Google Speech
      audioStream.subscribe({
        next: (audioChunk) => {
          if (recognizeStream.writable) {
            recognizeStream.write(audioChunk);
          }
        },
        error: (error) => {
          this.logger.error('Audio stream error', error);
          recognizeStream.destroy();
          resultSubject.error(error);
        },
        complete: () => {
          this.logger.debug('Audio stream completed');
          recognizeStream.end();
        },
      });
    } catch (error) {
      this.logger.error('Error setting up Google Speech streaming', error);
      resultSubject.error(error);
    }
  }

  private buildRecognitionConfig(config: TranscriptionConfig) {
    return {
      encoding: 'WEBM_OPUS' as const,
      sampleRateHertz: config.sampleRate || 16000,
      languageCode: config.language || 'en-US',
      enableAutomaticPunctuation: config.enableAutomaticPunctuation ?? true,
      enableSpeakerDiarization: config.enableSpeakerDiarization ?? false,
      diarizationSpeakerCount: config.enableSpeakerDiarization ? 2 : undefined,
      profanityFilter: config.enableProfanityFilter ?? false,
      model: 'latest_long',
      useEnhanced: true,
      alternativeLanguageCodes: ['en-GB', 'en-AU'], // Fallback languages
      maxAlternatives: 3,
      enableWordTimeOffsets: true,
      enableWordConfidence: true,
    };
  }
}