import { Injectable, Logger } from '@nestjs/common';
import { AppError, ErrorType, ErrorSeverity } from '../errors/error-types';

export interface HealthMetrics {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  errorRate: number;
  averageResponseTime: number;
  lastCheck: Date;
  details?: Record<string, any>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthMetrics[];
  timestamp: Date;
}

export interface AlertRule {
  id: string;
  service: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: ErrorSeverity;
  enabled: boolean;
}

@Injectable()
export class HealthMonitoringService {
  private readonly logger = new Logger(HealthMonitoringService.name);
  private readonly metrics = new Map<string, HealthMetrics>();
  private readonly errorCounts = new Map<string, number>();
  private readonly responseTimes = new Map<string, number[]>();
  private readonly alertRules: AlertRule[] = [];
  private readonly alertHistory = new Map<string, Date>();

  constructor() {
    this.initializeDefaultAlerts();
    this.startHealthChecks();
  }

  private initializeDefaultAlerts(): void {
    const defaultAlerts: AlertRule[] = [
      {
        id: 'transcription-error-rate',
        service: 'transcription',
        metric: 'errorRate',
        threshold: 0.1, // 10%
        operator: 'gt',
        severity: ErrorSeverity.HIGH,
        enabled: true,
      },
      {
        id: 'llm-response-time',
        service: 'response-generation',
        metric: 'averageResponseTime',
        threshold: 5000, // 5 seconds
        operator: 'gt',
        severity: ErrorSeverity.MEDIUM,
        enabled: true,
      },
      {
        id: 'database-error-rate',
        service: 'database',
        metric: 'errorRate',
        threshold: 0.05, // 5%
        operator: 'gt',
        severity: ErrorSeverity.CRITICAL,
        enabled: true,
      },
      {
        id: 'websocket-error-rate',
        service: 'websocket',
        metric: 'errorRate',
        threshold: 0.15, // 15%
        operator: 'gt',
        severity: ErrorSeverity.HIGH,
        enabled: true,
      },
    ];

    this.alertRules.push(...defaultAlerts);
  }

  async recordError(error: AppError): Promise<void> {
    const service = error.context.service;
    const currentCount = this.errorCounts.get(service) || 0;
    this.errorCounts.set(service, currentCount + 1);

    // Update metrics
    await this.updateServiceMetrics(service);

    // Check for alerts
    await this.checkAlerts(service);

    // Log error for external monitoring systems
    this.logger.error('System error recorded', {
      type: error.type,
      severity: error.severity,
      service,
      operation: error.context.operation,
      userId: error.context.userId,
      sessionId: error.context.sessionId,
    });
  }

  async recordResponseTime(service: string, responseTime: number): Promise<void> {
    const times = this.responseTimes.get(service) || [];
    times.push(responseTime);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
    
    this.responseTimes.set(service, times);
    await this.updateServiceMetrics(service);
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const services: HealthMetrics[] = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [serviceName, metrics] of this.metrics) {
      services.push(metrics);
      
      if (metrics.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (metrics.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }

    return {
      overall: overallStatus,
      services,
      timestamp: new Date(),
    };
  }

  async getServiceHealth(serviceName: string): Promise<HealthMetrics | null> {
    return this.metrics.get(serviceName) || null;
  }

  private async updateServiceMetrics(serviceName: string): Promise<void> {
    const errorCount = this.errorCounts.get(serviceName) || 0;
    const responseTimes = this.responseTimes.get(serviceName) || [];
    
    // Calculate error rate (errors per minute)
    const errorRate = errorCount / 60; // Simplified calculation
    
    // Calculate average response time
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Determine service status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (errorRate > 0.2 || averageResponseTime > 10000) {
      status = 'unhealthy';
    } else if (errorRate > 0.1 || averageResponseTime > 5000) {
      status = 'degraded';
    }

    const metrics: HealthMetrics = {
      service: serviceName,
      status,
      uptime: this.calculateUptime(serviceName),
      errorRate,
      averageResponseTime,
      lastCheck: new Date(),
      details: {
        totalErrors: errorCount,
        responseTimeCount: responseTimes.length,
      },
    };

    this.metrics.set(serviceName, metrics);
  }

  private calculateUptime(serviceName: string): number {
    // Simplified uptime calculation
    // In a real implementation, this would track actual service start time
    return 99.9; // Percentage
  }

  private async checkAlerts(serviceName: string): Promise<void> {
    const metrics = this.metrics.get(serviceName);
    if (!metrics) return;

    for (const rule of this.alertRules) {
      if (!rule.enabled || rule.service !== serviceName) continue;

      const metricValue = metrics[rule.metric as keyof HealthMetrics] as number;
      if (typeof metricValue !== 'number') continue;

      let shouldAlert = false;
      switch (rule.operator) {
        case 'gt':
          shouldAlert = metricValue > rule.threshold;
          break;
        case 'lt':
          shouldAlert = metricValue < rule.threshold;
          break;
        case 'eq':
          shouldAlert = metricValue === rule.threshold;
          break;
      }

      if (shouldAlert) {
        await this.triggerAlert(rule, metricValue, metrics);
      }
    }
  }

  private async triggerAlert(
    rule: AlertRule,
    currentValue: number,
    metrics: HealthMetrics,
  ): Promise<void> {
    // Prevent alert spam - only alert once per 5 minutes for the same rule
    const lastAlert = this.alertHistory.get(rule.id);
    const now = new Date();
    
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < 300000) {
      return; // Skip alert
    }

    this.alertHistory.set(rule.id, now);

    const alertMessage = `Alert: ${rule.service} ${rule.metric} is ${currentValue} (threshold: ${rule.threshold})`;
    
    this.logger.error(alertMessage, {
      ruleId: rule.id,
      service: rule.service,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
      serviceStatus: metrics.status,
    });

    // In a real implementation, this would send notifications via email, Slack, etc.
    await this.sendAlert(rule, alertMessage, metrics);
  }

  private async sendAlert(
    rule: AlertRule,
    message: string,
    metrics: HealthMetrics,
  ): Promise<void> {
    // Placeholder for external alerting system integration
    // Could integrate with services like PagerDuty, Slack, email, etc.
    this.logger.warn(`ALERT: ${message}`);
  }

  private startHealthChecks(): void {
    // Run health checks every minute
    setInterval(async () => {
      await this.performHealthChecks();
    }, 60000);

    // Reset error counts every hour
    setInterval(() => {
      this.errorCounts.clear();
    }, 3600000);
  }

  private async performHealthChecks(): Promise<void> {
    const services = ['transcription', 'response-generation', 'database', 'redis', 'websocket'];
    
    for (const service of services) {
      try {
        await this.checkServiceHealth(service);
      } catch (error) {
        this.logger.error(`Health check failed for ${service}`, error);
      }
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<void> {
    // Placeholder for actual health checks
    // In a real implementation, this would ping each service
    const isHealthy = Math.random() > 0.05; // 95% healthy simulation
    
    if (!isHealthy) {
      const errorCount = this.errorCounts.get(serviceName) || 0;
      this.errorCounts.set(serviceName, errorCount + 1);
    }
    
    await this.updateServiceMetrics(serviceName);
  }

  // Public methods for managing alerts
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  removeAlertRule(ruleId: string): void {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.alertRules.splice(index, 1);
    }
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  enableAlert(ruleId: string): void {
    const rule = this.alertRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  disableAlert(ruleId: string): void {
    const rule = this.alertRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }
}