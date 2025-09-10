import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Observable, Subject, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ITranscriptionProvider, TranscriptionResult, TranscriptionConfig } from '../interfaces/transcription.interface';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class WhisperService implements ITranscriptionProvider {
  private readonly logger = new Logger(WhisperService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured. Whisper service will not be available.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  getProviderName(): string {
    return 'whisper';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        return false;
      }

      // Test the connection by making a simple request
      await this.openai.models.list();
      return true;
    } catch (error) {
      this.logger.error('Whisper service is not available', error);
      return false;
    }
  }

  transcribeRealTime(audioStream: Observable<Buffer>, config: TranscriptionConfig): Observable<TranscriptionResult> {
    // Whisper doesn't support real-time streaming, so we'll buffer chunks and process them
    const resultSubject = new Subject<TranscriptionResult>();
    let audioBuffer = Buffer.alloc(0);
    let chunkCount = 0;
    const maxChunkSize = 1024 * 1024; // 1MB chunks

    audioStream.subscribe({
      next: async (chunk) => {
        audioBuffer = Buffer.concat([audioBuffer, chunk]);
        chunkCount++;

        // Process buffer when it reaches a certain size or after a certain number of chunks
        if (audioBuffer.length >= maxChunkSize || chunkCount >= 10) {
          try {
            const result = await this.transcribeAudio(audioBuffer, config);
            result.isFinal = false; // Mark as interim for streaming
            resultSubject.next(result);
            
            // Reset buffer
            audioBuffer = Buffer.alloc(0);
            chunkCount = 0;
          } catch (error) {
            this.logger.error('Error processing audio chunk with Whisper', error);
            // Don't emit error, just continue with next chunk
          }
        }
      },
      error: (error) => {
        this.logger.error('Audio stream error in Whisper service', error);
        resultSubject.error(error);
      },
      complete: async () => {
        // Process any remaining audio in buffer
        if (audioBuffer.length > 0) {
          try {
            const result = await this.transcribeAudio(audioBuffer, config);
            result.isFinal = true; // Mark as final
            resultSubject.next(result);
          } catch (error) {
            this.logger.error('Error processing final audio chunk with Whisper', error);
          }
        }
        resultSubject.complete();
      },
    });

    return resultSubject.asObservable();
  }

  async transcribeAudio(audioBuffer: Buffer, config: TranscriptionConfig): Promise<TranscriptionResult> {
    try {
      // Create a temporary file for the audio
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `whisper_${crypto.randomUUID()}.webm`);
      
      // Write audio buffer to temporary file
      fs.writeFileSync(tempFilePath, audioBuffer);

      try {
        const transcription = await this.openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: 'whisper-1',
          language: this.mapLanguageCode(config.language || 'en-US'),
          response_format: 'verbose_json',
          timestamp_granularities: ['word'],
        });

        // Clean up temporary file
        fs.unlinkSync(tempFilePath);

        // Calculate confidence based on Whisper's characteristics
        // Whisper doesn't provide confidence scores, so we estimate based on text characteristics
        const confidence = this.estimateConfidence(transcription.text);

        return {
          id: crypto.randomUUID(),
          sessionId: '', // Will be set by caller
          audioChunkId: '', // Will be set by caller
          text: transcription.text || '',
          confidence,
          isFinal: true,
          provider: 'whisper',
          language: config.language || 'en-US',
          startTime: 0, // Whisper provides word-level timestamps in segments
          endTime: transcription.duration,
          alternatives: [], // Whisper doesn't provide alternatives
          metadata: {
            model: 'whisper-1',
            duration: transcription.duration,
            language: transcription.language,
            segments: transcription.segments,
            words: transcription.words,
          },
          createdAt: new Date(),
        };
      } catch (apiError) {
        // Clean up temporary file in case of error
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        throw apiError;
      }
    } catch (error) {
      this.logger.error('Error transcribing audio with Whisper', error);
      throw error;
    }
  }

  private mapLanguageCode(languageCode: string): string {
    // Map from Google Speech language codes to Whisper language codes
    const languageMap: Record<string, string> = {
      'en-US': 'en',
      'en-GB': 'en',
      'en-AU': 'en',
      'es-ES': 'es',
      'es-MX': 'es',
      'fr-FR': 'fr',
      'de-DE': 'de',
      'it-IT': 'it',
      'pt-BR': 'pt',
      'pt-PT': 'pt',
      'ru-RU': 'ru',
      'ja-JP': 'ja',
      'ko-KR': 'ko',
      'zh-CN': 'zh',
      'zh-TW': 'zh',
    };

    return languageMap[languageCode] || languageCode.split('-')[0] || 'en';
  }

  private estimateConfidence(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    let confidence = 0.85; // Base confidence for Whisper

    // Adjust based on text characteristics
    const wordCount = text.split(/\s+/).length;
    
    // Longer texts tend to be more reliable
    if (wordCount > 10) {
      confidence += 0.05;
    } else if (wordCount < 3) {
      confidence -= 0.15;
    }

    // Check for common transcription artifacts
    if (text.includes('[') || text.includes('(') || text.includes('...')) {
      confidence -= 0.1;
    }

    // Check for repeated words (potential transcription error)
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > uniqueWords.size * 1.5) {
      confidence -= 0.1;
    }

    // Ensure confidence is within valid range
    return Math.max(0, Math.min(1, confidence));
  }
}