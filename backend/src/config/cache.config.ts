import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
  },

  // Cache Configuration
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'), // 1 hour
  maxCacheSize: parseInt(process.env.CACHE_MAX_SIZE || '50000'),
  enableCompression: process.env.CACHE_ENABLE_COMPRESSION !== 'false',
  enableMetrics: process.env.CACHE_ENABLE_METRICS !== 'false',
  cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '300000'), // 5 minutes

  // Performance Monitoring
  performanceMonitoring: {
    enabled: process.env.PERFORMANCE_MONITORING_ENABLED !== 'false',
    metricsRetention: parseInt(process.env.METRICS_RETENTION_HOURS || '24') * 3600000, // 24 hours in ms
    alertThresholds: {
      cacheHitRate: parseFloat(process.env.CACHE_HIT_RATE_THRESHOLD || '80'),
      averageLatency: parseFloat(process.env.CACHE_LATENCY_THRESHOLD || '100'),
      memoryUsage: parseFloat(process.env.MEMORY_USAGE_THRESHOLD || '512'), // MB
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '5'), // %
    },
  },

  // Rate Limiting
  rateLimiting: {
    enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
    rules: {
      apiGeneral: {
        windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW || '60000'), // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_API_MAX || '100'),
      },
      authLogin: {
        windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '300000'), // 5 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'),
      },
      transcription: {
        windowMs: parseInt(process.env.RATE_LIMIT_TRANSCRIPTION_WINDOW || '60000'), // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_TRANSCRIPTION_MAX || '20'),
      },
      responseGeneration: {
        windowMs: parseInt(process.env.RATE_LIMIT_RESPONSE_WINDOW || '60000'), // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_RESPONSE_MAX || '30'),
      },
      userRequests: {
        windowMs: parseInt(process.env.RATE_LIMIT_USER_WINDOW || '60000'), // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_USER_MAX || '200'),
      },
    },
  },

  // Precomputation
  precomputation: {
    enabled: process.env.PRECOMPUTATION_ENABLED !== 'false',
    schedules: {
      commonResponses: process.env.PRECOMPUTE_RESPONSES_SCHEDULE || '0 2 * * *', // Daily at 2 AM
      contextData: process.env.PRECOMPUTE_CONTEXT_SCHEDULE || '0 3 * * *', // Daily at 3 AM
      transcriptionPatterns: process.env.PRECOMPUTE_TRANSCRIPTION_SCHEDULE || '0 4 * * 0', // Weekly on Sunday at 4 AM
    },
  },

  // Database Optimization
  database: {
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20'),
    poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '60000'), // 60 seconds
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '600000'), // 10 minutes
    workMem: process.env.DB_WORK_MEM || '4MB',
    randomPageCost: parseFloat(process.env.DB_RANDOM_PAGE_COST || '1.1'),
    maxParallelWorkers: parseInt(process.env.DB_MAX_PARALLEL_WORKERS || '2'),
    checkpointCompletionTarget: parseFloat(process.env.DB_CHECKPOINT_COMPLETION_TARGET || '0.9'),
    effectiveCacheSize: process.env.DB_EFFECTIVE_CACHE_SIZE || '1GB',
  },

  // Cache Invalidation
  invalidation: {
    strategies: {
      userContext: {
        patterns: [
          'user:{userId}:*',
          'profile:{userId}:*',
          'context:{userId}:*',
          'responses:*:user:{userId}:*',
          'session:{userId}:*',
        ],
      },
      sessionContext: {
        patterns: [
          'session:{sessionId}:*',
          'transcription:{sessionId}:*',
          'responses:{sessionId}:*',
          'context:*:session:{sessionId}:*',
        ],
      },
    },
  },

  // Cache Warming
  warming: {
    enabled: process.env.CACHE_WARMING_ENABLED !== 'false',
    batchSize: parseInt(process.env.CACHE_WARMING_BATCH_SIZE || '100'),
    concurrency: parseInt(process.env.CACHE_WARMING_CONCURRENCY || '5'),
  },
}));