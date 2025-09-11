import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.config';
import { 
  PerformanceMetrics, 
  AccuracyMetrics, 
  UserSatisfactionMetrics,
  UsageAnalytics 
} from '../interfaces/monitoring.interface';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private prisma: DatabaseService) {}

  async recordPerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      await this.prisma.performanceMetrics.create({
        data: {
          sessionId: metrics.sessionId,
          userId: metrics.userId,
          transcriptionLatency: metrics.transcriptionLatency,
          responseGenerationLatency: metrics.responseGenerationLatency,
          totalLatency: metrics.totalLatency,
          timestamp: metrics.timestamp,
        },
      });

      // Log performance issues
      if (metrics.totalLatency > 2000) {
        this.logger.warn(`High latency detected: ${metrics.totalLatency}ms for session ${metrics.sessionId}`);
      }
    } catch (error) {
      this.logger.error('Failed to record performance metrics', error);
    }
  }

  async recordAccuracyMetrics(metrics: AccuracyMetrics): Promise<void> {
    try {
      await this.prisma.accuracyMetrics.create({
        data: {
          transcriptionId: metrics.transcriptionId,
          wordErrorRate: metrics.wordErrorRate,
          confidenceScore: metrics.confidenceScore,
          actualText: metrics.actualText,
          transcribedText: metrics.transcribedText,
          timestamp: metrics.timestamp,
        },
      });

      // Log accuracy issues
      if (metrics.wordErrorRate > 0.05) { // > 5% error rate
        this.logger.warn(`High WER detected: ${metrics.wordErrorRate} for transcription ${metrics.transcriptionId}`);
      }
    } catch (error) {
      this.logger.error('Failed to record accuracy metrics', error);
    }
  }

  async recordUserSatisfaction(metrics: UserSatisfactionMetrics): Promise<void> {
    try {
      await this.prisma.userSatisfactionMetrics.create({
        data: {
          sessionId: metrics.sessionId,
          userId: metrics.userId,
          rating: metrics.rating,
          feedback: metrics.feedback,
          featureUsed: metrics.featureUsed,
          timestamp: metrics.timestamp,
        },
      });
    } catch (error) {
      this.logger.error('Failed to record user satisfaction metrics', error);
    }
  }

  async recordUsageAnalytics(analytics: UsageAnalytics): Promise<void> {
    try {
      await this.prisma.usageAnalytics.create({
        data: {
          userId: analytics.userId,
          sessionId: analytics.sessionId,
          feature: analytics.feature,
          action: analytics.action,
          duration: analytics.duration,
          metadata: analytics.metadata,
          timestamp: analytics.timestamp,
        },
      });
    } catch (error) {
      this.logger.error('Failed to record usage analytics', error);
    }
  }

  async getPerformanceMetrics(timeRange: { start: Date; end: Date }) {
    return this.prisma.performanceMetrics.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getAccuracyMetrics(timeRange: { start: Date; end: Date }) {
    return this.prisma.accuracyMetrics.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async calculateWER(actualText: string, transcribedText: string): Promise<number> {
    const actualWords = actualText.toLowerCase().split(/\s+/);
    const transcribedWords = transcribedText.toLowerCase().split(/\s+/);
    
    // Simple Levenshtein distance calculation for WER
    const matrix = Array(actualWords.length + 1)
      .fill(null)
      .map(() => Array(transcribedWords.length + 1).fill(null));

    for (let i = 0; i <= actualWords.length; i++) {
      matrix[i][0] = i;
    }

    for (let j = 0; j <= transcribedWords.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= actualWords.length; i++) {
      for (let j = 1; j <= transcribedWords.length; j++) {
        if (actualWords[i - 1] === transcribedWords[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,     // deletion
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }

    const editDistance = matrix[actualWords.length][transcribedWords.length];
    return actualWords.length > 0 ? editDistance / actualWords.length : 0;
  }
}