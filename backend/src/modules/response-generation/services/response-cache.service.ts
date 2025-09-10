import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { 
  ResponseOption, 
  CacheEntry, 
  PersonalizationContext,
  QuestionClassification 
} from '../interfaces/response-generation.interface';

@Injectable()
export class ResponseCacheService {
  private readonly logger = new Logger(ResponseCacheService.name);
  private readonly redis: Redis;
  private readonly cacheEnabled: boolean;
  private readonly defaultTTL: number = 3600; // 1 hour
  private readonly maxCacheSize: number = 10000; // Maximum cache entries

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.cacheEnabled = this.configService.get<boolean>('CACHE_ENABLED', true);
    
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis cache');
    });
  }

  /**
   * Get cached responses for a question
   */
  async getCachedResponses(
    question: string,
    context: PersonalizationContext
  ): Promise<ResponseOption[] | null> {
    if (!this.cacheEnabled) return null;

    try {
      const cacheKey = this.generateCacheKey(question, context);
      const cachedData = await this.redis.get(cacheKey);
      
      if (!cachedData) return null;

      const cacheEntry: CacheEntry = JSON.parse(cachedData);
      
      // Check if cache entry is still valid
      if (new Date() > new Date(cacheEntry.expiresAt)) {
        await this.redis.del(cacheKey);
        return null;
      }

      // Update hit count
      cacheEntry.hitCount += 1;
      await this.redis.setex(
        cacheKey, 
        this.defaultTTL, 
        JSON.stringify(cacheEntry)
      );

      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return cacheEntry.responses;
    } catch (error) {
      this.logger.error('Error retrieving from cache:', error);
      return null;
    }
  }

  /**
   * Cache responses for a question
   */
  async cacheResponses(
    question: string,
    context: PersonalizationContext,
    responses: ResponseOption[],
    ttl: number = this.defaultTTL
  ): Promise<void> {
    if (!this.cacheEnabled || responses.length === 0) return;

    try {
      const cacheKey = this.generateCacheKey(question, context);
      const cacheEntry: CacheEntry = {
        key: cacheKey,
        responses,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + ttl * 1000),
        hitCount: 0
      };

      await this.redis.setex(cacheKey, ttl, JSON.stringify(cacheEntry));
      
      // Maintain cache size limit
      await this.maintainCacheSize();
      
      this.logger.debug(`Cached responses for key: ${cacheKey}`);
    } catch (error) {
      this.logger.error('Error caching responses:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
    topQuestions: Array<{ question: string; hits: number }>;
  }> {
    try {
      const keys = await this.redis.keys('response:*');
      const totalKeys = keys.length;
      
      // Get memory usage (simplified for compatibility)
      const memoryUsage = 'N/A';
      
      // Calculate hit rate and get top questions
      let totalHits = 0;
      let totalRequests = 0;
      const questionStats: Map<string, number> = new Map();
      
      for (const key of keys.slice(0, 100)) { // Sample first 100 keys
        try {
          const data = await this.redis.get(key);
          if (data) {
            const entry: CacheEntry = JSON.parse(data);
            totalHits += entry.hitCount;
            totalRequests += entry.hitCount + 1; // +1 for initial cache
            
            const questionHash = key.split(':')[1];
            questionStats.set(questionHash, entry.hitCount);
          }
        } catch (parseError) {
          // Skip invalid entries
        }
      }
      
      const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
      
      const topQuestions = Array.from(questionStats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([question, hits]) => ({ question, hits }));
      
      return {
        totalKeys,
        memoryUsage,
        hitRate: Math.round(hitRate * 100) / 100,
        topQuestions
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: '0 B',
        hitRate: 0,
        topQuestions: []
      };
    }
  }

  /**
   * Clear cache entries matching pattern
   */
  async clearCache(pattern: string = 'response:*'): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      const deletedCount = await this.redis.del(...keys);
      this.logger.log(`Cleared ${deletedCount} cache entries`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Precompute and cache responses for common questions
   */
  async precomputeCommonResponses(
    commonQuestions: Array<{
      question: string;
      context: PersonalizationContext;
      responses: ResponseOption[];
    }>
  ): Promise<void> {
    this.logger.log(`Precomputing ${commonQuestions.length} common responses`);
    
    for (const { question, context, responses } of commonQuestions) {
      await this.cacheResponses(question, context, responses, this.defaultTTL * 24); // Cache for 24 hours
    }
    
    this.logger.log('Precomputation completed');
  }

  /**
   * Invalidate cache entries for a specific user
   */
  async invalidateUserCache(userId: string): Promise<number> {
    try {
      const pattern = `response:*:user:${userId}:*`;
      return await this.clearCache(pattern);
    } catch (error) {
      this.logger.error('Error invalidating user cache:', error);
      return 0;
    }
  }

  /**
   * Generate cache key based on question and context
   */
  private generateCacheKey(question: string, context: PersonalizationContext): string {
    // Create a hash of the question and relevant context
    const questionHash = this.hashString(question.toLowerCase().trim());
    
    // Include relevant context factors that affect response generation
    const contextFactors = {
      userId: context.userProfile.userId,
      seniority: context.userProfile.seniority,
      industry: context.jobContext.industry,
      questionType: context.questionClassification?.type || 'unknown',
      communicationStyle: context.userProfile.preferences.communicationStyle,
      responseStyle: context.userProfile.preferences.preferredResponseStyle
    };
    
    const contextHash = this.hashString(JSON.stringify(contextFactors));
    
    return `response:${questionHash}:user:${context.userProfile.userId}:context:${contextHash}`;
  }

  /**
   * Simple string hashing function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Maintain cache size by removing least recently used entries
   */
  private async maintainCacheSize(): Promise<void> {
    try {
      const keys = await this.redis.keys('response:*');
      
      if (keys.length <= this.maxCacheSize) return;
      
      // Get entries with their hit counts and timestamps
      const entries: Array<{ key: string; hitCount: number; timestamp: Date }> = [];
      
      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const entry: CacheEntry = JSON.parse(data);
            entries.push({
              key,
              hitCount: entry.hitCount,
              timestamp: entry.timestamp
            });
          }
        } catch (parseError) {
          // Remove invalid entries
          await this.redis.del(key);
        }
      }
      
      // Sort by hit count (ascending) and timestamp (ascending) - remove least used and oldest
      entries.sort((a, b) => {
        if (a.hitCount !== b.hitCount) {
          return a.hitCount - b.hitCount;
        }
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      
      // Remove excess entries
      const entriesToRemove = entries.slice(0, entries.length - this.maxCacheSize);
      const keysToRemove = entriesToRemove.map(entry => entry.key);
      
      if (keysToRemove.length > 0) {
        await this.redis.del(...keysToRemove);
        this.logger.log(`Removed ${keysToRemove.length} cache entries to maintain size limit`);
      }
    } catch (error) {
      this.logger.error('Error maintaining cache size:', error);
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const keys = await this.redis.keys('response:*');
      let cleanedCount = 0;
      
      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const entry: CacheEntry = JSON.parse(data);
            if (new Date() > new Date(entry.expiresAt)) {
              await this.redis.del(key);
              cleanedCount++;
            }
          }
        } catch (parseError) {
          // Remove invalid entries
          await this.redis.del(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} expired cache entries`);
      }
      
      return cleanedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired entries:', error);
      return 0;
    }
  }
}