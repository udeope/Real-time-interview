import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable, interval, map } from 'rxjs';
import { TranscriptionService } from './transcription.service';
import { TranscriptionCacheService } from './services/transcription-cache.service';
import {
  AudioChunkDto,
  TranscriptionConfigDto,
  TranscriptionResultDto,
  TranscriptionQualityDto,
  CacheStatsDto,
  TranscriptionProvider,
} from './dto/transcription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('transcription')
@UseGuards(JwtAuthGuard)
export class TranscriptionController {
  private readonly logger = new Logger(TranscriptionController.name);

  constructor(
    private readonly transcriptionService: TranscriptionService,
    private readonly cacheService: TranscriptionCacheService,
  ) {}

  private mapToDto(result: any): TranscriptionResultDto {
    return {
      id: result.id,
      sessionId: result.sessionId,
      interactionId: result.interactionId,
      audioChunkId: result.audioChunkId,
      text: result.text,
      confidence: result.confidence,
      isFinal: result.isFinal,
      provider: result.provider as TranscriptionProvider,
      language: result.language,
      speakerId: result.speakerId,
      startTime: result.startTime,
      endTime: result.endTime,
      alternatives: result.alternatives,
      metadata: result.metadata,
      createdAt: result.createdAt,
    };
  }

  @Post('transcribe')
  async transcribeAudioChunk(@Body() audioChunkDto: AudioChunkDto): Promise<TranscriptionResultDto> {
    try {
      this.logger.log(`Transcribing audio chunk for session: ${audioChunkDto.sessionId}`);
      
      const result = await this.transcriptionService.transcribeAudioChunk(audioChunkDto);
      
      return this.mapToDto(result);
    } catch (error) {
      this.logger.error('Error transcribing audio chunk', error);
      throw new HttpException(
        'Failed to transcribe audio chunk',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('transcribe/stream/:sessionId')
  @Sse()
  transcribeRealTime(
    @Param('sessionId') sessionId: string,
    @Body() config: TranscriptionConfigDto,
  ): Observable<MessageEvent> {
    try {
      this.logger.log(`Starting real-time transcription stream for session: ${sessionId}`);
      
      // This would typically be connected to a WebSocket or similar real-time connection
      // For now, we'll return a placeholder stream
      return interval(1000).pipe(
        map((index) => ({
          data: {
            message: `Real-time transcription placeholder ${index}`,
            sessionId,
            timestamp: new Date().toISOString(),
          },
        })),
      );
    } catch (error) {
      this.logger.error('Error setting up real-time transcription', error);
      throw new HttpException(
        'Failed to setup real-time transcription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('refine/:transcriptionId')
  async refineTranscription(@Param('transcriptionId') transcriptionId: string): Promise<TranscriptionResultDto> {
    try {
      this.logger.log(`Refining transcription: ${transcriptionId}`);
      
      const result = await this.transcriptionService.refineTranscription(transcriptionId);
      
      return this.mapToDto(result);
    } catch (error) {
      this.logger.error('Error refining transcription', error);
      throw new HttpException(
        'Failed to refine transcription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('session/:sessionId')
  async getTranscriptionsBySession(@Param('sessionId') sessionId: string): Promise<TranscriptionResultDto[]> {
    try {
      this.logger.log(`Getting transcriptions for session: ${sessionId}`);
      
      const results = await this.transcriptionService.getTranscriptionsBySession(sessionId);
      
      return results.map(result => this.mapToDto(result));
    } catch (error) {
      this.logger.error('Error getting transcriptions by session', error);
      throw new HttpException(
        'Failed to get transcriptions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('interaction/:interactionId')
  async getTranscriptionsByInteraction(@Param('interactionId') interactionId: string): Promise<TranscriptionResultDto[]> {
    try {
      this.logger.log(`Getting transcriptions for interaction: ${interactionId}`);
      
      const results = await this.transcriptionService.getTranscriptionsByInteraction(interactionId);
      
      return results.map(result => this.mapToDto(result));
    } catch (error) {
      this.logger.error('Error getting transcriptions by interaction', error);
      throw new HttpException(
        'Failed to get transcriptions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('quality/:sessionId')
  async getTranscriptionQuality(@Param('sessionId') sessionId: string): Promise<TranscriptionQualityDto> {
    try {
      this.logger.log(`Assessing transcription quality for session: ${sessionId}`);
      
      const quality = await this.transcriptionService.assessTranscriptionQuality(sessionId);
      
      return {
        wordErrorRate: quality.wordErrorRate,
        averageConfidence: quality.averageConfidence,
        totalWords: quality.totalWords,
        correctWords: quality.correctWords,
        substitutions: quality.substitutions,
        deletions: quality.deletions,
        insertions: quality.insertions,
      };
    } catch (error) {
      this.logger.error('Error assessing transcription quality', error);
      throw new HttpException(
        'Failed to assess transcription quality',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cache/stats')
  async getCacheStats(): Promise<CacheStatsDto> {
    try {
      this.logger.log('Getting transcription cache statistics');
      
      const stats = await this.cacheService.getStats();
      
      return {
        hitCount: stats.hitCount,
        missCount: stats.missCount,
        hitRate: stats.hitRate,
        totalRequests: stats.totalRequests,
        cacheSize: stats.cacheSize,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats', error);
      throw new HttpException(
        'Failed to get cache statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cache/cleanup')
  async cleanupCache(): Promise<{ message: string }> {
    try {
      this.logger.log('Cleaning up transcription cache');
      
      await this.cacheService.cleanup();
      
      return { message: 'Cache cleanup completed successfully' };
    } catch (error) {
      this.logger.error('Error cleaning up cache', error);
      throw new HttpException(
        'Failed to cleanup cache',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cache/invalidate')
  async invalidateCache(@Body('pattern') pattern: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Invalidating cache with pattern: ${pattern}`);
      
      await this.cacheService.invalidate(pattern);
      
      return { message: 'Cache invalidation completed successfully' };
    } catch (error) {
      this.logger.error('Error invalidating cache', error);
      throw new HttpException(
        'Failed to invalidate cache',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('providers/status')
  async getProviderStatus(): Promise<{
    google: { available: boolean };
    whisper: { available: boolean };
  }> {
    try {
      this.logger.log('Checking transcription provider status');
      
      // This would check the actual provider status
      // For now, return a placeholder response
      return {
        google: { available: true },
        whisper: { available: true },
      };
    } catch (error) {
      this.logger.error('Error checking provider status', error);
      throw new HttpException(
        'Failed to check provider status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}