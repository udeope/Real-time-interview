import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertThreshold, SystemHealthMetrics } from '../interfaces/monitoring.interface';

@Injectable()
export class SystemHealthService {
  private readonly logger = new Logger(SystemHealthService.name);
  private alertThresholds: AlertThreshold[] = [
    {
      metric: 'cpuUsage',
      threshold: 80,
      operator: 'gt',
      severity: 'high',
      enabled: true,
    },
    {
      metric: 'memoryUsage',
      threshold: 85,
      operator: 'gt',
      severity: 'high',
      enabled: true,
    },
    {
      metric: 'errorRate',
      threshold: 5,
      operator: 'gt',
      severity: 'medium',
      enabled: true,
    },
    {
      metric: 'totalLatency',
      threshold: 2000,
      operator: 'gt',
      severity: 'medium',
      enabled: true,
    },
    {
      metric: 'activeConnections',
      threshold: 1000,
      operator: 'gt',
      severity: 'low',
      enabled: true,
    },
  ];

  private healthHistory: SystemHealthMetrics[] = [];
  private readonly maxHistorySize = 1440; // 24 hours of minute-by-minute data

  async checkSystemHealth(): Promise<{ status: string; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Check database connectivity
      await this.checkDatabaseHealth();
    } catch (error) {
      issues.push('Database connectivity issue');
      this.logger.error('Database health check failed', error);
    }

    try {
      // Check Redis connectivity
      await this.checkRedisHealth();
    } catch (error) {
      issues.push('Redis connectivity issue');
      this.logger.error('Redis health check failed', error);
    }

    try {
      // Check external API health
      await this.checkExternalAPIs();
    } catch (error) {
      issues.push('External API connectivity issue');
      this.logger.error('External API health check failed', error);
    }

    const status = issues.length === 0 ? 'healthy' : 'degraded';
    
    if (issues.length > 0) {
      this.logger.warn(`System health issues detected: ${issues.join(', ')}`);
    }

    return { status, issues };
  }

  private async checkDatabaseHealth(): Promise<void> {
    // This would typically use your database service
    // For now, we'll simulate a health check
    const startTime = Date.now();
    
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const responseTime = Date.now() - startTime;
    
    if (responseTime > 1000) {
      throw new Error(`Database response time too high: ${responseTime}ms`);
    }
  }

  private async checkRedisHealth(): Promise<void> {
    // This would typically use your Redis service
    const startTime = Date.now();
    
    // Simulate Redis ping
    await new Promise(resolve => setTimeout(resolve, 5));
    
    const responseTime = Date.now() - startTime;
    
    if (responseTime > 500) {
      throw new Error(`Redis response time too high: ${responseTime}ms`);
    }
  }

  private async checkExternalAPIs(): Promise<void> {
    const apis = [
      { name: 'OpenAI', url: 'https://api.openai.com/v1/models' },
      { name: 'Google Speech-to-Text', url: 'https://speech.googleapis.com' },
    ];

    for (const api of apis) {
      try {
        const startTime = Date.now();
        
        // In a real implementation, you'd make actual HTTP requests
        // For now, we'll simulate API checks
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const responseTime = Date.now() - startTime;
        
        if (responseTime > 5000) {
          throw new Error(`${api.name} response time too high: ${responseTime}ms`);
        }
      } catch (error) {
        throw new Error(`${api.name} health check failed: ${error.message}`);
      }
    }
  }

  async recordHealthMetrics(metrics: SystemHealthMetrics): Promise<void> {
    // Add to history
    this.healthHistory.push(metrics);
    
    // Keep only recent history
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }

    // Check against thresholds
    await this.checkAlertThresholds(metrics);
  }

  private async checkAlertThresholds(metrics: SystemHealthMetrics): Promise<void> {
    const triggeredAlerts = [];

    for (const threshold of this.alertThresholds) {
      if (!threshold.enabled) continue;

      const metricValue = metrics[threshold.metric as keyof SystemHealthMetrics] as number;
      
      if (this.shouldTriggerAlert(metricValue, threshold)) {
        triggeredAlerts.push({
          metric: threshold.metric,
          value: metricValue,
          threshold: threshold.threshold,
          severity: threshold.severity,
        });
      }
    }

    if (triggeredAlerts.length > 0) {
      await this.sendAlerts(triggeredAlerts);
    }
  }

  private shouldTriggerAlert(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt':
        return value > threshold.threshold;
      case 'lt':
        return value < threshold.threshold;
      case 'eq':
        return value === threshold.threshold;
      default:
        return false;
    }
  }

  private async sendAlerts(alerts: any[]): Promise<void> {
    // Log alerts
    this.logger.warn('System alerts triggered:', alerts);

    // In a real implementation, you would:
    // 1. Send to Slack/Discord webhook
    // 2. Send to PagerDuty
    // 3. Send email notifications
    // 4. Create incidents in monitoring systems

    for (const alert of alerts) {
      if (alert.severity === 'critical') {
        // Send immediate notification
        this.logger.error(`CRITICAL ALERT: ${alert.metric} = ${alert.value} (threshold: ${alert.threshold})`);
      }
    }
  }

  getHealthHistory(hours = 1): SystemHealthMetrics[] {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    return this.healthHistory.filter(metric => metric.timestamp >= cutoffTime);
  }

  getAverageMetrics(hours = 1): Partial<SystemHealthMetrics> {
    const history = this.getHealthHistory(hours);
    
    if (history.length === 0) {
      return {};
    }

    const totals = history.reduce(
      (acc, metric) => ({
        cpuUsage: acc.cpuUsage + metric.cpuUsage,
        memoryUsage: acc.memoryUsage + metric.memoryUsage,
        activeConnections: acc.activeConnections + metric.activeConnections,
        queueSize: acc.queueSize + metric.queueSize,
        errorRate: acc.errorRate + metric.errorRate,
      }),
      { cpuUsage: 0, memoryUsage: 0, activeConnections: 0, queueSize: 0, errorRate: 0 }
    );

    const count = history.length;

    return {
      cpuUsage: totals.cpuUsage / count,
      memoryUsage: totals.memoryUsage / count,
      activeConnections: totals.activeConnections / count,
      queueSize: totals.queueSize / count,
      errorRate: totals.errorRate / count,
    };
  }

  updateAlertThreshold(metric: string, threshold: Partial<AlertThreshold>): void {
    const index = this.alertThresholds.findIndex(t => t.metric === metric);
    
    if (index !== -1) {
      this.alertThresholds[index] = { ...this.alertThresholds[index], ...threshold };
    } else {
      this.alertThresholds.push({
        metric,
        threshold: threshold.threshold || 0,
        operator: threshold.operator || 'gt',
        severity: threshold.severity || 'medium',
        enabled: threshold.enabled !== false,
      });
    }
  }

  getAlertThresholds(): AlertThreshold[] {
    return [...this.alertThresholds];
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async performHealthCheck(): Promise<void> {
    try {
      const healthStatus = await this.checkSystemHealth();
      
      if (healthStatus.status !== 'healthy') {
        this.logger.warn(`System health check failed: ${healthStatus.issues.join(', ')}`);
      }
    } catch (error) {
      this.logger.error('Health check failed', error);
    }
  }
}