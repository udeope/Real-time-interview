import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../config/redis.config';
import { RateLimitConfig } from '../interfaces/cache.interface';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

interface RateLimitRule {
  id: string;
  pattern: string;
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  enabled: boolean;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  private readonly rules = new Map<string, RateLimitRule>();
  private readonly enabled: boolean;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('RATE_LIMITING_ENABLED', true);
    this.initializeDefaultRules();
  }

  /**
   * Check if request is within rate limit
   */
  async checkRateLimit(
    ruleId: string,
    request: any,
    increment: boolean = true
  ): Promise<RateLimitResult> {
    if (!this.enabled) {
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: new Date(Date.now() + 3600000),
      };
    }

    const rule = this.rules.get(ruleId);
    if (!rule || !rule.enabled) {
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: new Date(Date.now() + 3600000),
      };
    }

    try {
      const key = this.generateRateLimitKey(ruleId, rule.keyGenerator(request));
      const windowStart = Math.floor(Date.now() / rule.windowMs) * rule.windowMs;
      const windowEnd = windowStart + rule.windowMs;

      const redis = this.redisService.getClient();
      
      // Get current count
      const currentCount = await redis.get(key);
      const count = currentCount ? parseInt(currentCount, 10) : 0;

      if (count >= rule.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(windowEnd),
          retryAfter: Math.ceil((windowEnd - Date.now()) / 1000),
        };
      }

      // Increment counter if requested
      if (increment) {
        const pipeline = redis.pipeline();
        pipeline.incr(key);
        pipeline.expire(key, Math.ceil(rule.windowMs / 1000));
        await pipeline.exec();
      }

      return {
        allowed: true,
        remaining: rule.maxRequests - count - (increment ? 1 : 0),
        resetTime: new Date(windowEnd),
      };
    } catch (error) {
      this.logger.error(`Error checking rate limit for rule ${ruleId}:`, error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: 0,
        resetTime: new Date(Date.now() + 3600000),
      };
    }
  }

  /**
   * Register a new rate limiting rule
   */
  registerRule(rule: RateLimitRule): void {
    this.rules.set(rule.id, rule);
    this.logger.debug(`Registered rate limiting rule: ${rule.id}`);
  }

  /**
   * Update an existing rate limiting rule
   */
  updateRule(ruleId: string, updates: Partial<RateLimitRule>): void {
    const existing = this.rules.get(ruleId);
    if (existing) {
      this.rules.set(ruleId, { ...existing, ...updates });
      this.logger.debug(`Updated rate limiting rule: ${ruleId}`);
    }
  }

  /**
   * Remove a rate limiting rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.logger.debug(`Removed rate limiting rule: ${ruleId}`);
  }

  /**
   * Get all rate limiting rules
   */
  getRules(): RateLimitRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Enable or disable a specific rule
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.logger.debug(`${enabled ? 'Enabled' : 'Disabled'} rate limiting rule: ${ruleId}`);
    }
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats(): Promise<{
    totalRules: number;
    activeRules: number;
    recentBlocks: Array<{
      ruleId: string;
      key: string;
      blockedAt: Date;
      retryAfter: number;
    }>;
    topBlockedKeys: Array<{
      key: string;
      blockCount: number;
      lastBlocked: Date;
    }>;
  }> {
    try {
      const redis = this.redisService.getClient();
      const totalRules = this.rules.size;
      const activeRules = Array.from(this.rules.values()).filter(r => r.enabled).length;

      // Get recent blocks (this would require storing block events)
      const recentBlocks = await this.getRecentBlocks();
      
      // Get top blocked keys
      const topBlockedKeys = await this.getTopBlockedKeys();

      return {
        totalRules,
        activeRules,
        recentBlocks,
        topBlockedKeys,
      };
    } catch (error) {
      this.logger.error('Error getting rate limit stats:', error);
      return {
        totalRules: this.rules.size,
        activeRules: 0,
        recentBlocks: [],
        topBlockedKeys: [],
      };
    }
  }

  /**
   * Clear rate limit for a specific key
   */
  async clearRateLimit(ruleId: string, key: string): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const rateLimitKey = this.generateRateLimitKey(ruleId, key);
      await redis.del(rateLimitKey);
      this.logger.debug(`Cleared rate limit for key: ${rateLimitKey}`);
    } catch (error) {
      this.logger.error(`Error clearing rate limit for key ${key}:`, error);
    }
  }

  /**
   * Clear all rate limits for a rule
   */
  async clearAllRateLimits(ruleId: string): Promise<number> {
    try {
      const redis = this.redisService.getClient();
      const pattern = `ratelimit:${ruleId}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) return 0;
      
      const deletedCount = await redis.del(...keys);
      this.logger.log(`Cleared ${deletedCount} rate limits for rule: ${ruleId}`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Error clearing rate limits for rule ${ruleId}:`, error);
      return 0;
    }
  }

  /**
   * Adaptive rate limiting based on system load
   */
  async adjustRateLimitsBasedOnLoad(systemLoad: number): Promise<void> {
    if (systemLoad < 0.7) {
      // Low load - relax rate limits
      this.adjustAllRules(1.2); // Increase limits by 20%
    } else if (systemLoad > 0.9) {
      // High load - tighten rate limits
      this.adjustAllRules(0.8); // Decrease limits by 20%
    }
  }

  /**
   * Whitelist/blacklist functionality
   */
  async isWhitelisted(key: string): Promise<boolean> {
    try {
      const redis = this.redisService.getClient();
      const isWhitelisted = await redis.sIsMember('ratelimit:whitelist', key);
      return isWhitelisted === 1;
    } catch (error) {
      this.logger.error(`Error checking whitelist for key ${key}:`, error);
      return false;
    }
  }

  async isBlacklisted(key: string): Promise<boolean> {
    try {
      const redis = this.redisService.getClient();
      const isBlacklisted = await redis.sIsMember('ratelimit:blacklist', key);
      return isBlacklisted === 1;
    } catch (error) {
      this.logger.error(`Error checking blacklist for key ${key}:`, error);
      return false;
    }
  }

  async addToWhitelist(key: string, ttl?: number): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      await redis.sAdd('ratelimit:whitelist', key);
      
      if (ttl) {
        await redis.expire('ratelimit:whitelist', ttl);
      }
      
      this.logger.debug(`Added ${key} to whitelist`);
    } catch (error) {
      this.logger.error(`Error adding ${key} to whitelist:`, error);
    }
  }

  async addToBlacklist(key: string, ttl?: number): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      await redis.sAdd('ratelimit:blacklist', key);
      
      if (ttl) {
        await redis.expire('ratelimit:blacklist', ttl);
      }
      
      this.logger.debug(`Added ${key} to blacklist`);
    } catch (error) {
      this.logger.error(`Error adding ${key} to blacklist:`, error);
    }
  }

  /**
   * Distributed rate limiting for multiple instances
   */
  async checkDistributedRateLimit(
    ruleId: string,
    request: any,
    instanceId: string
  ): Promise<RateLimitResult> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return { allowed: true, remaining: Infinity, resetTime: new Date() };
    }

    try {
      const redis = this.redisService.getClient();
      const key = this.generateRateLimitKey(ruleId, rule.keyGenerator(request));
      const distributedKey = `${key}:distributed`;
      
      // Use Lua script for atomic increment and check
      const luaScript = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        local current = redis.call('GET', key)
        if current == false then
          current = 0
        else
          current = tonumber(current)
        end
        
        if current >= limit then
          local ttl = redis.call('TTL', key)
          return {0, 0, ttl}
        end
        
        local newCount = redis.call('INCR', key)
        if newCount == 1 then
          redis.call('EXPIRE', key, window)
        end
        
        local ttl = redis.call('TTL', key)
        return {1, limit - newCount, ttl}
      `;

      const result = await redis.eval(
        luaScript,
        1,
        distributedKey,
        rule.maxRequests.toString(),
        Math.ceil(rule.windowMs / 1000).toString(),
        Date.now().toString()
      ) as [number, number, number];

      const [allowed, remaining, ttl] = result;
      
      return {
        allowed: allowed === 1,
        remaining,
        resetTime: new Date(Date.now() + ttl * 1000),
        retryAfter: allowed === 0 ? ttl : undefined,
      };
    } catch (error) {
      this.logger.error(`Error in distributed rate limiting:`, error);
      return { allowed: true, remaining: 0, resetTime: new Date() };
    }
  }

  private initializeDefaultRules(): void {
    // API rate limiting
    this.registerRule({
      id: 'api-general',
      pattern: '/api/*',
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      keyGenerator: (req) => req.ip || 'unknown',
      enabled: true,
    });

    // Authentication endpoints
    this.registerRule({
      id: 'auth-login',
      pattern: '/api/auth/login',
      windowMs: 300000, // 5 minutes
      maxRequests: 5,
      keyGenerator: (req) => req.ip || 'unknown',
      enabled: true,
    });

    // Transcription endpoints (more restrictive due to resource usage)
    this.registerRule({
      id: 'transcription',
      pattern: '/api/transcription/*',
      windowMs: 60000, // 1 minute
      maxRequests: 20,
      keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
      enabled: true,
    });

    // Response generation (AI-heavy operations)
    this.registerRule({
      id: 'response-generation',
      pattern: '/api/responses/*',
      windowMs: 60000, // 1 minute
      maxRequests: 30,
      keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
      enabled: true,
    });

    // WebSocket connections
    this.registerRule({
      id: 'websocket-connect',
      pattern: '/socket.io/*',
      windowMs: 60000, // 1 minute
      maxRequests: 10,
      keyGenerator: (req) => req.ip || 'unknown',
      enabled: true,
    });

    // User-specific rate limiting
    this.registerRule({
      id: 'user-requests',
      pattern: '/api/*',
      windowMs: 60000, // 1 minute
      maxRequests: 200,
      keyGenerator: (req) => req.user?.id || 'anonymous',
      enabled: true,
    });

    this.logger.log('Initialized default rate limiting rules');
  }

  private generateRateLimitKey(ruleId: string, identifier: string): string {
    return `ratelimit:${ruleId}:${identifier}`;
  }

  private adjustAllRules(factor: number): void {
    for (const rule of this.rules.values()) {
      if (rule.enabled) {
        rule.maxRequests = Math.ceil(rule.maxRequests * factor);
      }
    }
    this.logger.debug(`Adjusted all rate limits by factor: ${factor}`);
  }

  private async getRecentBlocks(): Promise<Array<{
    ruleId: string;
    key: string;
    blockedAt: Date;
    retryAfter: number;
  }>> {
    // This would require storing block events in Redis
    // For now, return empty array
    return [];
  }

  private async getTopBlockedKeys(): Promise<Array<{
    key: string;
    blockCount: number;
    lastBlocked: Date;
  }>> {
    // This would require storing block statistics
    // For now, return empty array
    return [];
  }
}