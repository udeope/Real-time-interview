import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../config/redis.config';
import { InvalidationStrategy } from '../interfaces/cache.interface';
import { CacheService } from './cache.service';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);
  private readonly dependencyGraph = new Map<string, Set<string>>();

  constructor(
    private readonly redisService: RedisService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Invalidate cache entries by tag
   */
  async invalidateByTag(tag: string, cascade: boolean = false): Promise<number> {
    try {
      const redis = this.redisService.getClient();
      const tagKey = `tags:${tag}`;
      const keys = await redis.sMembers(tagKey);

      if (keys.length === 0) {
        this.logger.debug(`No cache entries found for tag: ${tag}`);
        return 0;
      }

      let invalidatedCount = 0;

      // Invalidate all keys with this tag
      for (const key of keys) {
        await this.cacheService.delete(key);
        invalidatedCount++;

        // Handle cascading invalidation
        if (cascade) {
          const dependentKeys = this.dependencyGraph.get(key);
          if (dependentKeys) {
            for (const dependentKey of dependentKeys) {
              await this.cacheService.delete(dependentKey);
              invalidatedCount++;
            }
          }
        }
      }

      // Remove the tag set
      await redis.del(tagKey);

      this.logger.log(`Invalidated ${invalidatedCount} cache entries for tag: ${tag}`);
      return invalidatedCount;
    } catch (error) {
      this.logger.error(`Error invalidating cache by tag ${tag}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const invalidatedCount = await this.cacheService.clear(pattern);
      this.logger.log(`Invalidated ${invalidatedCount} cache entries matching pattern: ${pattern}`);
      return invalidatedCount;
    } catch (error) {
      this.logger.error(`Error invalidating cache by pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache entries by time (older than specified time)
   */
  async invalidateByTime(olderThanMs: number): Promise<number> {
    try {
      const redis = this.redisService.getClient();
      const keys = await redis.keys('cache:*');
      const cutoffTime = new Date(Date.now() - olderThanMs);
      let invalidatedCount = 0;

      for (const key of keys) {
        try {
          const rawData = await redis.get(key);
          if (!rawData) continue;

          let data: string;
          if (rawData.startsWith('gzip:')) {
            const zlib = require('zlib');
            const compressedData = Buffer.from(rawData.slice(5), 'base64');
            const decompressed = await zlib.gunzip(compressedData);
            data = decompressed.toString();
          } else {
            data = rawData;
          }

          const cacheEntry = JSON.parse(data);
          const entryTime = new Date(cacheEntry.timestamp);

          if (entryTime < cutoffTime) {
            await this.cacheService.delete(key.replace('cache:', ''));
            invalidatedCount++;
          }
        } catch (parseError) {
          // Remove invalid entries
          await redis.del(key);
          invalidatedCount++;
        }
      }

      this.logger.log(`Invalidated ${invalidatedCount} cache entries older than ${olderThanMs}ms`);
      return invalidatedCount;
    } catch (error) {
      this.logger.error(`Error invalidating cache by time:`, error);
      return 0;
    }
  }

  /**
   * Smart invalidation based on user context changes
   */
  async invalidateUserContext(userId: string): Promise<number> {
    const patterns = [
      `user:${userId}:*`,
      `profile:${userId}:*`,
      `context:${userId}:*`,
      `responses:*:user:${userId}:*`,
      `session:${userId}:*`,
    ];

    let totalInvalidated = 0;

    for (const pattern of patterns) {
      const count = await this.invalidateByPattern(pattern);
      totalInvalidated += count;
    }

    this.logger.log(`Invalidated ${totalInvalidated} cache entries for user: ${userId}`);
    return totalInvalidated;
  }

  /**
   * Invalidate session-related cache
   */
  async invalidateSession(sessionId: string): Promise<number> {
    const patterns = [
      `session:${sessionId}:*`,
      `transcription:${sessionId}:*`,
      `responses:${sessionId}:*`,
      `context:*:session:${sessionId}:*`,
    ];

    let totalInvalidated = 0;

    for (const pattern of patterns) {
      const count = await this.invalidateByPattern(pattern);
      totalInvalidated += count;
    }

    this.logger.log(`Invalidated ${totalInvalidated} cache entries for session: ${sessionId}`);
    return totalInvalidated;
  }

  /**
   * Invalidate response cache when user profile changes
   */
  async invalidateResponseCache(userId: string, jobContext?: any): Promise<number> {
    let patterns = [
      `responses:*:user:${userId}:*`,
      `context:${userId}:*`,
    ];

    if (jobContext) {
      patterns.push(`responses:*:job:${jobContext.id || jobContext.title}:*`);
    }

    let totalInvalidated = 0;

    for (const pattern of patterns) {
      const count = await this.invalidateByPattern(pattern);
      totalInvalidated += count;
    }

    this.logger.log(`Invalidated ${totalInvalidated} response cache entries for user: ${userId}`);
    return totalInvalidated;
  }

  /**
   * Register cache dependency
   */
  registerDependency(parentKey: string, dependentKey: string): void {
    if (!this.dependencyGraph.has(parentKey)) {
      this.dependencyGraph.set(parentKey, new Set());
    }
    this.dependencyGraph.get(parentKey)!.add(dependentKey);
  }

  /**
   * Remove cache dependency
   */
  removeDependency(parentKey: string, dependentKey: string): void {
    const dependencies = this.dependencyGraph.get(parentKey);
    if (dependencies) {
      dependencies.delete(dependentKey);
      if (dependencies.size === 0) {
        this.dependencyGraph.delete(parentKey);
      }
    }
  }

  /**
   * Execute invalidation strategy
   */
  async executeStrategy(strategy: InvalidationStrategy): Promise<number> {
    switch (strategy.type) {
      case 'tag':
        return await this.invalidateByTag(strategy.value as string, strategy.cascade);
      
      case 'pattern':
        return await this.invalidateByPattern(strategy.value as string);
      
      case 'time':
        return await this.invalidateByTime(strategy.value as number);
      
      case 'dependency':
        // Handle dependency-based invalidation
        const dependentKeys = this.dependencyGraph.get(strategy.value as string);
        if (dependentKeys) {
          let count = 0;
          for (const key of dependentKeys) {
            await this.cacheService.delete(key);
            count++;
          }
          return count;
        }
        return 0;
      
      default:
        this.logger.warn(`Unknown invalidation strategy type: ${strategy.type}`);
        return 0;
    }
  }

  /**
   * Batch invalidation with multiple strategies
   */
  async batchInvalidate(strategies: InvalidationStrategy[]): Promise<number> {
    let totalInvalidated = 0;

    for (const strategy of strategies) {
      const count = await this.executeStrategy(strategy);
      totalInvalidated += count;
    }

    this.logger.log(`Batch invalidation completed: ${totalInvalidated} entries invalidated`);
    return totalInvalidated;
  }

  /**
   * Schedule automatic invalidation
   */
  scheduleInvalidation(
    strategy: InvalidationStrategy,
    intervalMs: number
  ): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        await this.executeStrategy(strategy);
      } catch (error) {
        this.logger.error('Error in scheduled invalidation:', error);
      }
    }, intervalMs);
  }

  /**
   * Get invalidation statistics
   */
  async getInvalidationStats(): Promise<{
    totalDependencies: number;
    dependencyGraph: Record<string, string[]>;
    recentInvalidations: Array<{
      strategy: string;
      count: number;
      timestamp: Date;
    }>;
  }> {
    const dependencyGraph: Record<string, string[]> = {};
    
    for (const [key, dependencies] of this.dependencyGraph.entries()) {
      dependencyGraph[key] = Array.from(dependencies);
    }

    return {
      totalDependencies: this.dependencyGraph.size,
      dependencyGraph,
      recentInvalidations: [], // Could be implemented with a buffer similar to metrics
    };
  }
}