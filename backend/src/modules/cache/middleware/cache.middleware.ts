import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cache.service';
import { PerformanceMonitoringService } from '../services/performance-monitoring.service';
import * as crypto from 'crypto';

interface CacheableRequest extends Request {
  cacheKey?: string;
  cacheTTL?: number;
  skipCache?: boolean;
}

@Injectable()
export class CacheMiddleware implements NestMiddleware {
  constructor(
    private readonly cacheService: CacheService,
    private readonly performanceService: PerformanceMonitoringService,
  ) {}

  async use(req: CacheableRequest, res: Response, next: NextFunction) {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for certain endpoints
    if (this.shouldSkipCache(req)) {
      req.skipCache = true;
      return next();
    }

    const cacheKey = this.generateCacheKey(req);
    const cacheTTL = this.determineCacheTTL(req);
    
    req.cacheKey = cacheKey;
    req.cacheTTL = cacheTTL;

    try {
      // Try to get cached response
      const cachedResponse = await this.cacheService.get(cacheKey);
      
      if (cachedResponse) {
        // Record cache hit
        this.performanceService.recordCacheMetrics({
          operationType: 'get',
          duration: 0,
          cacheHit: true,
          keyPattern: this.getKeyPattern(req.path),
          timestamp: new Date(),
          metadata: { source: 'middleware' },
        });

        // Set cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `max-age=${cacheTTL}`,
        });

        return res.json(cachedResponse);
      }

      // Cache miss - continue to controller
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Override response methods to cache the result
      res.send = function(body) {
        if (res.statusCode === 200 && !req.skipCache) {
          // Cache the response asynchronously
          setImmediate(async () => {
            try {
              const responseData = typeof body === 'string' ? JSON.parse(body) : body;
              await cacheService.set(cacheKey, responseData, cacheTTL, [
                'api-response',
                `endpoint:${req.path}`,
                `method:${req.method}`,
              ]);
            } catch (error) {
              // Don't fail the request if caching fails
              console.error('Failed to cache response:', error);
            }
          });
        }

        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `max-age=${cacheTTL}`,
        });

        return originalSend.call(this, body);
      };

      res.json = function(body) {
        if (res.statusCode === 200 && !req.skipCache) {
          // Cache the response asynchronously
          setImmediate(async () => {
            try {
              await cacheService.set(cacheKey, body, cacheTTL, [
                'api-response',
                `endpoint:${req.path}`,
                `method:${req.method}`,
              ]);
            } catch (error) {
              // Don't fail the request if caching fails
              console.error('Failed to cache response:', error);
            }
          });
        }

        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `max-age=${cacheTTL}`,
        });

        return originalJson.call(this, body);
      };

      // Record cache miss
      this.performanceService.recordCacheMetrics({
        operationType: 'get',
        duration: 0,
        cacheHit: false,
        keyPattern: this.getKeyPattern(req.path),
        timestamp: new Date(),
        metadata: { source: 'middleware' },
      });

      next();

    } catch (error) {
      // Don't fail the request if cache check fails
      console.error('Cache middleware error:', error);
      next();
    }
  }

  private shouldSkipCache(req: Request): boolean {
    const path = req.path;
    
    // Skip caching for these endpoints
    const skipPatterns = [
      '/api/cache/',
      '/api/auth/',
      '/api/websocket/',
      '/health',
      '/metrics',
    ];

    return skipPatterns.some(pattern => path.startsWith(pattern));
  }

  private generateCacheKey(req: Request): string {
    const baseKey = `${req.method}:${req.path}`;
    
    // Include query parameters in cache key
    const queryString = Object.keys(req.query)
      .sort()
      .map(key => `${key}=${req.query[key]}`)
      .join('&');
    
    // Include user ID if authenticated (for user-specific caching)
    const userId = (req as any).user?.id || 'anonymous';
    
    const fullKey = `${baseKey}:${queryString}:${userId}`;
    
    // Hash the key to keep it manageable
    return `api:${crypto.createHash('md5').update(fullKey).digest('hex')}`;
  }

  private determineCacheTTL(req: Request): number {
    const path = req.path;
    
    // Different TTLs for different endpoints
    if (path.startsWith('/api/users/profile')) {
      return 300; // 5 minutes for user profiles
    }
    
    if (path.startsWith('/api/questions/bank')) {
      return 3600; // 1 hour for question bank
    }
    
    if (path.startsWith('/api/practice/analytics')) {
      return 600; // 10 minutes for analytics
    }
    
    if (path.startsWith('/api/context/')) {
      return 1800; // 30 minutes for context data
    }
    
    // Default TTL
    return 300; // 5 minutes
  }

  private getKeyPattern(path: string): string {
    // Extract pattern from path for metrics
    return path.replace(/\/[a-f0-9-]{36}/g, '/:id') // Replace UUIDs
               .replace(/\/\d+/g, '/:id'); // Replace numeric IDs
  }
}