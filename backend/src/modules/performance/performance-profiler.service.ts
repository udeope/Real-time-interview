import { Injectable, Logger } from '@nestjs/common';
import { performance, PerformanceObserver } from 'perf_hooks';
import { EventEmitter } from 'events';

interface PerformanceProfile {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after?: NodeJS.MemoryUsage;
    delta?: Partial<NodeJS.MemoryUsage>;
  };
  cpuUsage: {
    before: NodeJS.CpuUsage;
    after?: NodeJS.CpuUsage;
    delta?: NodeJS.CpuUsage;
  };
  metadata?: Record<string, any>;
}

interface PerformanceAlert {
  type: 'memory' | 'cpu' | 'latency' | 'throughput';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  context?: Record<string, any>;
}

interface PerformanceThresholds {
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  responseTime: number; // milliseconds
  throughput: number; // requests per second
  errorRate: number; // percentage
}

@Injectable()
export class PerformanceProfilerService extends EventEmitter {
  private readonly logger = new Logger(PerformanceProfilerService.name);
  private profiles: Map<string, PerformanceProfile> = new Map();
  private performanceObserver: PerformanceObserver;
  private alerts: PerformanceAlert[] = [];
  private metrics: Map<string, number[]> = new Map();
  private isMonitoring = false;

  private readonly thresholds: PerformanceThresholds = {
    memoryUsage: 512, // 512 MB
    cpuUsage: 80, // 80%
    responseTime: 2000, // 2 seconds
    throughput: 100, // 100 RPS
    errorRate: 5 // 5%
  };

  constructor() {
    super();
    this.initializePerformanceObserver();
    this.startContinuousMonitoring();
  }

  /**
   * Initialize performance observer for automatic metrics collection
   */
  private initializePerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        this.recordMetric(`perf_${entry.entryType}`, entry.duration);
        
        // Check for performance issues
        if (entry.duration > this.thresholds.responseTime) {
          this.createAlert({
            type: 'latency',
            severity: 'high',
            message: `High latency detected in ${entry.name}`,
            value: entry.duration,
            threshold: this.thresholds.responseTime,
            timestamp: new Date(),
            context: { entryType: entry.entryType, name: entry.name }
          });
        }
      });
    });

    // Observe different types of performance entries
    this.performanceObserver.observe({ 
      entryTypes: ['measure', 'navigation', 'resource', 'paint'] 
    });
  }

  /**
   * Start a performance profile
   */
  startProfile(name: string, metadata?: Record<string, any>): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const profile: PerformanceProfile = {
      id,
      name,
      startTime: performance.now(),
      memoryUsage: {
        before: process.memoryUsage()
      },
      cpuUsage: {
        before: process.cpuUsage()
      },
      metadata
    };

    this.profiles.set(id, profile);
    
    // Create performance mark for detailed analysis
    performance.mark(`${name}_start`);
    
    this.logger.debug(`Started performance profile: ${name} (${id})`);
    return id;
  }

  /**
   * End a performance profile
   */
  endProfile(id: string): PerformanceProfile | null {
    const profile = this.profiles.get(id);
    
    if (!profile) {
      this.logger.warn(`Performance profile not found: ${id}`);
      return null;
    }

    profile.endTime = performance.now();
    profile.duration = profile.endTime - profile.startTime;
    profile.memoryUsage.after = process.memoryUsage();
    profile.cpuUsage.after = process.cpuUsage(profile.cpuUsage.before);

    // Calculate deltas
    profile.memoryUsage.delta = {
      rss: profile.memoryUsage.after.rss - profile.memoryUsage.before.rss,
      heapUsed: profile.memoryUsage.after.heapUsed - profile.memoryUsage.before.heapUsed,
      heapTotal: profile.memoryUsage.after.heapTotal - profile.memoryUsage.before.heapTotal,
      external: profile.memoryUsage.after.external - profile.memoryUsage.before.external
    };

    // Create performance measure
    performance.mark(`${profile.name}_end`);
    performance.measure(profile.name, `${profile.name}_start`, `${profile.name}_end`);

    // Record metrics
    this.recordMetric(`duration_${profile.name}`, profile.duration);
    this.recordMetric(`memory_delta_${profile.name}`, profile.memoryUsage.delta.heapUsed);

    // Check for performance issues
    this.checkPerformanceThresholds(profile);

    this.logger.debug(`Ended performance profile: ${profile.name} (${profile.duration.toFixed(2)}ms)`);
    
    // Clean up the profile from active profiles
    this.profiles.delete(id);
    
    return profile;
  }

  /**
   * Profile a function execution
   */
  async profileFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<{ result: T; profile: PerformanceProfile }> {
    const profileId = this.startProfile(name, metadata);
    
    try {
      const result = await fn();
      const profile = this.endProfile(profileId);
      
      return { result, profile };
    } catch (error) {
      const profile = this.endProfile(profileId);
      
      // Record error in profile
      if (profile) {
        profile.metadata = {
          ...profile.metadata,
          error: error.message,
          stack: error.stack
        };
      }
      
      throw error;
    }
  }

  /**
   * Start continuous system monitoring
   */
  private startContinuousMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor system metrics every 5 seconds
    const monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);

    // Monitor GC events
    if (global.gc) {
      const originalGC = global.gc;
      global.gc = () => {
        const startTime = performance.now();
        originalGC();
        const gcTime = performance.now() - startTime;
        
        this.recordMetric('gc_duration', gcTime);
        
        if (gcTime > 100) { // GC taking more than 100ms
          this.createAlert({
            type: 'memory',
            severity: 'medium',
            message: 'Long garbage collection detected',
            value: gcTime,
            threshold: 100,
            timestamp: new Date()
          });
        }
      };
    }

    // Cleanup interval on process exit
    process.on('exit', () => {
      clearInterval(monitoringInterval);
    });
  }

  /**
   * Collect system-level performance metrics
   */
  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Record memory metrics
    this.recordMetric('memory_rss', memUsage.rss);
    this.recordMetric('memory_heap_used', memUsage.heapUsed);
    this.recordMetric('memory_heap_total', memUsage.heapTotal);
    this.recordMetric('memory_external', memUsage.external);
    
    // Record CPU metrics
    this.recordMetric('cpu_user', cpuUsage.user);
    this.recordMetric('cpu_system', cpuUsage.system);
    
    // Check memory thresholds
    const memoryUsageMB = memUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > this.thresholds.memoryUsage) {
      this.createAlert({
        type: 'memory',
        severity: memoryUsageMB > this.thresholds.memoryUsage * 1.5 ? 'critical' : 'high',
        message: `High memory usage detected: ${memoryUsageMB.toFixed(2)} MB`,
        value: memoryUsageMB,
        threshold: this.thresholds.memoryUsage,
        timestamp: new Date()
      });
    }

    // Emit metrics for external monitoring
    this.emit('metrics', {
      memory: memUsage,
      cpu: cpuUsage,
      timestamp: new Date()
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name);
    values.push(value);
    
    // Keep only last 1000 values to prevent memory issues
    if (values.length > 1000) {
      values.splice(0, values.length - 500);
    }
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkPerformanceThresholds(profile: PerformanceProfile): void {
    // Check duration threshold
    if (profile.duration > this.thresholds.responseTime) {
      this.createAlert({
        type: 'latency',
        severity: profile.duration > this.thresholds.responseTime * 2 ? 'critical' : 'high',
        message: `Function ${profile.name} exceeded response time threshold`,
        value: profile.duration,
        threshold: this.thresholds.responseTime,
        timestamp: new Date(),
        context: { profileId: profile.id, functionName: profile.name }
      });
    }

    // Check memory delta threshold
    const memoryDeltaMB = profile.memoryUsage.delta.heapUsed / 1024 / 1024;
    if (memoryDeltaMB > 50) { // More than 50MB allocated
      this.createAlert({
        type: 'memory',
        severity: memoryDeltaMB > 100 ? 'high' : 'medium',
        message: `Function ${profile.name} allocated significant memory`,
        value: memoryDeltaMB,
        threshold: 50,
        timestamp: new Date(),
        context: { profileId: profile.id, functionName: profile.name }
      });
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    
    // Keep only last 500 alerts
    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(-250);
    }
    
    // Log alert based on severity
    switch (alert.severity) {
      case 'critical':
        this.logger.error(`CRITICAL ALERT: ${alert.message}`, alert);
        break;
      case 'high':
        this.logger.warn(`HIGH ALERT: ${alert.message}`, alert);
        break;
      case 'medium':
        this.logger.warn(`MEDIUM ALERT: ${alert.message}`);
        break;
      case 'low':
        this.logger.log(`LOW ALERT: ${alert.message}`);
        break;
    }
    
    // Emit alert for external handling
    this.emit('alert', alert);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(metricName?: string): any {
    if (metricName) {
      const values = this.metrics.get(metricName) || [];
      return this.calculateStats(values);
    }
    
    const stats = {};
    for (const [name, values] of this.metrics) {
      stats[name] = this.calculateStats(values);
    }
    
    return stats;
  }

  /**
   * Calculate statistics for a set of values
   */
  private calculateStats(values: number[]): any {
    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99)
    };
  }

  /**
   * Calculate percentile value
   */
  private percentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 50): PerformanceAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get active profiles
   */
  getActiveProfiles(): PerformanceProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    summary: any;
    metrics: any;
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const summary = {
      activeProfiles: this.profiles.size,
      totalMetrics: this.metrics.size,
      recentAlerts: this.alerts.filter(a => 
        Date.now() - a.timestamp.getTime() < 3600000 // Last hour
      ).length
    };
    
    const metrics = this.getPerformanceStats();
    const recentAlerts = this.getRecentAlerts(20);
    
    const recommendations = this.generateRecommendations();
    
    return {
      summary,
      metrics,
      alerts: recentAlerts,
      recommendations
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations = [];
    
    // Analyze memory usage trends
    const memoryValues = this.metrics.get('memory_heap_used') || [];
    if (memoryValues.length > 10) {
      const recentMemory = memoryValues.slice(-10);
      const avgRecent = recentMemory.reduce((sum, val) => sum + val, 0) / recentMemory.length;
      const avgMB = avgRecent / 1024 / 1024;
      
      if (avgMB > this.thresholds.memoryUsage * 0.8) {
        recommendations.push('Consider optimizing memory usage - approaching threshold');
      }
    }
    
    // Analyze response time trends
    const responseTimeMetrics = Array.from(this.metrics.keys())
      .filter(key => key.startsWith('duration_'));
    
    for (const metric of responseTimeMetrics) {
      const values = this.metrics.get(metric) || [];
      if (values.length > 5) {
        const stats = this.calculateStats(values);
        if (stats.p95 > this.thresholds.responseTime * 0.8) {
          recommendations.push(`Optimize ${metric.replace('duration_', '')} - P95 approaching threshold`);
        }
      }
    }
    
    // Analyze alert patterns
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = this.alerts.filter(a => a.severity === 'high').length;
    
    if (criticalAlerts > 0) {
      recommendations.push('Address critical performance issues immediately');
    }
    
    if (highAlerts > 5) {
      recommendations.push('Review and optimize high-priority performance issues');
    }
    
    return recommendations;
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(): void {
    // Clear old metrics (keep only last 100 values per metric)
    for (const [name, values] of this.metrics) {
      if (values.length > 100) {
        this.metrics.set(name, values.slice(-100));
      }
    }
    
    // Clear old alerts (keep only last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    this.logger.log('Performance metrics and alerts cleaned up');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.logger.log('Performance monitoring stopped');
  }
}

export { PerformanceProfilerService, PerformanceProfile, PerformanceAlert };