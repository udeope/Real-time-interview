import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from './metrics.service';
import { SystemHealthMetrics } from '../interfaces/monitoring.interface';
import * as os from 'os';

@Injectable()
export class PerformanceMonitoringService {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private activeConnections = 0;
  private queueSize = 0;
  private errorCount = 0;
  private requestCount = 0;

  constructor(private metricsService: MetricsService) {}

  // Track latency for different operations
  async trackLatency<T>(
    operation: string,
    sessionId: string,
    userId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const latency = Date.now() - startTime;
      
      // Record specific operation latency
      await this.recordOperationLatency(operation, latency, sessionId, userId);
      
      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.errorCount++;
      
      this.logger.error(`Operation ${operation} failed after ${latency}ms`, error);
      throw error;
    }
  }

  private async recordOperationLatency(
    operation: string,
    latency: number,
    sessionId: string,
    userId: string
  ): Promise<void> {
    // Record in appropriate metrics based on operation type
    if (operation === 'transcription') {
      await this.metricsService.recordPerformanceMetrics({
        transcriptionLatency: latency,
        responseGenerationLatency: 0,
        totalLatency: latency,
        timestamp: new Date(),
        sessionId,
        userId,
      });
    } else if (operation === 'response-generation') {
      await this.metricsService.recordPerformanceMetrics({
        transcriptionLatency: 0,
        responseGenerationLatency: latency,
        totalLatency: latency,
        timestamp: new Date(),
        sessionId,
        userId,
      });
    }

    // Log performance warnings
    if (latency > 2000) {
      this.logger.warn(`High latency in ${operation}: ${latency}ms`);
    }
  }

  // System health monitoring
  @Cron(CronExpression.EVERY_MINUTE)
  async collectSystemMetrics(): Promise<void> {
    try {
      const cpuUsage = await this.getCpuUsage();
      const memoryUsage = this.getMemoryUsage();
      const errorRate = this.calculateErrorRate();

      const healthMetrics: SystemHealthMetrics = {
        cpuUsage,
        memoryUsage,
        activeConnections: this.activeConnections,
        queueSize: this.queueSize,
        errorRate,
        timestamp: new Date(),
      };

      await this.recordSystemHealth(healthMetrics);
      
      // Reset counters
      this.errorCount = 0;
      this.requestCount = 0;
    } catch (error) {
      this.logger.error('Failed to collect system metrics', error);
    }
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const percentage = (totalUsage / 1000000) / 1000 * 100; // Convert to percentage
        resolve(Math.min(percentage, 100));
      }, 100);
    });
  }

  private getMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    return (memUsage.rss / totalMemory) * 100;
  }

  private calculateErrorRate(): number {
    if (this.requestCount === 0) return 0;
    return (this.errorCount / this.requestCount) * 100;
  }

  private async recordSystemHealth(metrics: SystemHealthMetrics): Promise<void> {
    // This would typically go to a time-series database like InfluxDB
    // For now, we'll log it and could store in PostgreSQL
    this.logger.log(`System Health - CPU: ${metrics.cpuUsage.toFixed(2)}%, Memory: ${metrics.memoryUsage.toFixed(2)}%, Connections: ${metrics.activeConnections}, Error Rate: ${metrics.errorRate.toFixed(2)}%`);
    
    // Check thresholds and alert if necessary
    await this.checkAlertThresholds(metrics);
  }

  private async checkAlertThresholds(metrics: SystemHealthMetrics): Promise<void> {
    const alerts = [];

    if (metrics.cpuUsage > 80) {
      alerts.push({ metric: 'CPU', value: metrics.cpuUsage, severity: 'high' });
    }

    if (metrics.memoryUsage > 85) {
      alerts.push({ metric: 'Memory', value: metrics.memoryUsage, severity: 'high' });
    }

    if (metrics.errorRate > 5) {
      alerts.push({ metric: 'Error Rate', value: metrics.errorRate, severity: 'medium' });
    }

    if (alerts.length > 0) {
      this.logger.warn('System alerts triggered:', alerts);
      // Here you would integrate with alerting systems like PagerDuty, Slack, etc.
    }
  }

  // Connection tracking methods
  incrementConnections(): void {
    this.activeConnections++;
  }

  decrementConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  setQueueSize(size: number): void {
    this.queueSize = size;
  }

  incrementRequests(): void {
    this.requestCount++;
  }

  incrementErrors(): void {
    this.errorCount++;
  }
}