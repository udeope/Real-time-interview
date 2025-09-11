import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../config/redis.config';
import { 
  CacheEntry, 
  CacheStats, 
  CacheConfig, 
  PerformanceMetrics 
} from '../interfaces/cache.interface';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private readonly config: CacheConfig;
  private readonly metricsBuffer: PerformanceMetrics[] = [];
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      defaultTTL: this.configService.get<number>('CACHE_DEFAULT_TTL', 3600),
      maxCacheSize: this.configService.get<number>('CACHE_MAX_SIZE', 50000),
      enableCompression: this.configService.get<boolean>('CACHE_ENABLE_COMPRESSION', true),
      enableMetrics: this.configService.get<boolean>('CACHE_ENABLE_METRICS', true),
      cleanupInterval: this.configService.get<number>('CACHE_CLEANUP_INTERVAL', 300000), // 5 minutes
    };
  }

  async onModuleInit() {
    // Start periodic cleanup
    this.cleanupInterval = setInterval(
      () => this.performCleanup(),
      this.config.cleanupInterval
    );

    this.logger.log('Cache service initialized with config:', this.config);
  }

  /**
   * Enhanced get method with performance tracking
   */
  async get<T>(key: string, tags?: string[]): Promise<T | null> {
    const startTime = Date.now();
    let cacheHit = false;

    try {
      const redis = this.redisService.getClient();
      const rawData = await redis.get(this.formatKey(key));

      if (!rawData) {
        this.recordMetrics('get', Date.now() - startTime, false, key);
        return null;
      }

      cacheHit = true;
      let data: string;

      // Handle compression
      if (this.config.enableCompression && rawData.startsWith('gzip:')) {
        const compressedData = Buffer.from(rawData.slice(5), 'base64');
        const decompressed = await gunzip(compressedData);
        data = decompressed.toString();
      } else {
        data = rawData;
      }

      const cacheEntry: CacheEntry<T> = JSON.parse(data);

      // Check expiration
      if (new Date() > new Date(cacheEntry.expiresAt)) {
        await this.delete(key);
        this.recordMetrics('get', Date.now() - startTime, false, key);
        return null;
      }

      // Update hit count and last access
      cacheEntry.hitCount += 1;
      await this.updateCacheEntry(key, cacheEntry);

      this.recordMetrics('get', Date.now() - startTime, true, key);
      return cacheEntry.data;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      this.recordMetrics('get', Date.now() - startTime, cacheHit, key, { error: error.message });
      return null;
    }
  }

  /**
   * Enhanced set method with compression and intelligent TTL
   */
  async set<T>(
    key: string, 
    data: T, 
    ttl?: number, 
    tags?: string[]
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const redis = this.redisService.getClient();
      const effectiveTTL = ttl || this.config.defaultTTL;
      
      const cacheEntry: CacheEntry<T> = {
        key,
        data,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + effectiveTTL * 1000),
        hitCount: 0,
        tags: tags || [],
        metadata: {
          size: JSON.stringify(data).length,
          compressed: false,
        },
      };

      let serializedData = JSON.stringify(cacheEntry);

      // Apply compression for large data
      if (this.config.enableCompression && serializedData.length > 1024) {
        const compressed = await gzip(Buffer.from(serializedData));
        serializedData = 'gzip:' + compressed.toString('base64');
        cacheEntry.metadata.compressed = true;
        cacheEntry.metadata.originalSize = serializedData.length;
        cacheEntry.metadata.compressedSize = compressed.length;
      }

      await redis.setEx(this.formatKey(key), effectiveTTL, serializedData);

      // Store tags for invalidation
      if (tags && tags.length > 0) {
        await this.storeTags(key, tags);
      }

      // Maintain cache size
      await this.maintainCacheSize();

      this.recordMetrics('set', Date.now() - startTime, false, key, {
        dataSize: cacheEntry.metadata.size,
        compressed: cacheEntry.metadata.compressed,
      });

      this.logger.debug(`Cached key: ${key} with TTL: ${effectiveTTL}s`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
      this.recordMetrics('set', Date.now() - startTime, false, key, { error: error.message });
      throw error;
    }
  }

  /**
   * Multi-get operation for batch retrieval
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const startTime = Date.now();
    const results = new Map<string, T | null>();

    try {
      const redis = this.redisService.getClient();
      const formattedKeys = keys.map(key => this.formatKey(key));
      const rawResults = await redis.mGet(formattedKeys);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const rawData = rawResults[i];

        if (!rawData) {
          results.set(key, null);
          continue;
        }

        try {
          let data: string;

          if (this.config.enableCompression && rawData.startsWith('gzip:')) {
            const compressedData = Buffer.from(rawData.slice(5), 'base64');
            const decompressed = await gunzip(compressedData);
            data = decompressed.toString();
          } else {
            data = rawData;
          }

          const cacheEntry: CacheEntry<T> = JSON.parse(data);

          if (new Date() > new Date(cacheEntry.expiresAt)) {
            results.set(key, null);
            await this.delete(key);
          } else {
            results.set(key, cacheEntry.data);
          }
        } catch (parseError) {
          this.logger.warn(`Failed to parse cache entry for key ${key}:`, parseError);
          results.set(key, null);
        }
      }

      this.recordMetrics('get', Date.now() - startTime, true, `batch:${keys.length}`, {
        batchSize: keys.length,
      });

      return results;
    } catch (error) {
      this.logger.error('Error in batch get operation:', error);
      keys.forEach(key => results.set(key, null));
      return results;
    }
  }

  /**
   * Multi-set operation for batch storage
   */
  async mset<T>(entries: Array<{ key: string; data: T; ttl?: number; tags?: string[] }>): Promise<void> {
    const startTime = Date.now();

    try {
      // Process entries sequentially for simplicity
      for (const entry of entries) {
        await this.set(entry.key, entry.data, entry.ttl, entry.tags);
      }

      this.recordMetrics('set', Date.now() - startTime, false, `batch:${entries.length}`, {
        batchSize: entries.length,
      });

      this.logger.debug(`Batch cached ${entries.length} entries`);
    } catch (error) {
      this.logger.error('Error in batch set operation:', error);
      throw error;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    const startTime = Date.now();

    try {
      const redis = this.redisService.getClient();
      await redis.del(this.formatKey(key));
      await this.removeTags(key);

      this.recordMetrics('delete', Date.now() - startTime, false, key);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const redis = this.redisService.getClient();
      const keys = await redis.keys(this.formatKey('*'));
      const totalKeys = keys.length;

      // Get memory usage (simplified)
      const memoryUsage = totalKeys * 1024; // Rough estimate

      // Calculate hit/miss rates from metrics
      const recentMetrics = this.metricsBuffer.slice(-1000); // Last 1000 operations
      const hits = recentMetrics.filter(m => m.cacheHit).length;
      const misses = recentMetrics.filter(m => !m.cacheHit && m.operationType === 'get').length;
      const total = hits + misses;

      const hitRate = total > 0 ? (hits / total) * 100 : 0;
      const missRate = total > 0 ? (misses / total) * 100 : 0;

      // Get top keys by hit count
      const topKeys: Array<{ key: string; hits: number }> = [];
      const sampleKeys = keys.slice(0, 100); // Sample for performance

      for (const key of sampleKeys) {
        try {
          const rawData = await redis.get(key);
          if (rawData) {
            let data: string;
            if (this.config.enableCompression && rawData.startsWith('gzip:')) {
              const compressedData = Buffer.from(rawData.slice(5), 'base64');
              const decompressed = await gunzip(compressedData);
              data = decompressed.toString();
            } else {
              data = rawData;
            }

            const cacheEntry: CacheEntry = JSON.parse(data);
            topKeys.push({ key: key.replace('cache:', ''), hits: cacheEntry.hitCount });
          }
        } catch (parseError) {
          // Skip invalid entries
        }
      }

      topKeys.sort((a, b) => b.hits - a.hits);

      const averageLatency = recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length 
        : 0;

      return {
        totalKeys,
        memoryUsage,
        hitRate: Math.round(hitRate * 100) / 100,
        missRate: Math.round(missRate * 100) / 100,
        totalHits: hits,
        totalMisses: misses,
        averageLatency: Math.round(averageLatency * 100) / 100,
        topKeys: topKeys.slice(0, 10),
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 0,
        hitRate: 0,
        missRate: 0,
        totalHits: 0,
        totalMisses: 0,
        averageLatency: 0,
        topKeys: [],
      };
    }
  }

  /**
   * Clear cache with pattern matching
   */
  async clear(pattern: string = '*'): Promise<number> {
    const startTime = Date.now();

    try {
      const redis = this.redisService.getClient();
      const keys = await redis.keys(this.formatKey(pattern));
      
      if (keys.length === 0) return 0;

      // Delete keys in batches to avoid blocking Redis
      const batchSize = 100;
      let deletedCount = 0;

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const result = await redis.del(batch);
        deletedCount += result;
      }
      
      // Clear associated tags
      for (const key of keys) {
        await this.removeTags(key.replace('cache:', ''));
      }

      this.recordMetrics('delete', Date.now() - startTime, false, `pattern:${pattern}`, {
        deletedCount,
      });

      this.logger.log(`Cleared ${deletedCount} cache entries matching pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Error clearing cache with pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Warm up cache with precomputed data
   */
  async warmup(entries: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    this.logger.log(`Warming up cache with ${entries.length} entries`);
    
    const batchSize = 100;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      await this.mset(batch);
    }

    this.logger.log('Cache warmup completed');
  }

  private formatKey(key: string): string {
    return `cache:${key}`;
  }

  private async updateCacheEntry<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const ttl = await redis.ttl(this.formatKey(key));
      
      if (ttl > 0) {
        let serializedData = JSON.stringify(entry);
        
        if (this.config.enableCompression && serializedData.length > 1024) {
          const compressed = await gzip(Buffer.from(serializedData));
          serializedData = 'gzip:' + compressed.toString('base64');
        }

        await redis.setEx(this.formatKey(key), ttl, serializedData);
      }
    } catch (error) {
      this.logger.warn(`Failed to update cache entry for key ${key}:`, error);
    }
  }

  private async storeTags(key: string, tags: string[]): Promise<void> {
    try {
      const redis = this.redisService.getClient();

      for (const tag of tags) {
        await redis.sAdd(`tags:${tag}`, key);
        await redis.expire(`tags:${tag}`, this.config.defaultTTL * 2); // Tags live longer
      }
    } catch (error) {
      this.logger.warn(`Failed to store tags for key ${key}:`, error);
    }
  }

  private async removeTags(key: string): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const tagKeys = await redis.keys('tags:*');
      
      for (const tagKey of tagKeys) {
        await redis.sRem(tagKey, key);
      }
    } catch (error) {
      this.logger.warn(`Failed to remove tags for key ${key}:`, error);
    }
  }

  private async maintainCacheSize(): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const keys = await redis.keys(this.formatKey('*'));

      if (keys.length <= this.config.maxCacheSize) return;

      // Get entries with metadata for LRU eviction
      const entries: Array<{ key: string; hitCount: number; timestamp: Date }> = [];

      for (const key of keys.slice(0, Math.min(keys.length, 1000))) { // Sample for performance
        try {
          const rawData = await redis.get(key);
          if (rawData) {
            let data: string;
            if (this.config.enableCompression && rawData.startsWith('gzip:')) {
              const compressedData = Buffer.from(rawData.slice(5), 'base64');
              const decompressed = await gunzip(compressedData);
              data = decompressed.toString();
            } else {
              data = rawData;
            }

            const cacheEntry: CacheEntry = JSON.parse(data);
            entries.push({
              key,
              hitCount: cacheEntry.hitCount,
              timestamp: cacheEntry.timestamp,
            });
          }
        } catch (parseError) {
          // Remove invalid entries
          await redis.del(key);
        }
      }

      // Sort by hit count (ascending) and timestamp (ascending) - remove least used
      entries.sort((a, b) => {
        if (a.hitCount !== b.hitCount) {
          return a.hitCount - b.hitCount;
        }
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

      const entriesToRemove = entries.slice(0, entries.length - this.config.maxCacheSize);
      const keysToRemove = entriesToRemove.map(entry => entry.key);

      if (keysToRemove.length > 0) {
        await redis.del(keysToRemove);
        this.logger.log(`Evicted ${keysToRemove.length} cache entries to maintain size limit`);
      }
    } catch (error) {
      this.logger.error('Error maintaining cache size:', error);
    }
  }

  private recordMetrics(
    operationType: 'get' | 'set' | 'delete',
    duration: number,
    cacheHit: boolean,
    keyPattern: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enableMetrics) return;

    const metric: PerformanceMetrics = {
      operationType,
      duration,
      cacheHit,
      keyPattern,
      timestamp: new Date(),
      metadata,
    };

    this.metricsBuffer.push(metric);

    // Keep buffer size manageable
    if (this.metricsBuffer.length > 10000) {
      this.metricsBuffer.splice(0, 5000); // Remove oldest half
    }
  }

  private async performCleanup(): Promise<void> {
    try {
      this.logger.debug('Performing cache cleanup');
      
      // Clean expired entries
      const redis = this.redisService.getClient();
      const keys = await redis.keys(this.formatKey('*'));
      let cleanedCount = 0;

      for (const key of keys) {
        try {
          const ttl = await redis.ttl(key);
          if (ttl === -2) { // Key doesn't exist
            cleanedCount++;
          } else if (ttl === -1) { // No expiration set
            await redis.expire(key, this.config.defaultTTL);
          }
        } catch (error) {
          // Skip problematic keys
        }
      }

      // Clean up orphaned tags
      const tagKeys = await redis.keys('tags:*');
      for (const tagKey of tagKeys) {
        const members = await redis.sMembers(tagKey);
        const validMembers = [];

        for (const member of members) {
          const exists = await redis.exists(this.formatKey(member));
          if (exists) {
            validMembers.push(member);
          }
        }

        if (validMembers.length === 0) {
          await redis.del(tagKey);
        } else if (validMembers.length < members.length) {
          await redis.del(tagKey);
          if (validMembers.length > 0) {
            await redis.sAdd(tagKey, validMembers);
          }
        }
      }

      if (cleanedCount > 0) {
        this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
      }
    } catch (error) {
      this.logger.error('Error during cache cleanup:', error);
    }
  }
}