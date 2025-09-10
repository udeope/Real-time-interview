import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../config/database.config';
import { RedisService } from '../config/redis.config';

@Injectable()
export abstract class BaseRepository<T> {
  constructor(
    protected readonly db: DatabaseService,
    protected readonly redis: RedisService,
  ) {}

  // Cache utilities for repositories
  protected async getCached<K>(key: string): Promise<K | null> {
    return await this.redis.get<K>(key);
  }

  protected async setCached(key: string, value: any, ttlSeconds?: number): Promise<void> {
    await this.redis.set(key, value, ttlSeconds);
  }

  protected async deleteCached(key: string): Promise<void> {
    await this.redis.del(key);
  }

  protected async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => this.redis.del(key)));
    }
  }

  // Common cache key generators
  protected getCacheKey(prefix: string, id: string): string {
    return `${prefix}:${id}`;
  }

  protected getListCacheKey(prefix: string, filters?: Record<string, any>): string {
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    return `${prefix}:list:${Buffer.from(filterStr).toString('base64')}`;
  }

  // Transaction wrapper
  protected async withTransaction<R>(
    callback: (tx: DatabaseService) => Promise<R>
  ): Promise<R> {
    return await this.db.$transaction(async (tx) => {
      return await callback(tx as DatabaseService);
    });
  }

  // Common CRUD operations that can be overridden
  abstract findById(id: string): Promise<T | null>;
  abstract create(data: any): Promise<T>;
  abstract update(id: string, data: any): Promise<T>;
  abstract delete(id: string): Promise<void>;
}