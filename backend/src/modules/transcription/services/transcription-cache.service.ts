import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ITranscriptionCache, TranscriptionResult, CacheStats } from '../interfaces/transcription.interface';
import { DatabaseService } from '../../../config/database.config';
import * as crypto from 'crypto';

@Injectable()
export class TranscriptionCacheService implements ITranscriptionCache {
  private readonly logger = new Logger(TranscriptionCacheService.name);
  private readonly redis: Redis;
  private readonly defaultTTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly cachePrefix = 'transcription:';
  private readonly statsKey = 'transcription:stats';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: DatabaseService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for transcription cache');
    });
  }

  async get(audioHash: string): Promise<TranscriptionResult | null> {
    try {
      const cacheKey = this.getCacheKey(audioHash);
      
      // Try Redis first
      const cachedResult = await this.redis.get(cacheKey);
      if (cachedResult) {
        await this.incrementStats('hit');
        const result = JSON.parse(cachedResult) as TranscriptionResult;
        
        // Update last used timestamp in database
        await this.updateCacheUsage(audioHash);
        
        return result;
      }

      // Try database cache
      const dbResult = await this.prisma.transcriptionCache.findUnique({
        where: { audioHash },
      });

      if (dbResult) {
        await this.incrementStats('hit');
        
        // Store in Redis for faster access next time
        const transcriptionResult: TranscriptionResult = {
          id: crypto.randomUUID(),
          sessionId: '',
          audioChunkId: '',
          text: dbResult.text,
          confidence: Number(dbResult.confidence),
          isFinal: true,
          provider: dbResult.provider as 'google' | 'whisper',
          language: dbResult.language,
          metadata: dbResult.metadata as any,
          createdAt: dbResult.createdAt,
        };

        await this.redis.setex(cacheKey, this.defaultTTL, JSON.stringify(transcriptionResult));
        await this.updateCacheUsage(audioHash);

        return transcriptionResult;
      }

      await this.incrementStats('miss');
      return null;
    } catch (error) {
      this.logger.error('Error getting transcription from cache', error);
      await this.incrementStats('miss');
      return null;
    }
  }

  async set(audioHash: string, result: TranscriptionResult, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(audioHash);
      const cacheTTL = ttl || this.defaultTTL;

      // Store in Redis
      await this.redis.setex(cacheKey, cacheTTL, JSON.stringify(result));

      // Store in database for persistence
      await this.prisma.transcriptionCache.upsert({
        where: { audioHash },
        update: {
          text: result.text,
          confidence: result.confidence,
          provider: result.provider,
          language: result.language,
          metadata: result.metadata || null,
          hitCount: { increment: 1 },
          lastUsed: new Date(),
        },
        create: {
          audioHash,
          text: result.text,
          confidence: result.confidence,
          provider: result.provider,
          language: result.language,
          metadata: result.metadata || null,
          hitCount: 1,
          lastUsed: new Date(),
        },
      });

      this.logger.debug(`Cached transcription for hash: ${audioHash}`);
    } catch (error) {
      this.logger.error('Error setting transcription cache', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.cachePrefix}${pattern}`);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error('Error invalidating cache', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const stats = await this.redis.hmget(this.statsKey, 'hits', 'misses');
      const hits = parseInt(stats[0] || '0', 10);
      const misses = parseInt(stats[1] || '0', 10);
      const totalRequests = hits + misses;
      const hitRate = totalRequests > 0 ? hits / totalRequests : 0;

      // Get cache size from Redis
      const cacheKeys = await this.redis.keys(`${this.cachePrefix}*`);
      const cacheSize = cacheKeys.length;

      return {
        hitCount: hits,
        missCount: misses,
        hitRate,
        totalRequests,
        cacheSize,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats', error);
      return {
        hitCount: 0,
        missCount: 0,
        hitRate: 0,
        totalRequests: 0,
        cacheSize: 0,
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up old entries from database
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Remove entries older than 30 days

      const result = await this.prisma.transcriptionCache.deleteMany({
        where: {
          lastUsed: {
            lt: cutoffDate,
          },
          hitCount: {
            lt: 5, // Only delete entries that haven't been used much
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old cache entries`);

      // Clean up Redis cache (Redis handles TTL automatically, but we can force cleanup)
      const keys = await this.redis.keys(`${this.cachePrefix}*`);
      const expiredKeys: string[] = [];

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // No TTL set
          await this.redis.expire(key, this.defaultTTL);
        } else if (ttl === -2) { // Key doesn't exist
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        this.logger.debug(`Found ${expiredKeys.length} expired keys in Redis cache`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up cache', error);
    }
  }

  async generateAudioHash(audioData: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(audioData).digest('hex');
  }

  async precomputeCommonTranscriptions(): Promise<void> {
    try {
      // This could be used to precompute transcriptions for common phrases
      // or frequently asked interview questions
      const commonPhrases = [
        'Tell me about yourself',
        'What are your strengths?',
        'What are your weaknesses?',
        'Why do you want to work here?',
        'Where do you see yourself in five years?',
      ];

      this.logger.log('Precomputation of common transcriptions would be implemented here');
      // Implementation would involve generating audio for these phrases
      // and caching their transcriptions
    } catch (error) {
      this.logger.error('Error precomputing common transcriptions', error);
    }
  }

  private getCacheKey(audioHash: string): string {
    return `${this.cachePrefix}${audioHash}`;
  }

  private async incrementStats(type: 'hit' | 'miss'): Promise<void> {
    try {
      await this.redis.hincrby(this.statsKey, type === 'hit' ? 'hits' : 'misses', 1);
    } catch (error) {
      this.logger.error('Error incrementing cache stats', error);
    }
  }

  private async updateCacheUsage(audioHash: string): Promise<void> {
    try {
      await this.prisma.transcriptionCache.update({
        where: { audioHash },
        data: {
          hitCount: { increment: 1 },
          lastUsed: new Date(),
        },
      });
    } catch (error) {
      // Don't throw error for cache usage updates
      this.logger.debug('Could not update cache usage stats', error);
    }
  }
}