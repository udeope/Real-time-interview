import { Injectable, Logger } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { AnalyticsService } from './analytics.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { UserSatisfactionService } from './user-satisfaction.service';

@Injectable()
export class MonitoringIntegrationService {
  private readonly logger = new Logger(MonitoringIntegrationService.name);

  constructor(
    private metricsService: MetricsService,
    private analyticsService: AnalyticsService,
    private performanceService: PerformanceMonitoringService,
    private satisfactionService: UserSatisfactionService,
  ) {}

  // Performance monitoring wrapper
  async trackOperation<T>(
    operation: string,
    sessionId: string,
    userId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.performanceService.trackLatency(operation, sessionId, userId, fn);
  }

  // Record transcription metrics
  async recordTranscriptionMetrics(
    sessionId: string,
    userId: string,
    latency: number,
    accuracy?: number,
    confidence?: number
  ): Promise<void> {
    try {
      // Record performance metrics
      await this.metricsService.recordPerformanceMetrics({
        sessionId,
        userId,
        transcriptionLatency: latency,
        responseGenerationLatency: 0,
        totalLatency: latency,
        timestamp: new Date(),
      });

      // Record accuracy metrics if available
      if (accuracy !== undefined && confidence !== undefined) {
        await this.metricsService.recordAccuracyMetrics({
          transcriptionId: `${sessionId}-${Date.now()}`,
          wordErrorRate: 1 - accuracy, // Convert accuracy to error rate
          confidenceScore: confidence,
          transcribedText: '', // Would be filled by actual implementation
          timestamp: new Date(),
        });
      }

      // Track feature usage
      await this.analyticsService.trackFeatureUsage(
        userId,
        sessionId,
        'transcription',
        'process',
        { latency, accuracy, confidence }
      );
    } catch (error) {
      this.logger.error('Failed to record transcription metrics', error);
    }
  }

  // Record response generation metrics
  async recordResponseGenerationMetrics(
    sessionId: string,
    userId: string,
    latency: number,
    responseCount: number,
    quality?: number
  ): Promise<void> {
    try {
      // Record performance metrics
      await this.metricsService.recordPerformanceMetrics({
        sessionId,
        userId,
        transcriptionLatency: 0,
        responseGenerationLatency: latency,
        totalLatency: latency,
        timestamp: new Date(),
      });

      // Track feature usage
      await this.analyticsService.trackFeatureUsage(
        userId,
        sessionId,
        'response-generation',
        'generate',
        { latency, responseCount, quality }
      );
    } catch (error) {
      this.logger.error('Failed to record response generation metrics', error);
    }
  }

  // Record user interaction
  async recordUserInteraction(
    userId: string,
    sessionId: string,
    feature: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.analyticsService.trackFeatureUsage(
        userId,
        sessionId,
        feature,
        action,
        metadata
      );
    } catch (error) {
      this.logger.error('Failed to record user interaction', error);
    }
  }

  // Record user feedback
  async recordUserFeedback(
    sessionId: string,
    userId: string,
    rating: number,
    feature: string,
    feedback?: string
  ): Promise<void> {
    try {
      await this.satisfactionService.recordFeedback(
        sessionId,
        userId,
        rating,
        feature,
        feedback
      );
    } catch (error) {
      this.logger.error('Failed to record user feedback', error);
    }
  }

  // Record session start
  async recordSessionStart(sessionId: string, userId: string): Promise<void> {
    try {
      await this.analyticsService.trackFeatureUsage(
        userId,
        sessionId,
        'session',
        'start'
      );
    } catch (error) {
      this.logger.error('Failed to record session start', error);
    }
  }

  // Record session end
  async recordSessionEnd(
    sessionId: string,
    userId: string,
    duration: number
  ): Promise<void> {
    try {
      await this.analyticsService.trackSessionDuration(sessionId, userId, duration);
      
      await this.analyticsService.trackFeatureUsage(
        userId,
        sessionId,
        'session',
        'end',
        { duration }
      );
    } catch (error) {
      this.logger.error('Failed to record session end', error);
    }
  }

  // Record error occurrence
  async recordError(
    userId: string,
    sessionId: string,
    errorType: string,
    errorMessage: string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      await this.analyticsService.trackFeatureUsage(
        userId,
        sessionId,
        'error',
        errorType,
        { errorMessage, context }
      );
    } catch (error) {
      this.logger.error('Failed to record error occurrence', error);
    }
  }

  // Record practice session metrics
  async recordPracticeMetrics(
    userId: string,
    sessionId: string,
    questionsAnswered: number,
    averageScore: number,
    duration: number
  ): Promise<void> {
    try {
      await this.analyticsService.trackFeatureUsage(
        userId,
        sessionId,
        'practice',
        'complete',
        { questionsAnswered, averageScore, duration }
      );
    } catch (error) {
      this.logger.error('Failed to record practice metrics', error);
    }
  }

  // Record integration usage
  async recordIntegrationUsage(
    userId: string,
    integrationType: string,
    action: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.analyticsService.trackFeatureUsage(
        userId,
        'integration-session',
        `integration-${integrationType}`,
        action,
        { success, ...metadata }
      );
    } catch (error) {
      this.logger.error('Failed to record integration usage', error);
    }
  }
}