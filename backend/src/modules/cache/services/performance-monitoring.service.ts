import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../config/redis.config';
import { PerformanceMetrics } from '../interfaces/cache.interface';
import { DatabaseService } from '../../../config/database.config';

interface SystemMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  redisMemory: number;
  activeConnections: number;
  requestsPerSecond: number;
  averageLatency: number;
  errorRate: number;
}

interface EndpointMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  averageLatency: number;
  errorCount: number;
  lastAccessed: Date;
  p95Latency: number;
  p99Latency: number;
}

@Injectable()
export class PerformanceMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private readonly metricsBuffer: PerformanceMetrics[] = [];
  private readonly systemMetricsBuffer: SystemMetrics[] = [];
  private readonly endpointMetrics = new Map<string, EndpointMetrics>();
  private readonly enabled: boolean;
  private metricsInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly prisma: DatabaseService,
  ) {
    this.enabled = this.configService.get<boolean>('PERFORMANCE_MONITORING_ENABLED', true);
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Performance monitoring is disabled');
      return;
    }

    // Start collecting system metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Cleanup old metrics every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);

    this.logger.log('Performance monitoring service initialized');
  }

  /**
   * Record cache operation metrics
   */
  recordCacheMetrics(metrics: PerformanceMetrics): void {
    if (!this.enabled) return;

    this.metricsBuffer.push(metrics);

    // Keep buffer size manageable
    if (this.metricsBuffer.length > 10000) {
      this.metricsBuffer.splice(0, 5000);
    }
  }

  /**
   * Record API endpoint metrics
   */
  recordEndpointMetrics(
    endpoint: string,
    method: string,
    latency: number,
    isError: boolean = false
  ): void {
    if (!this.enabled) return;

    const key = `${method}:${endpoint}`;
    const existing = this.endpointMetrics.get(key);

    if (existing) {
      existing.totalRequests += 1;
      existing.averageLatency = (existing.averageLatency * (existing.totalRequests - 1) + latency) / existing.totalRequests;
      existing.lastAccessed = new Date();
      
      if (isError) {
        existing.errorCount += 1;
      }

      // Update percentiles (simplified calculation)
      existing.p95Latency = Math.max(existing.p95Latency, latency * 0.95);
      existing.p99Latency = Math.max(existing.p99Latency, latency * 0.99);
    } else {
      this.endpointMetrics.set(key, {
        endpoint,
        method,
        totalRequests: 1,
        averageLatency: latency,
        errorCount: isError ? 1 : 0,
        lastAccessed: new Date(),
        p95Latency: latency,
        p99Latency: latency,
      });
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    cache: {
      hitRate: number;
      averageLatency: number;
      operationsPerSecond: number;
      topOperations: Array<{ operation: string; count: number; avgLatency: number }>;
    };
    system: {
      current: SystemMetrics;
      trend: SystemMetrics[];
    };
    endpoints: {
      slowest: EndpointMetrics[];
      mostUsed: EndpointMetrics[];
      highestError: EndpointMetrics[];
    };
    database: {
      connectionPoolSize: number;
      activeConnections: number;
      averageQueryTime: number;
      slowQueries: Array<{ query: string; avgTime: number; count: number }>;
    };
  }> {
    const cacheMetrics = this.calculateCacheMetrics();
    const systemMetrics = this.getSystemMetrics();
    const endpointMetrics = this.getEndpointMetrics();
    const databaseMetrics = await this.getDatabaseMetrics();

    return {
      cache: cacheMetrics,
      system: systemMetrics,
      endpoints: endpointMetrics,
      database: databaseMetrics,
    };
  }

  /**
   * Get cache performance statistics
   */
  private calculateCacheMetrics() {
    const recentMetrics = this.metricsBuffer.slice(-1000); // Last 1000 operations
    
    if (recentMetrics.length === 0) {
      return {
        hitRate: 0,
        averageLatency: 0,
        operationsPerSecond: 0,
        topOperations: [],
      };
    }

    const hits = recentMetrics.filter(m => m.cacheHit).length;
    const gets = recentMetrics.filter(m => m.operationType === 'get').length;
    const hitRate = gets > 0 ? (hits / gets) * 100 : 0;

    const totalLatency = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageLatency = totalLatency / recentMetrics.length;

    // Calculate operations per second (based on last minute)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentOps = recentMetrics.filter(m => m.timestamp > oneMinuteAgo);
    const operationsPerSecond = recentOps.length / 60;

    // Top operations by frequency
    const operationCounts = new Map<string, { count: number; totalLatency: number }>();
    
    for (const metric of recentMetrics) {
      const key = `${metric.operationType}:${metric.keyPattern}`;
      const existing = operationCounts.get(key);
      
      if (existing) {
        existing.count += 1;
        existing.totalLatency += metric.duration;
      } else {
        operationCounts.set(key, { count: 1, totalLatency: metric.duration });
      }
    }

    const topOperations = Array.from(operationCounts.entries())
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        avgLatency: stats.totalLatency / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      hitRate: Math.round(hitRate * 100) / 100,
      averageLatency: Math.round(averageLatency * 100) / 100,
      operationsPerSecond: Math.round(operationsPerSecond * 100) / 100,
      topOperations,
    };
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      
      // Get Redis memory usage
      const redisInfo = await redis.info('memory');
      const memoryMatch = redisInfo.match(/used_memory:(\d+)/);
      const redisMemory = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;

      // Get Redis connection count
      const clientInfo = await redis.info('clients');
      const clientMatch = clientInfo.match(/connected_clients:(\d+)/);
      const activeConnections = clientMatch ? parseInt(clientMatch[1], 10) : 0;

      // Calculate requests per second from recent metrics
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const recentRequests = this.metricsBuffer.filter(m => m.timestamp > oneMinuteAgo);
      const requestsPerSecond = recentRequests.length / 60;

      // Calculate average latency
      const averageLatency = recentRequests.length > 0
        ? recentRequests.reduce((sum, m) => sum + m.duration, 0) / recentRequests.length
        : 0;

      // Calculate error rate
      const errors = recentRequests.filter(m => m.metadata?.error).length;
      const errorRate = recentRequests.length > 0 ? (errors / recentRequests.length) * 100 : 0;

      const systemMetric: SystemMetrics = {
        timestamp: new Date(),
        cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
        memoryUsage: process.memoryUsage().heapUsed,
        redisMemory,
        activeConnections,
        requestsPerSecond,
        averageLatency,
        errorRate,
      };

      this.systemMetricsBuffer.push(systemMetric);

      // Keep only last 24 hours of system metrics (assuming 30-second intervals)
      if (this.systemMetricsBuffer.length > 2880) {
        this.systemMetricsBuffer.splice(0, 1440); // Remove oldest half
      }

      // Store metrics in Redis for persistence
      await redis.setex(
        'metrics:system:latest',
        300, // 5 minutes TTL
        JSON.stringify(systemMetric)
      );

    } catch (error) {
      this.logger.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics() {
    const current = this.systemMetricsBuffer[this.systemMetricsBuffer.length - 1] || {
      timestamp: new Date(),
      cpuUsage: 0,
      memoryUsage: 0,
      redisMemory: 0,
      activeConnections: 0,
      requestsPerSecond: 0,
      averageLatency: 0,
      errorRate: 0,
    };

    // Get trend data (last 24 data points)
    const trend = this.systemMetricsBuffer.slice(-24);

    return { current, trend };
  }

  /**
   * Get endpoint metrics
   */
  private getEndpointMetrics() {
    const allEndpoints = Array.from(this.endpointMetrics.values());

    const slowest = [...allEndpoints]
      .sort((a, b) => b.averageLatency - a.averageLatency)
      .slice(0, 10);

    const mostUsed = [...allEndpoints]
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 10);

    const highestError = [...allEndpoints]
      .filter(e => e.errorCount > 0)
      .sort((a, b) => (b.errorCount / b.totalRequests) - (a.errorCount / a.totalRequests))
      .slice(0, 10);

    return { slowest, mostUsed, highestError };
  }

  /**
   * Get database performance metrics
   */
  private async getDatabaseMetrics() {
    try {
      // This would typically integrate with Prisma metrics or database monitoring
      // For now, return mock data structure
      return {
        connectionPoolSize: 10,
        activeConnections: 5,
        averageQueryTime: 25.5,
        slowQueries: [
          { query: 'SELECT * FROM users WHERE...', avgTime: 150.2, count: 45 },
          { query: 'SELECT * FROM interview_sessions...', avgTime: 89.7, count: 123 },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting database metrics:', error);
      return {
        connectionPoolSize: 0,
        activeConnections: 0,
        averageQueryTime: 0,
        slowQueries: [],
      };
    }
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(): Promise<Array<{
    type: 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: Date;
  }>> {
    const alerts = [];
    const metrics = await this.getPerformanceMetrics();

    // Cache hit rate alert
    if (metrics.cache.hitRate < 80) {
      alerts.push({
        type: metrics.cache.hitRate < 60 ? 'critical' : 'warning',
        message: 'Cache hit rate is below optimal threshold',
        metric: 'cache_hit_rate',
        value: metrics.cache.hitRate,
        threshold: 80,
        timestamp: new Date(),
      });
    }

    // Average latency alert
    if (metrics.cache.averageLatency > 100) {
      alerts.push({
        type: metrics.cache.averageLatency > 200 ? 'critical' : 'warning',
        message: 'Cache operation latency is high',
        metric: 'cache_latency',
        value: metrics.cache.averageLatency,
        threshold: 100,
        timestamp: new Date(),
      });
    }

    // Memory usage alert
    const memoryUsageMB = metrics.system.current.memoryUsage / (1024 * 1024);
    if (memoryUsageMB > 512) {
      alerts.push({
        type: memoryUsageMB > 1024 ? 'critical' : 'warning',
        message: 'High memory usage detected',
        metric: 'memory_usage',
        value: memoryUsageMB,
        threshold: 512,
        timestamp: new Date(),
      });
    }

    // Error rate alert
    if (metrics.system.current.errorRate > 5) {
      alerts.push({
        type: metrics.system.current.errorRate > 10 ? 'critical' : 'warning',
        message: 'High error rate detected',
        metric: 'error_rate',
        value: metrics.system.current.errorRate,
        threshold: 5,
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  /**
   * Export metrics for external monitoring systems
   */
  async exportMetrics(format: 'prometheus' | 'json' = 'json'): Promise<string> {
    const metrics = await this.getPerformanceMetrics();

    if (format === 'prometheus') {
      return this.formatPrometheusMetrics(metrics);
    }

    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    // Clean up cache metrics buffer
    const validCacheMetrics = this.metricsBuffer.filter(m => m.timestamp > oneHourAgo);
    this.metricsBuffer.splice(0, this.metricsBuffer.length, ...validCacheMetrics);

    // Clean up endpoint metrics (remove unused endpoints)
    const oneDayAgo = new Date(Date.now() - 86400000);
    for (const [key, metrics] of this.endpointMetrics.entries()) {
      if (metrics.lastAccessed < oneDayAgo && metrics.totalRequests < 10) {
        this.endpointMetrics.delete(key);
      }
    }

    this.logger.debug('Cleaned up old performance metrics');
  }

  /**
   * Format metrics for Prometheus
   */
  private formatPrometheusMetrics(metrics: any): string {
    const lines = [];
    
    // Cache metrics
    lines.push(`# HELP cache_hit_rate Cache hit rate percentage`);
    lines.push(`# TYPE cache_hit_rate gauge`);
    lines.push(`cache_hit_rate ${metrics.cache.hitRate}`);
    
    lines.push(`# HELP cache_average_latency Average cache operation latency in milliseconds`);
    lines.push(`# TYPE cache_average_latency gauge`);
    lines.push(`cache_average_latency ${metrics.cache.averageLatency}`);
    
    lines.push(`# HELP cache_operations_per_second Cache operations per second`);
    lines.push(`# TYPE cache_operations_per_second gauge`);
    lines.push(`cache_operations_per_second ${metrics.cache.operationsPerSecond}`);

    // System metrics
    lines.push(`# HELP system_memory_usage Memory usage in bytes`);
    lines.push(`# TYPE system_memory_usage gauge`);
    lines.push(`system_memory_usage ${metrics.system.current.memoryUsage}`);
    
    lines.push(`# HELP system_redis_memory Redis memory usage in bytes`);
    lines.push(`# TYPE system_redis_memory gauge`);
    lines.push(`system_redis_memory ${metrics.system.current.redisMemory}`);
    
    lines.push(`# HELP system_error_rate Error rate percentage`);
    lines.push(`# TYPE system_error_rate gauge`);
    lines.push(`system_error_rate ${metrics.system.current.errorRate}`);

    return lines.join('\n');
  }
}