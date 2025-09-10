import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../config/database.config';
import { TranscriptionResult, AudioChunk } from './interfaces/transcription.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class TranscriptionRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async createTranscriptionResult(data: Omit<TranscriptionResult, 'id' | 'createdAt'>): Promise<TranscriptionResult> {
    const result = await this.prisma.transcriptionResult.create({
      data: {
        sessionId: data.sessionId,
        interactionId: data.interactionId,
        audioChunkId: data.audioChunkId,
        text: data.text,
        confidence: new Prisma.Decimal(data.confidence),
        isFinal: data.isFinal,
        provider: data.provider,
        language: data.language,
        speakerId: data.speakerId,
        startTime: data.startTime ? new Prisma.Decimal(data.startTime) : null,
        endTime: data.endTime ? new Prisma.Decimal(data.endTime) : null,
        alternatives: data.alternatives ? JSON.parse(JSON.stringify(data.alternatives)) : null,
        metadata: data.metadata || null,
      },
    });

    return {
      ...result,
      provider: result.provider as 'google' | 'whisper',
      confidence: Number(result.confidence),
      startTime: result.startTime ? Number(result.startTime) : undefined,
      endTime: result.endTime ? Number(result.endTime) : undefined,
      alternatives: result.alternatives as any,
      metadata: result.metadata as any,
    };
  }

  async getTranscriptionsBySession(sessionId: string): Promise<TranscriptionResult[]> {
    const results = await this.prisma.transcriptionResult.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return results.map(result => ({
      ...result,
      provider: result.provider as 'google' | 'whisper',
      confidence: Number(result.confidence),
      startTime: result.startTime ? Number(result.startTime) : undefined,
      endTime: result.endTime ? Number(result.endTime) : undefined,
      alternatives: result.alternatives as any,
      metadata: result.metadata as any,
    }));
  }

  async getTranscriptionsByInteraction(interactionId: string): Promise<TranscriptionResult[]> {
    const results = await this.prisma.transcriptionResult.findMany({
      where: { interactionId },
      orderBy: { createdAt: 'asc' },
    });

    return results.map(result => ({
      ...result,
      provider: result.provider as 'google' | 'whisper',
      confidence: Number(result.confidence),
      startTime: result.startTime ? Number(result.startTime) : undefined,
      endTime: result.endTime ? Number(result.endTime) : undefined,
      alternatives: result.alternatives as any,
      metadata: result.metadata as any,
    }));
  }

  async updateTranscriptionResult(id: string, data: Partial<TranscriptionResult>): Promise<TranscriptionResult> {
    const updateData: any = { ...data };
    
    if (data.confidence !== undefined) {
      updateData.confidence = new Prisma.Decimal(data.confidence);
    }
    if (data.startTime !== undefined) {
      updateData.startTime = data.startTime ? new Prisma.Decimal(data.startTime) : null;
    }
    if (data.endTime !== undefined) {
      updateData.endTime = data.endTime ? new Prisma.Decimal(data.endTime) : null;
    }

    const result = await this.prisma.transcriptionResult.update({
      where: { id },
      data: updateData,
    });

    return {
      ...result,
      provider: result.provider as 'google' | 'whisper',
      confidence: Number(result.confidence),
      startTime: result.startTime ? Number(result.startTime) : undefined,
      endTime: result.endTime ? Number(result.endTime) : undefined,
      alternatives: result.alternatives as any,
      metadata: result.metadata as any,
    };
  }

  async deleteTranscriptionResult(id: string): Promise<void> {
    await this.prisma.transcriptionResult.delete({
      where: { id },
    });
  }

  async createAudioChunk(data: Omit<AudioChunk, 'id' | 'createdAt'>): Promise<AudioChunk> {
    const result = await this.prisma.audioChunk.create({
      data: {
        sessionId: data.sessionId,
        chunkIndex: data.chunkIndex,
        audioData: data.audioData,
        audioUrl: data.audioUrl,
        format: data.format,
        sampleRate: data.sampleRate,
        channels: data.channels,
        duration: data.duration ? new Prisma.Decimal(data.duration) : null,
        size: data.size,
        checksum: data.checksum,
        processedAt: data.processedAt,
      },
    });

    return {
      ...result,
      duration: result.duration ? Number(result.duration) : undefined,
    };
  }

  async getAudioChunk(id: string): Promise<AudioChunk | null> {
    const result = await this.prisma.audioChunk.findUnique({
      where: { id },
    });

    if (!result) return null;

    return {
      ...result,
      duration: result.duration ? Number(result.duration) : undefined,
    };
  }

  async getAudioChunksBySession(sessionId: string): Promise<AudioChunk[]> {
    const results = await this.prisma.audioChunk.findMany({
      where: { sessionId },
      orderBy: { chunkIndex: 'asc' },
    });

    return results.map(result => ({
      ...result,
      duration: result.duration ? Number(result.duration) : undefined,
    }));
  }

  async updateAudioChunk(id: string, data: Partial<AudioChunk>): Promise<AudioChunk> {
    const updateData: any = { ...data };
    
    if (data.duration !== undefined) {
      updateData.duration = data.duration ? new Prisma.Decimal(data.duration) : null;
    }

    const result = await this.prisma.audioChunk.update({
      where: { id },
      data: updateData,
    });

    return {
      ...result,
      duration: result.duration ? Number(result.duration) : undefined,
    };
  }

  async deleteAudioChunk(id: string): Promise<void> {
    await this.prisma.audioChunk.delete({
      where: { id },
    });
  }

  async cleanupOldAudioChunks(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.audioChunk.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        processedAt: {
          not: null,
        },
      },
    });

    return result.count;
  }

  async getTranscriptionStats(sessionId: string): Promise<{
    totalTranscriptions: number;
    averageConfidence: number;
    providerBreakdown: Record<string, number>;
    finalTranscriptions: number;
  }> {
    const stats = await this.prisma.transcriptionResult.aggregate({
      where: { sessionId },
      _count: { id: true },
      _avg: { confidence: true },
    });

    const providerStats = await this.prisma.transcriptionResult.groupBy({
      by: ['provider'],
      where: { sessionId },
      _count: { provider: true },
    });

    const finalCount = await this.prisma.transcriptionResult.count({
      where: { sessionId, isFinal: true },
    });

    const providerBreakdown = providerStats.reduce((acc, stat) => {
      acc[stat.provider] = stat._count.provider;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTranscriptions: stats._count.id,
      averageConfidence: Number(stats._avg.confidence) || 0,
      providerBreakdown,
      finalTranscriptions: finalCount,
    };
  }
}