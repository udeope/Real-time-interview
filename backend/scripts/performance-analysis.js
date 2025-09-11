const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
  constructor() {
    this.metrics = {
      apiEndpoints: new Map(),
      databaseQueries: new Map(),
      cacheOperations: new Map(),
      memoryUsage: [],
      cpuUsage: [],
      bottlenecks: []
    };
    this.isMonitoring = false;
  }

  startMonitoring() {
    this.isMonitoring = true;
    console.log('🔍 Starting performance monitoring...');
    
    // Monitor memory usage
    this.memoryInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage.push({
        timestamp: Date.now(),
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      });
    }, 1000);

    // Monitor CPU usage (simplified)
    this.cpuInterval = setInterval(() => {
      const cpuUsage = process.cpuUsage();
      this.metrics.cpuUsage.push({
        timestamp: Date.now(),
        user: cpuUsage.user,
        system: cpuUsage.system
      });
    }, 1000);
  }

  stopMonitoring() {
    this.isMonitoring = false;
    clearInterval(this.memoryInterval);
    clearInterval(this.cpuInterval);
    console.log('⏹️ Stopped performance monitoring');
  }

  measureApiEndpoint(endpoint, method, fn) {
    return async (...args) => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      try {
        const result = await fn(...args);
        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;
        
        this.recordApiMetric(endpoint, method, {
          duration: endTime - startTime,
          memoryDelta: endMemory - startMemory,
          success: true,
          timestamp: Date.now()
        });
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        
        this.recordApiMetric(endpoint, method, {
          duration: endTime - startTime,
          memoryDelta: 0,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
        
        throw error;
      }
    };
  }

  measureDatabaseQuery(queryName, fn) {
    return async (...args) => {
      const startTime = performance.now();
      
      try {
        const result = await fn(...args);
        const endTime = performance.now();
        
        this.recordDatabaseMetric(queryName, {
          duration: endTime - startTime,
          success: true,
          resultSize: Array.isArray(result) ? result.length : 1,
          timestamp: Date.now()
        });
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        
        this.recordDatabaseMetric(queryName, {
          duration: endTime - startTime,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
        
        throw error;
      }
    };
  }

  measureCacheOperation(operation, fn) {
    return async (...args) => {
      const startTime = performance.now();
      
      try {
        const result = await fn(...args);
        const endTime = performance.now();
        
        this.recordCacheMetric(operation, {
          duration: endTime - startTime,
          hit: result !== null && result !== undefined,
          timestamp: Date.now()
        });
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        
        this.recordCacheMetric(operation, {
          duration: endTime - startTime,
          hit: false,
          error: error.message,
          timestamp: Date.now()
        });
        
        throw error;
      }
    };
  }

  recordApiMetric(endpoint, method, metric) {
    const key = `${method} ${endpoint}`;
    if (!this.metrics.apiEndpoints.has(key)) {
      this.metrics.apiEndpoints.set(key, []);
    }
    this.metrics.apiEndpoints.get(key).push(metric);
    
    // Check for bottlenecks
    if (metric.duration > 2000) {
      this.metrics.bottlenecks.push({
        type: 'api',
        endpoint: key,
        duration: metric.duration,
        timestamp: metric.timestamp
      });
    }
  }

  recordDatabaseMetric(queryName, metric) {
    if (!this.metrics.databaseQueries.has(queryName)) {
      this.metrics.databaseQueries.set(queryName, []);
    }
    this.metrics.databaseQueries.get(queryName).push(metric);
    
    // Check for slow queries
    if (metric.duration > 1000) {
      this.metrics.bottlenecks.push({
        type: 'database',
        query: queryName,
        duration: metric.duration,
        timestamp: metric.timestamp
      });
    }
  }

  recordCacheMetric(operation, metric) {
    if (!this.metrics.cacheOperations.has(operation)) {
      this.metrics.cacheOperations.set(operation, []);
    }
    this.metrics.cacheOperations.get(operation).push(metric);
  }

  generateReport() {
    const report = {
      summary: this.generateSummary(),
      apiEndpoints: this.analyzeApiEndpoints(),
      databaseQueries: this.analyzeDatabaseQueries(),
      cacheOperations: this.analyzeCacheOperations(),
      memoryAnalysis: this.analyzeMemoryUsage(),
      bottlenecks: this.analyzeBottlenecks(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  generateSummary() {
    const totalApiCalls = Array.from(this.metrics.apiEndpoints.values())
      .reduce((sum, calls) => sum + calls.length, 0);
    
    const totalDbQueries = Array.from(this.metrics.databaseQueries.values())
      .reduce((sum, queries) => sum + queries.length, 0);
    
    const avgMemoryUsage = this.metrics.memoryUsage.length > 0
      ? this.metrics.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / this.metrics.memoryUsage.length
      : 0;

    return {
      totalApiCalls,
      totalDbQueries,
      totalBottlenecks: this.metrics.bottlenecks.length,
      avgMemoryUsage: Math.round(avgMemoryUsage / 1024 / 1024), // MB
      monitoringDuration: this.metrics.memoryUsage.length // seconds
    };
  }

  analyzeApiEndpoints() {
    const analysis = {};
    
    for (const [endpoint, metrics] of this.metrics.apiEndpoints) {
      const durations = metrics.map(m => m.duration);
      const successRate = metrics.filter(m => m.success).length / metrics.length;
      
      analysis[endpoint] = {
        totalCalls: metrics.length,
        avgDuration: this.calculateAverage(durations),
        p95Duration: this.calculatePercentile(durations, 95),
        p99Duration: this.calculatePercentile(durations, 99),
        successRate: Math.round(successRate * 100),
        slowestCall: Math.max(...durations),
        fastestCall: Math.min(...durations)
      };
    }
    
    return analysis;
  }

  analyzeDatabaseQueries() {
    const analysis = {};
    
    for (const [queryName, metrics] of this.metrics.databaseQueries) {
      const durations = metrics.map(m => m.duration);
      const successRate = metrics.filter(m => m.success).length / metrics.length;
      
      analysis[queryName] = {
        totalQueries: metrics.length,
        avgDuration: this.calculateAverage(durations),
        p95Duration: this.calculatePercentile(durations, 95),
        successRate: Math.round(successRate * 100),
        slowestQuery: Math.max(...durations),
        avgResultSize: this.calculateAverage(metrics.map(m => m.resultSize || 0))
      };
    }
    
    return analysis;
  }

  analyzeCacheOperations() {
    const analysis = {};
    
    for (const [operation, metrics] of this.metrics.cacheOperations) {
      const hitRate = metrics.filter(m => m.hit).length / metrics.length;
      const durations = metrics.map(m => m.duration);
      
      analysis[operation] = {
        totalOperations: metrics.length,
        hitRate: Math.round(hitRate * 100),
        avgDuration: this.calculateAverage(durations),
        p95Duration: this.calculatePercentile(durations, 95)
      };
    }
    
    return analysis;
  }

  analyzeMemoryUsage() {
    if (this.metrics.memoryUsage.length === 0) return null;
    
    const heapUsed = this.metrics.memoryUsage.map(m => m.heapUsed);
    const rss = this.metrics.memoryUsage.map(m => m.rss);
    
    return {
      avgHeapUsed: Math.round(this.calculateAverage(heapUsed) / 1024 / 1024), // MB
      maxHeapUsed: Math.round(Math.max(...heapUsed) / 1024 / 1024), // MB
      avgRSS: Math.round(this.calculateAverage(rss) / 1024 / 1024), // MB
      maxRSS: Math.round(Math.max(...rss) / 1024 / 1024), // MB
      memoryGrowth: this.calculateMemoryGrowth()
    };
  }

  analyzeBottlenecks() {
    const bottlenecksByType = {};
    
    for (const bottleneck of this.metrics.bottlenecks) {
      if (!bottlenecksByType[bottleneck.type]) {
        bottlenecksByType[bottleneck.type] = [];
      }
      bottlenecksByType[bottleneck.type].push(bottleneck);
    }
    
    return {
      total: this.metrics.bottlenecks.length,
      byType: bottlenecksByType,
      mostFrequent: this.findMostFrequentBottlenecks()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // API endpoint recommendations
    for (const [endpoint, analysis] of Object.entries(this.analyzeApiEndpoints())) {
      if (analysis.p95Duration > 2000) {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          component: 'api',
          issue: `Endpoint ${endpoint} has slow P95 response time (${Math.round(analysis.p95Duration)}ms)`,
          suggestion: 'Consider adding caching, optimizing business logic, or implementing pagination'
        });
      }
      
      if (analysis.successRate < 95) {
        recommendations.push({
          type: 'reliability',
          priority: 'high',
          component: 'api',
          issue: `Endpoint ${endpoint} has low success rate (${analysis.successRate}%)`,
          suggestion: 'Investigate error patterns and improve error handling'
        });
      }
    }
    
    // Database recommendations
    for (const [queryName, analysis] of Object.entries(this.analyzeDatabaseQueries())) {
      if (analysis.avgDuration > 500) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          component: 'database',
          issue: `Query ${queryName} has slow average duration (${Math.round(analysis.avgDuration)}ms)`,
          suggestion: 'Consider adding indexes, optimizing query structure, or implementing caching'
        });
      }
    }
    
    // Cache recommendations
    for (const [operation, analysis] of Object.entries(this.analyzeCacheOperations())) {
      if (analysis.hitRate < 80) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          component: 'cache',
          issue: `Cache operation ${operation} has low hit rate (${analysis.hitRate}%)`,
          suggestion: 'Review cache TTL settings and cache key strategies'
        });
      }
    }
    
    // Memory recommendations
    const memoryAnalysis = this.analyzeMemoryUsage();
    if (memoryAnalysis && memoryAnalysis.memoryGrowth > 10) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        component: 'system',
        issue: `Memory usage growing by ${memoryAnalysis.memoryGrowth}% during monitoring`,
        suggestion: 'Investigate potential memory leaks and optimize object lifecycle management'
      });
    }
    
    return recommendations;
  }

  calculateAverage(numbers) {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }

  calculatePercentile(numbers, percentile) {
    if (numbers.length === 0) return 0;
    const sorted = numbers.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  calculateMemoryGrowth() {
    if (this.metrics.memoryUsage.length < 2) return 0;
    
    const first = this.metrics.memoryUsage[0].heapUsed;
    const last = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1].heapUsed;
    
    return Math.round(((last - first) / first) * 100);
  }

  findMostFrequentBottlenecks() {
    const frequency = {};
    
    for (const bottleneck of this.metrics.bottlenecks) {
      const key = bottleneck.endpoint || bottleneck.query || bottleneck.type;
      frequency[key] = (frequency[key] || 0) + 1;
    }
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([key, count]) => ({ component: key, occurrences: count }));
  }

  saveReport(filename) {
    const report = this.generateReport();
    const reportPath = path.join(__dirname, '..', 'reports', filename);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Performance report saved to: ${reportPath}`);
    
    return reportPath;
  }

  printSummary() {
    const summary = this.generateSummary();
    const recommendations = this.generateRecommendations();
    
    console.log('\n📊 PERFORMANCE ANALYSIS SUMMARY');
    console.log('================================');
    console.log(`Total API Calls: ${summary.totalApiCalls}`);
    console.log(`Total DB Queries: ${summary.totalDbQueries}`);
    console.log(`Total Bottlenecks: ${summary.totalBottlenecks}`);
    console.log(`Average Memory Usage: ${summary.avgMemoryUsage} MB`);
    console.log(`Monitoring Duration: ${summary.monitoringDuration} seconds`);
    
    if (recommendations.length > 0) {
      console.log('\n🚨 TOP RECOMMENDATIONS:');
      recommendations
        .filter(r => r.priority === 'high')
        .slice(0, 3)
        .forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.component.toUpperCase()}] ${rec.issue}`);
          console.log(`   → ${rec.suggestion}\n`);
        });
    }
  }
}

module.exports = PerformanceAnalyzer;