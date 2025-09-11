const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const PerformanceAnalyzer = require('./performance-analysis');

class PerformanceTestRunner {
  constructor() {
    this.analyzer = new PerformanceAnalyzer();
    this.testResults = [];
    this.isRunning = false;
  }

  /**
   * Run comprehensive performance test suite
   */
  async runPerformanceTests() {
    console.log('🚀 Starting comprehensive performance test suite...\n');
    
    this.isRunning = true;
    this.analyzer.startMonitoring();

    try {
      // 1. Load Testing
      console.log('📊 Running load tests...');
      await this.runLoadTests();

      // 2. Stress Testing
      console.log('💪 Running stress tests...');
      await this.runStressTests();

      // 3. Database Performance Testing
      console.log('🗄️ Running database performance tests...');
      await this.runDatabaseTests();

      // 4. API Endpoint Testing
      console.log('🌐 Running API endpoint tests...');
      await this.runAPITests();

      // 5. Memory Leak Testing
      console.log('🧠 Running memory leak tests...');
      await this.runMemoryLeakTests();

      // 6. Concurrency Testing
      console.log('⚡ Running concurrency tests...');
      await this.runConcurrencyTests();

      // Generate comprehensive report
      await this.generateReport();

    } catch (error) {
      console.error('❌ Performance tests failed:', error);
    } finally {
      this.analyzer.stopMonitoring();
      this.isRunning = false;
    }
  }

  /**
   * Run load tests using k6
   */
  async runLoadTests() {
    const testConfig = {
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 0 }
      ]
    };

    const result = await this.executeK6Test('comprehensive-load-test.js', {
      BASE_URL: process.env.BASE_URL || 'http://localhost:3001',
      WS_URL: process.env.WS_URL || 'ws://localhost:3001'
    });

    this.testResults.push({
      type: 'load',
      name: 'Comprehensive Load Test',
      result,
      timestamp: new Date()
    });

    console.log('✅ Load tests completed');
  }

  /**
   * Run stress tests to find breaking points
   */
  async runStressTests() {
    const stressTestScript = `
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 400 },
    { duration: '2m', target: 800 },
    { duration: '5m', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% under 5s during stress
    http_req_failed: ['rate<0.3'], // Allow higher error rate during stress
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function() {
  // Stress test critical endpoints
  let res = http.get(\`\${BASE_URL}/api/health\`);
  check(res, { 'health check status 200': (r) => r.status === 200 });
  
  res = http.post(\`\${BASE_URL}/api/transcription/process\`, JSON.stringify({
    data: new Array(8192).fill(0).map(() => Math.random() * 255),
    sampleRate: 44100
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(res, { 'transcription status ok': (r) => r.status < 400 });
  
  sleep(0.1);
}
`;

    await this.writeTemporaryScript('stress-test.js', stressTestScript);
    
    const result = await this.executeK6Test('stress-test.js', {
      BASE_URL: process.env.BASE_URL || 'http://localhost:3001'
    });

    this.testResults.push({
      type: 'stress',
      name: 'Stress Test',
      result,
      timestamp: new Date()
    });

    console.log('✅ Stress tests completed');
  }

  /**
   * Run database performance tests
   */
  async runDatabaseTests() {
    const dbTestScript = `
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 20,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<1000'], // DB queries should be fast
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function() {
  // Test complex queries
  let res = http.get(\`\${BASE_URL}/api/analytics/user-sessions?limit=100\`);
  check(res, { 'complex query status 200': (r) => r.status === 200 });
  
  // Test aggregation queries
  res = http.get(\`\${BASE_URL}/api/analytics/performance-metrics?period=7d\`);
  check(res, { 'aggregation query status 200': (r) => r.status === 200 });
  
  // Test search queries
  res = http.get(\`\${BASE_URL}/api/search/interactions?q=react&limit=50\`);
  check(res, { 'search query status 200': (r) => r.status === 200 });
}
`;

    await this.writeTemporaryScript('db-test.js', dbTestScript);
    
    const result = await this.executeK6Test('db-test.js', {
      BASE_URL: process.env.BASE_URL || 'http://localhost:3001'
    });

    this.testResults.push({
      type: 'database',
      name: 'Database Performance Test',
      result,
      timestamp: new Date()
    });

    console.log('✅ Database tests completed');
  }

  /**
   * Run API endpoint performance tests
   */
  async runAPITests() {
    const endpoints = [
      { path: '/api/auth/login', method: 'POST', payload: { email: 'test@example.com', password: 'password' } },
      { path: '/api/user/profile', method: 'GET' },
      { path: '/api/interview-session', method: 'POST', payload: { jobContext: { title: 'Test' } } },
      { path: '/api/transcription/process', method: 'POST', payload: { data: [1,2,3], sampleRate: 44100 } },
      { path: '/api/response-generation/generate', method: 'POST', payload: { question: 'Test question' } }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      console.log(`  Testing ${endpoint.method} ${endpoint.path}...`);
      
      const testScript = `
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function() {
  const payload = ${JSON.stringify(endpoint.payload || {})};
  const headers = { 'Content-Type': 'application/json' };
  
  let res;
  if ('${endpoint.method}' === 'GET') {
    res = http.get(\`\${BASE_URL}${endpoint.path}\`, { headers });
  } else {
    res = http.${endpoint.method.toLowerCase()}(\`\${BASE_URL}${endpoint.path}\`, JSON.stringify(payload), { headers });
  }
  
  check(res, {
    'status is ok': (r) => r.status < 400,
    'response time < 2s': (r) => r.timings.duration < 2000
  });
}
`;

      await this.writeTemporaryScript(`api-test-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '_')}.js`, testScript);
      
      const result = await this.executeK6Test(`api-test-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '_')}.js`, {
        BASE_URL: process.env.BASE_URL || 'http://localhost:3001'
      });

      results.push({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        result
      });
    }

    this.testResults.push({
      type: 'api',
      name: 'API Endpoint Tests',
      result: results,
      timestamp: new Date()
    });

    console.log('✅ API tests completed');
  }

  /**
   * Run memory leak detection tests
   */
  async runMemoryLeakTests() {
    console.log('  Starting memory baseline measurement...');
    
    const initialMemory = process.memoryUsage();
    const memorySnapshots = [initialMemory];
    
    // Run intensive operations to detect memory leaks
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      // Simulate heavy operations
      await this.simulateHeavyOperation();
      
      if (i % 10 === 0) {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        memorySnapshots.push(process.memoryUsage());
        console.log(`  Memory check ${i + 1}/${iterations}: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
      }
    }

    // Analyze memory growth
    const memoryGrowth = this.analyzeMemoryGrowth(memorySnapshots);
    
    this.testResults.push({
      type: 'memory',
      name: 'Memory Leak Detection',
      result: {
        initialMemory: initialMemory.heapUsed,
        finalMemory: memorySnapshots[memorySnapshots.length - 1].heapUsed,
        memoryGrowth,
        snapshots: memorySnapshots.length,
        leakDetected: memoryGrowth > 50 * 1024 * 1024 // 50MB growth indicates potential leak
      },
      timestamp: new Date()
    });

    console.log('✅ Memory leak tests completed');
  }

  /**
   * Run concurrency tests
   */
  async runConcurrencyTests() {
    const concurrentOperations = [
      () => this.simulateTranscriptionRequest(),
      () => this.simulateResponseGeneration(),
      () => this.simulateContextAnalysis(),
      () => this.simulateDatabaseQuery(),
      () => this.simulateCacheOperation()
    ];

    const concurrencyLevels = [10, 50, 100, 200];
    const results = [];

    for (const level of concurrencyLevels) {
      console.log(`  Testing concurrency level: ${level}`);
      
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < level; i++) {
        const operation = concurrentOperations[i % concurrentOperations.length];
        promises.push(operation());
      }

      try {
        await Promise.all(promises);
        const endTime = Date.now();
        const duration = endTime - startTime;

        results.push({
          concurrencyLevel: level,
          duration,
          throughput: (level / duration) * 1000, // operations per second
          success: true
        });

        console.log(`    ✅ Level ${level}: ${duration}ms (${((level / duration) * 1000).toFixed(2)} ops/sec)`);
      } catch (error) {
        results.push({
          concurrencyLevel: level,
          error: error.message,
          success: false
        });

        console.log(`    ❌ Level ${level}: Failed - ${error.message}`);
      }
    }

    this.testResults.push({
      type: 'concurrency',
      name: 'Concurrency Tests',
      result: results,
      timestamp: new Date()
    });

    console.log('✅ Concurrency tests completed');
  }

  /**
   * Execute k6 test script
   */
  async executeK6Test(scriptPath, envVars = {}) {
    return new Promise((resolve, reject) => {
      const env = { ...process.env, ...envVars };
      const k6Process = spawn('k6', ['run', scriptPath], { env });
      
      let output = '';
      let errorOutput = '';

      k6Process.stdout.on('data', (data) => {
        output += data.toString();
      });

      k6Process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      k6Process.on('close', (code) => {
        if (code === 0) {
          resolve(this.parseK6Output(output));
        } else {
          reject(new Error(`k6 test failed with code ${code}: ${errorOutput}`));
        }
      });

      // Timeout after 10 minutes
      setTimeout(() => {
        k6Process.kill();
        reject(new Error('k6 test timed out'));
      }, 600000);
    });
  }

  /**
   * Parse k6 output to extract metrics
   */
  parseK6Output(output) {
    const lines = output.split('\n');
    const metrics = {};
    
    lines.forEach(line => {
      // Parse k6 metrics (simplified)
      if (line.includes('http_req_duration')) {
        const match = line.match(/avg=([0-9.]+)ms.*p\(95\)=([0-9.]+)ms/);
        if (match) {
          metrics.avgDuration = parseFloat(match[1]);
          metrics.p95Duration = parseFloat(match[2]);
        }
      }
      
      if (line.includes('http_req_failed')) {
        const match = line.match(/([0-9.]+)%/);
        if (match) {
          metrics.errorRate = parseFloat(match[1]);
        }
      }
      
      if (line.includes('iterations')) {
        const match = line.match(/([0-9]+)/);
        if (match) {
          metrics.totalRequests = parseInt(match[1]);
        }
      }
    });
    
    return metrics;
  }

  /**
   * Write temporary test script
   */
  async writeTemporaryScript(filename, content) {
    const scriptPath = path.join(__dirname, '..', 'test', 'load', filename);
    fs.writeFileSync(scriptPath, content);
  }

  /**
   * Simulate heavy operation for memory testing
   */
  async simulateHeavyOperation() {
    // Create and process large arrays
    const largeArray = new Array(10000).fill(0).map(() => ({
      id: Math.random(),
      data: new Array(100).fill(0).map(() => Math.random()),
      timestamp: Date.now()
    }));

    // Process the array
    const processed = largeArray
      .filter(item => item.id > 0.5)
      .map(item => ({
        ...item,
        processed: true,
        sum: item.data.reduce((sum, val) => sum + val, 0)
      }))
      .sort((a, b) => a.sum - b.sum);

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return processed.length;
  }

  /**
   * Analyze memory growth pattern
   */
  analyzeMemoryGrowth(snapshots) {
    if (snapshots.length < 2) return 0;
    
    const initial = snapshots[0].heapUsed;
    const final = snapshots[snapshots.length - 1].heapUsed;
    
    return final - initial;
  }

  /**
   * Simulate various operations for concurrency testing
   */
  async simulateTranscriptionRequest() {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    return { type: 'transcription', duration: Math.random() * 100 + 50 };
  }

  async simulateResponseGeneration() {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    return { type: 'response', duration: Math.random() * 200 + 100 };
  }

  async simulateContextAnalysis() {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 75));
    return { type: 'context', duration: Math.random() * 150 + 75 };
  }

  async simulateDatabaseQuery() {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 80 + 20));
    return { type: 'database', duration: Math.random() * 80 + 20 };
  }

  async simulateCacheOperation() {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));
    return { type: 'cache', duration: Math.random() * 20 + 5 };
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport() {
    console.log('\n📊 Generating comprehensive performance report...');
    
    const report = {
      timestamp: new Date(),
      summary: this.generateSummary(),
      testResults: this.testResults,
      systemMetrics: this.analyzer.generateReport(),
      recommendations: this.generateRecommendations()
    };

    // Save report to file
    const reportPath = path.join(__dirname, '..', 'reports', `performance-report-${Date.now()}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    this.printReportSummary(report);
    
    console.log(`\n📄 Full report saved to: ${reportPath}`);
  }

  /**
   * Generate test summary
   */
  generateSummary() {
    const summary = {
      totalTests: this.testResults.length,
      passedTests: 0,
      failedTests: 0,
      averagePerformance: {},
      criticalIssues: []
    };

    this.testResults.forEach(test => {
      if (test.result && !test.result.error) {
        summary.passedTests++;
      } else {
        summary.failedTests++;
      }
    });

    return summary;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Analyze test results for recommendations
    this.testResults.forEach(test => {
      switch (test.type) {
        case 'load':
          if (test.result.p95Duration > 2000) {
            recommendations.push({
              priority: 'high',
              category: 'latency',
              issue: 'High P95 response time under load',
              suggestion: 'Optimize critical path operations and consider horizontal scaling'
            });
          }
          break;
          
        case 'memory':
          if (test.result.leakDetected) {
            recommendations.push({
              priority: 'critical',
              category: 'memory',
              issue: 'Potential memory leak detected',
              suggestion: 'Review object lifecycle management and implement proper cleanup'
            });
          }
          break;
          
        case 'concurrency':
          const failedLevels = test.result.filter(r => !r.success);
          if (failedLevels.length > 0) {
            recommendations.push({
              priority: 'medium',
              category: 'concurrency',
              issue: `Concurrency failures at level ${failedLevels[0].concurrencyLevel}`,
              suggestion: 'Implement better resource management and connection pooling'
            });
          }
          break;
      }
    });

    return recommendations;
  }

  /**
   * Print report summary to console
   */
  printReportSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests} ✅`);
    console.log(`Failed: ${report.summary.failedTests} ${report.summary.failedTests > 0 ? '❌' : '✅'}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n🚨 TOP RECOMMENDATIONS:');
      report.recommendations
        .filter(r => r.priority === 'critical' || r.priority === 'high')
        .slice(0, 3)
        .forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}`);
          console.log(`   → ${rec.suggestion}\n`);
        });
    } else {
      console.log('\n✅ No critical performance issues detected!');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new PerformanceTestRunner();
  runner.runPerformanceTests().catch(console.error);
}

module.exports = PerformanceTestRunner;