export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: Date;
  expiresAt: Date;
  hitCount: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CacheStats {
  totalKeys: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  averageLatency: number;
  topKeys: Array<{ key: string; hits: number }>;
}

export interface CacheConfig {
  defaultTTL: number;
  maxCacheSize: number;
  enableCompression: boolean;
  enableMetrics: boolean;
  cleanupInterval: number;
}

export interface InvalidationStrategy {
  type: 'time' | 'tag' | 'pattern' | 'dependency';
  value: string | number;
  cascade?: boolean;
}

export interface PerformanceMetrics {
  operationType: 'get' | 'set' | 'delete' | 'invalidate';
  duration: number;
  cacheHit: boolean;
  keyPattern: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface PrecomputationJob {
  id: string;
  pattern: string;
  generator: () => Promise<any>;
  schedule: string; // cron expression
  priority: number;
  enabled: boolean;
}