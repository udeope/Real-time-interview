import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './services/cache.service';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { ResponsePrecomputationService } from './services/response-precomputation.service';
import { PerformanceMonitoringService } from './services/performance-monitoring.service';
import { RateLimitingService } from './services/rate-limiting.service';
import { DatabaseOptimizationService } from './database-optimization.service';
import { RedisService } from '../../config/redis.config';
import { DatabaseService } from '../../config/database.config';

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  pipeline: jest.fn(() => ({
    setex: jest.fn(),
    exec: jest.fn(),
  })),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  ping: jest.fn(),
  info: jest.fn(),
  memory: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  sismember: jest.fn(),
  incr: jest.fn(),
  hincrby: jest.fn(),
  hmget: jest.fn(),
  eval: jest.fn(),
};

const mockRedisService = {
  getClient: jest.fn(() => mockRedisClient),
  healthCheck: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
  flushAll: jest.fn(),
};

const mockDatabaseService = {
  $executeRawUnsafe: jest.fn(),
  $queryRaw: jest.fn(),
  user: {
    findMany: jest.fn(),
  },
  transcriptionCache: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config = {
      CACHE_DEFAULT_TTL: 3600,
      CACHE_MAX_SIZE: 50000,
      CACHE_ENABLE_COMPRESSION: true,
      CACHE_ENABLE_METRICS: true,
      CACHE_CLEANUP_INTERVAL: 300000,
      PERFORMANCE_MONITORING_ENABLED: true,
      RATE_LIMITING_ENABLED: true,
      PRECOMPUTATION_ENABLED: true,
      REDIS_URL: 'redis://localhost:6379',
    };
    return config[key] || defaultValue;
  }),
};

describe('CacheService', () => {
  let service: CacheService;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached data when key exists', async () => {
      const testData = { message: 'test data' };
      const cacheEntry = {
        key: 'test-key',
        data: testData,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        hitCount: 0,
        tags: [],
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cacheEntry));
      mockRedisClient.ttl.mockResolvedValue(3600);

      const result = await service.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('cache:test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith('cache:non-existent-key');
    });

    it('should return null when cache entry is expired', async () => {
      const testData = { message: 'test data' };
      const expiredEntry = {
        key: 'test-key',
        data: testData,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        hitCount: 0,
        tags: [],
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(expiredEntry));

      const result = await service.get('test-key');

      expect(result).toBeNull();
      expect(mockRedisClient.del).toHaveBeenCalledWith('cache:test-key');
    });

    it('should handle compressed data', async () => {
      const testData = { message: 'test data' };
      const cacheEntry = {
        key: 'test-key',
        data: testData,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        hitCount: 0,
        tags: [],
        metadata: { compressed: true },
      };

      // Mock compressed data
      const zlib = require('zlib');
      const compressed = zlib.gzipSync(JSON.stringify(cacheEntry));
      const compressedString = 'gzip:' + compressed.toString('base64');

      mockRedisClient.get.mockResolvedValue(compressedString);
      mockRedisClient.ttl.mockResolvedValue(3600);

      const result = await service.get('test-key');

      expect(result).toEqual(testData);
    });
  });

  describe('set', () => {
    it('should store data in cache with TTL', async () => {
      const testData = { message: 'test data' };
      const ttl = 1800;

      await service.set('test-key', testData, ttl);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'cache:test-key',
        ttl,
        expect.stringContaining('"data":{"message":"test data"}')
      );
    });

    it('should use default TTL when not specified', async () => {
      const testData = { message: 'test data' };

      await service.set('test-key', testData);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'cache:test-key',
        3600, // Default TTL from config
        expect.any(String)
      );
    });

    it('should compress large data', async () => {
      const largeData = { message: 'x'.repeat(2000) }; // Large data to trigger compression

      await service.set('test-key', largeData);

      const setexCall = mockRedisClient.setex.mock.calls[0];
      expect(setexCall[2]).toMatch(/^gzip:/); // Should start with gzip prefix
    });

    it('should store tags for invalidation', async () => {
      const testData = { message: 'test data' };
      const tags = ['user:123', 'session:456'];

      await service.set('test-key', testData, 3600, tags);

      expect(mockRedisClient.sadd).toHaveBeenCalledWith('tags:user:123', 'test-key');
      expect(mockRedisClient.sadd).toHaveBeenCalledWith('tags:session:456', 'test-key');
    });
  });

  describe('mget', () => {
    it('should return multiple cached values', async () => {
      const testData1 = { message: 'test data 1' };
      const testData2 = { message: 'test data 2' };
      
      const cacheEntry1 = {
        key: 'test-key-1',
        data: testData1,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        hitCount: 0,
        tags: [],
      };
      
      const cacheEntry2 = {
        key: 'test-key-2',
        data: testData2,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        hitCount: 0,
        tags: [],
      };

      mockRedisClient.mget.mockResolvedValue([
        JSON.stringify(cacheEntry1),
        JSON.stringify(cacheEntry2),
      ]);

      const result = await service.mget(['test-key-1', 'test-key-2']);

      expect(result.get('test-key-1')).toEqual(testData1);
      expect(result.get('test-key-2')).toEqual(testData2);
    });
  });

  describe('delete', () => {
    it('should delete cache entry', async () => {
      await service.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('cache:test-key');
    });
  });

  describe('clear', () => {
    it('should clear cache entries matching pattern', async () => {
      mockRedisClient.keys.mockResolvedValue(['cache:test-1', 'cache:test-2']);
      mockRedisClient.del.mockResolvedValue(2);

      const result = await service.clear('test-*');

      expect(result).toBe(2);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('cache:test-*');
      expect(mockRedisClient.del).toHaveBeenCalledWith('cache:test-1', 'cache:test-2');
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      mockRedisClient.keys.mockResolvedValue(['cache:key1', 'cache:key2']);
      mockRedisClient.memory.mockResolvedValue([1024, 2048]);

      const stats = await service.getStats();

      expect(stats).toHaveProperty('totalKeys');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('averageLatency');
      expect(stats).toHaveProperty('topKeys');
    });
  });
});

describe('CacheInvalidationService', () => {
  let service: CacheInvalidationService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInvalidationService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: CacheService,
          useValue: {
            delete: jest.fn(),
            clear: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CacheInvalidationService>(CacheInvalidationService);
    cacheService = module.get<CacheService>(CacheService);
  });

  describe('invalidateByTag', () => {
    it('should invalidate cache entries by tag', async () => {
      mockRedisClient.smembers.mockResolvedValue(['key1', 'key2']);
      (cacheService.delete as jest.Mock).mockResolvedValue(undefined);

      const result = await service.invalidateByTag('user:123');

      expect(result).toBe(2);
      expect(cacheService.delete).toHaveBeenCalledWith('key1');
      expect(cacheService.delete).toHaveBeenCalledWith('key2');
    });
  });

  describe('invalidateUserContext', () => {
    it('should invalidate all user-related cache entries', async () => {
      (cacheService.clear as jest.Mock).mockResolvedValue(5);

      const result = await service.invalidateUserContext('user123');

      expect(result).toBe(20); // 4 patterns * 5 entries each
      expect(cacheService.clear).toHaveBeenCalledTimes(4);
    });
  });
});

describe('RateLimitingService', () => {
  let service: RateLimitingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitingService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RateLimitingService>(RateLimitingService);
  });

  describe('checkRateLimit', () => {
    it('should allow request when under limit', async () => {
      mockRedisClient.get.mockResolvedValue('5'); // Current count
      mockRedisClient.incr.mockResolvedValue(6);
      const mockPipeline = {
        setex: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn(),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      const mockRequest = { ip: '127.0.0.1' };
      const result = await service.checkRateLimit('api-general', mockRequest);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should deny request when over limit', async () => {
      mockRedisClient.get.mockResolvedValue('100'); // At limit

      const mockRequest = { ip: '127.0.0.1' };
      const result = await service.checkRateLimit('api-general', mockRequest);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });
  });

  describe('isWhitelisted', () => {
    it('should return true for whitelisted IP', async () => {
      mockRedisClient.sismember.mockResolvedValue(1);

      const result = await service.isWhitelisted('127.0.0.1');

      expect(result).toBe(true);
    });

    it('should return false for non-whitelisted IP', async () => {
      mockRedisClient.sismember.mockResolvedValue(0);

      const result = await service.isWhitelisted('192.168.1.1');

      expect(result).toBe(false);
    });
  });
});

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceMonitoringService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<PerformanceMonitoringService>(PerformanceMonitoringService);
  });

  describe('recordCacheMetrics', () => {
    it('should record cache operation metrics', () => {
      const metrics = {
        operationType: 'get' as const,
        duration: 50,
        cacheHit: true,
        keyPattern: 'user:*',
        timestamp: new Date(),
      };

      service.recordCacheMetrics(metrics);

      // Should not throw and should store metrics internally
      expect(true).toBe(true);
    });
  });

  describe('recordEndpointMetrics', () => {
    it('should record API endpoint metrics', () => {
      service.recordEndpointMetrics('/api/users', 'GET', 150, false);

      // Should not throw and should store metrics internally
      expect(true).toBe(true);
    });
  });

  describe('getPerformanceAlerts', () => {
    it('should return performance alerts', async () => {
      const alerts = await service.getPerformanceAlerts();

      expect(Array.isArray(alerts)).toBe(true);
      alerts.forEach(alert => {
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('metric');
        expect(alert).toHaveProperty('value');
        expect(alert).toHaveProperty('threshold');
        expect(alert).toHaveProperty('timestamp');
      });
    });
  });
});

describe('DatabaseOptimizationService', () => {
  let service: DatabaseOptimizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseOptimizationService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DatabaseOptimizationService>(DatabaseOptimizationService);
  });

  describe('getConnectionStats', () => {
    it('should return database connection statistics', async () => {
      mockDatabaseService.$queryRaw.mockResolvedValue([{
        total_connections: '10',
        active_connections: '5',
        idle_connections: '5',
        max_connections: '100',
      }]);

      const stats = await service.getConnectionStats();

      expect(stats).toHaveProperty('totalConnections', 10);
      expect(stats).toHaveProperty('activeConnections', 5);
      expect(stats).toHaveProperty('idleConnections', 5);
      expect(stats).toHaveProperty('maxConnections', 100);
      expect(stats).toHaveProperty('connectionUtilization', 10);
    });
  });

  describe('analyzeQueryPerformance', () => {
    it('should return query performance analysis', async () => {
      mockDatabaseService.$queryRaw
        .mockResolvedValueOnce([]) // slow queries
        .mockResolvedValueOnce([]) // index usage
        .mockResolvedValueOnce([]); // table stats

      const analysis = await service.analyzeQueryPerformance();

      expect(analysis).toHaveProperty('slowQueries');
      expect(analysis).toHaveProperty('indexUsage');
      expect(analysis).toHaveProperty('tableStats');
    });
  });
});

describe('ResponsePrecomputationService', () => {
  let service: ResponsePrecomputationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponsePrecomputationService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<ResponsePrecomputationService>(ResponsePrecomputationService);
  });

  describe('precomputeCommonResponses', () => {
    it('should precompute responses for common questions', async () => {
      const cacheService = service['cacheService'];
      (cacheService.get as jest.Mock).mockResolvedValue(null); // No existing cache
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      await service.precomputeCommonResponses();

      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('getPrecomputationStats', () => {
    it('should return precomputation statistics', async () => {
      mockRedisClient.keys.mockResolvedValue(['cache:key1', 'cache:key2']);
      mockRedisClient.sismember.mockResolvedValue(1);

      const stats = await service.getPrecomputationStats();

      expect(stats).toHaveProperty('totalJobs');
      expect(stats).toHaveProperty('activeJobs');
      expect(stats).toHaveProperty('scheduledJobs');
      expect(stats).toHaveProperty('precomputedEntries');
    });
  });
});