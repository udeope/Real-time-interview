import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricsService } from './services/metrics.service';
import { AnalyticsService } from './services/analytics.service';
import { PerformanceMonitoringService } from './services/performance-monitoring.service';
import { UserSatisfactionService } from './services/user-satisfaction.service';
import { SystemHealthService } from './services/system-health.service';

@Controller('monitoring')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(
    private metricsService: MetricsService,
    private analyticsService: AnalyticsService,
    private performanceService: PerformanceMonitoringService,
    private satisfactionService: UserSatisfactionService,
    private healthService: SystemHealthService,
  ) {}

  @Get('health')
  async getSystemHealth() {
    return this.healthService.checkSystemHealth();
  }

  @Get('health/history')
  async getHealthHistory(@Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 1;
    return this.healthService.getHealthHistory(hoursNum);
  }

  @Get('health/averages')
  async getHealthAverages(@Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 1;
    return this.healthService.getAverageMetrics(hoursNum);
  }

  @Get('performance')
  async getPerformanceMetrics(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const timeRange = {
      start: start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    return this.metricsService.getPerformanceMetrics(timeRange);
  }

  @Get('accuracy')
  async getAccuracyMetrics(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const timeRange = {
      start: start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    return this.metricsService.getAccuracyMetrics(timeRange);
  }

  @Get('satisfaction')
  async getSatisfactionMetrics(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const timeRange = {
      start: start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    return this.satisfactionService.getSatisfactionMetrics(timeRange);
  }

  @Get('satisfaction/nps')
  async getNPSScore(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const timeRange = {
      start: start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    return this.satisfactionService.getNPSScore(timeRange);
  }

  @Get('satisfaction/trends')
  async getSatisfactionTrends(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.satisfactionService.getSatisfactionTrends(daysNum);
  }

  @Get('satisfaction/alerts')
  async getLowSatisfactionAlerts(
    @Query('threshold') threshold?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const timeRange = {
      start: start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    const thresholdNum = threshold ? parseInt(threshold, 10) : 2;
    return this.satisfactionService.getLowSatisfactionAlerts(thresholdNum, timeRange);
  }

  @Get('analytics/features')
  async getFeatureAdoption(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const timeRange = {
      start: start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    return this.analyticsService.getFeatureAdoptionMetrics(timeRange);
  }

  @Get('analytics/engagement')
  async getUserEngagement(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const timeRange = {
      start: start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    return this.analyticsService.getUserEngagementMetrics(timeRange);
  }

  @Get('analytics/conversion')
  async getConversionMetrics(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const timeRange = {
      start: start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    return this.analyticsService.getConversionMetrics(timeRange);
  }

  @Get('analytics/bi-report')
  async getBusinessIntelligenceReport(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const timeRange = {
      start: start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    return this.analyticsService.generateBusinessIntelligenceReport(timeRange);
  }

  @Get('analytics/top-features')
  async getTopFeatures(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    const timeRange = {
      start: start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getTopFeatures(timeRange, limitNum);
  }

  @Post('feedback')
  async recordFeedback(
    @Body() body: {
      sessionId: string;
      userId: string;
      rating: number;
      featureUsed: string;
      feedback?: string;
    },
  ) {
    await this.satisfactionService.recordFeedback(
      body.sessionId,
      body.userId,
      body.rating,
      body.featureUsed,
      body.feedback,
    );

    return { success: true };
  }

  @Post('track-usage')
  async trackUsage(
    @Body() body: {
      userId: string;
      sessionId: string;
      feature: string;
      action: string;
      metadata?: Record<string, any>;
    },
  ) {
    await this.analyticsService.trackFeatureUsage(
      body.userId,
      body.sessionId,
      body.feature,
      body.action,
      body.metadata,
    );

    return { success: true };
  }

  @Get('alerts/thresholds')
  async getAlertThresholds() {
    return this.healthService.getAlertThresholds();
  }

  @Post('alerts/thresholds')
  async updateAlertThreshold(
    @Body() body: {
      metric: string;
      threshold?: number;
      operator?: 'gt' | 'lt' | 'eq';
      severity?: 'low' | 'medium' | 'high' | 'critical';
      enabled?: boolean;
    },
  ) {
    this.healthService.updateAlertThreshold(body.metric, body);
    return { success: true };
  }
}