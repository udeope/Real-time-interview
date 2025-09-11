import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CacheService } from './services/cache.service';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { ResponsePrecomputationService } from './services/response-precomputation.service';
import { PerformanceMonitoringService } from './services/performance-monitoring.service';
import { RateLimitingService } from './services/rate-limiting.service';
import { DatabaseOptimizationService } from './database-optimization.service';

@ApiTags('Cache Management')
@Controller('api/cache')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CacheController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly invalidationService: CacheInvalidationService,
    private readonly precomputationService: ResponsePrecomputationService,
    private readonly performanceService: PerformanceMonitoringService,
    private readonly rateLimitingService: RateLimitingService,
    private readonly databaseOptimizationService: DatabaseOptimizationService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get comprehensive cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
  async getCacheStats() {
    const [cacheStats, performanceMetrics, rateLimitStats, precomputationStats] = await Promise.all([
      this.cacheService.getStats(),
      this.performanceService.getPerformanceMetrics(),
      this.rateLimitingService.getRateLimitStats(),
      this.precomputationService.getPrecomputationStats(),
    ]);

    return {
      cache: cacheStats,
      performance: performanceMetrics,
      rateLimit: rateLimitStats,
      precomputation: precomputationStats,
      timestamp: new Date(),
    };
  }

  @Get('performance/metrics')
  @ApiOperation({ summary: 'Get detailed performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics() {
    return await this.performanceService.getPerformanceMetrics();
  }

  @Get('performance/alerts')
  @ApiOperation({ summary: 'Get performance alerts' })
  @ApiResponse({ status: 200, description: 'Performance alerts retrieved successfully' })
  async getPerformanceAlerts() {
    return await this.performanceService.getPerformanceAlerts();
  }

  @Get('performance/export')
  @ApiOperation({ summary: 'Export metrics in specified format' })
  @ApiResponse({ status: 200, description: 'Metrics exported successfully' })
  async exportMetrics(@Query('format') format: 'json' | 'prometheus' = 'json') {
    const metrics = await this.performanceService.exportMetrics(format);
    
    if (format === 'prometheus') {
      return { 
        data: metrics,
        contentType: 'text/plain; version=0.0.4; charset=utf-8'
      };
    }
    
    return JSON.parse(metrics);
  }

  @Post('invalidate/tag')
  @ApiOperation({ summary: 'Invalidate cache entries by tag' })
  @ApiResponse({ status: 200, description: 'Cache entries invalidated successfully' })
  @HttpCode(HttpStatus.OK)
  async invalidateByTag(
    @Body() body: { tag: string; cascade?: boolean }
  ) {
    const invalidatedCount = await this.invalidationService.invalidateByTag(
      body.tag, 
      body.cascade || false
    );
    
    return {
      message: `Invalidated ${invalidatedCount} cache entries`,
      tag: body.tag,
      cascade: body.cascade || false,
      invalidatedCount,
    };
  }

  @Post('invalidate/pattern')
  @ApiOperation({ summary: 'Invalidate cache entries by pattern' })
  @ApiResponse({ status: 200, description: 'Cache entries invalidated successfully' })
  @HttpCode(HttpStatus.OK)
  async invalidateByPattern(@Body() body: { pattern: string }) {
    const invalidatedCount = await this.invalidationService.invalidateByPattern(body.pattern);
    
    return {
      message: `Invalidated ${invalidatedCount} cache entries`,
      pattern: body.pattern,
      invalidatedCount,
    };
  }

  @Post('invalidate/user/:userId')
  @ApiOperation({ summary: 'Invalidate cache entries for a specific user' })
  @ApiResponse({ status: 200, description: 'User cache invalidated successfully' })
  @HttpCode(HttpStatus.OK)
  async invalidateUserCache(@Param('userId') userId: string) {
    const invalidatedCount = await this.invalidationService.invalidateUserContext(userId);
    
    return {
      message: `Invalidated ${invalidatedCount} cache entries for user`,
      userId,
      invalidatedCount,
    };
  }

  @Post('invalidate/session/:sessionId')
  @ApiOperation({ summary: 'Invalidate cache entries for a specific session' })
  @ApiResponse({ status: 200, description: 'Session cache invalidated successfully' })
  @HttpCode(HttpStatus.OK)
  async invalidateSessionCache(@Param('sessionId') sessionId: string) {
    const invalidatedCount = await this.invalidationService.invalidateSession(sessionId);
    
    return {
      message: `Invalidated ${invalidatedCount} cache entries for session`,
      sessionId,
      invalidatedCount,
    };
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear cache with optional pattern' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache(@Query('pattern') pattern?: string) {
    const clearedCount = await this.cacheService.clear(pattern || '*');
    
    return {
      message: `Cleared ${clearedCount} cache entries`,
      pattern: pattern || '*',
      clearedCount,
    };
  }

  @Post('precompute/common-responses')
  @ApiOperation({ summary: 'Trigger precomputation of common responses' })
  @ApiResponse({ status: 200, description: 'Precomputation started successfully' })
  @HttpCode(HttpStatus.OK)
  async precomputeCommonResponses() {
    // Run precomputation in background
    this.precomputationService.precomputeCommonResponses().catch(error => {
      console.error('Precomputation failed:', error);
    });
    
    return {
      message: 'Common responses precomputation started',
      status: 'running',
    };
  }

  @Post('precompute/context-data')
  @ApiOperation({ summary: 'Trigger precomputation of context data' })
  @ApiResponse({ status: 200, description: 'Context precomputation started successfully' })
  @HttpCode(HttpStatus.OK)
  async precomputeContextData() {
    // Run precomputation in background
    this.precomputationService.precomputeContextData().catch(error => {
      console.error('Context precomputation failed:', error);
    });
    
    return {
      message: 'Context data precomputation started',
      status: 'running',
    };
  }

  @Post('precompute/execute/:jobId')
  @ApiOperation({ summary: 'Execute a specific precomputation job' })
  @ApiResponse({ status: 200, description: 'Precomputation job executed successfully' })
  @HttpCode(HttpStatus.OK)
  async executePrecomputationJob(@Param('jobId') jobId: string) {
    try {
      await this.precomputationService.executeJob(jobId);
      
      return {
        message: `Precomputation job ${jobId} executed successfully`,
        jobId,
        status: 'completed',
      };
    } catch (error) {
      return {
        message: `Precomputation job ${jobId} failed`,
        jobId,
        status: 'failed',
        error: error.message,
      };
    }
  }

  @Delete('precompute/clear')
  @ApiOperation({ summary: 'Clear all precomputed cache entries' })
  @ApiResponse({ status: 200, description: 'Precomputed cache cleared successfully' })
  async clearPrecomputedCache() {
    const clearedCount = await this.precomputationService.clearPrecomputedCache();
    
    return {
      message: `Cleared ${clearedCount} precomputed cache entries`,
      clearedCount,
    };
  }

  @Get('rate-limit/rules')
  @ApiOperation({ summary: 'Get all rate limiting rules' })
  @ApiResponse({ status: 200, description: 'Rate limiting rules retrieved successfully' })
  async getRateLimitRules() {
    return this.rateLimitingService.getRules();
  }

  @Post('rate-limit/rules')
  @ApiOperation({ summary: 'Create or update a rate limiting rule' })
  @ApiResponse({ status: 201, description: 'Rate limiting rule created successfully' })
  async createRateLimitRule(@Body() rule: any) {
    this.rateLimitingService.registerRule(rule);
    
    return {
      message: 'Rate limiting rule created successfully',
      ruleId: rule.id,
    };
  }

  @Post('rate-limit/toggle/:ruleId')
  @ApiOperation({ summary: 'Enable or disable a rate limiting rule' })
  @ApiResponse({ status: 200, description: 'Rate limiting rule toggled successfully' })
  @HttpCode(HttpStatus.OK)
  async toggleRateLimitRule(
    @Param('ruleId') ruleId: string,
    @Body() body: { enabled: boolean }
  ) {
    this.rateLimitingService.toggleRule(ruleId, body.enabled);
    
    return {
      message: `Rate limiting rule ${body.enabled ? 'enabled' : 'disabled'}`,
      ruleId,
      enabled: body.enabled,
    };
  }

  @Delete('rate-limit/clear/:ruleId')
  @ApiOperation({ summary: 'Clear rate limits for a specific rule' })
  @ApiResponse({ status: 200, description: 'Rate limits cleared successfully' })
  async clearRateLimits(@Param('ruleId') ruleId: string) {
    const clearedCount = await this.rateLimitingService.clearAllRateLimits(ruleId);
    
    return {
      message: `Cleared ${clearedCount} rate limits`,
      ruleId,
      clearedCount,
    };
  }

  @Post('rate-limit/whitelist')
  @ApiOperation({ summary: 'Add key to rate limit whitelist' })
  @ApiResponse({ status: 200, description: 'Key added to whitelist successfully' })
  @HttpCode(HttpStatus.OK)
  async addToWhitelist(@Body() body: { key: string; ttl?: number }) {
    await this.rateLimitingService.addToWhitelist(body.key, body.ttl);
    
    return {
      message: 'Key added to whitelist',
      key: body.key,
      ttl: body.ttl,
    };
  }

  @Post('rate-limit/blacklist')
  @ApiOperation({ summary: 'Add key to rate limit blacklist' })
  @ApiResponse({ status: 200, description: 'Key added to blacklist successfully' })
  @HttpCode(HttpStatus.OK)
  async addToBlacklist(@Body() body: { key: string; ttl?: number }) {
    await this.rateLimitingService.addToBlacklist(body.key, body.ttl);
    
    return {
      message: 'Key added to blacklist',
      key: body.key,
      ttl: body.ttl,
    };
  }

  @Post('warmup')
  @ApiOperation({ summary: 'Warm up cache with precomputed data' })
  @ApiResponse({ status: 200, description: 'Cache warmup completed successfully' })
  @HttpCode(HttpStatus.OK)
  async warmupCache(@Body() body: { entries: Array<{ key: string; data: any; ttl?: number }> }) {
    await this.cacheService.warmup(body.entries);
    
    return {
      message: `Cache warmed up with ${body.entries.length} entries`,
      entryCount: body.entries.length,
    };
  }

  @Get('database/performance')
  @ApiOperation({ summary: 'Analyze database query performance' })
  @ApiResponse({ status: 200, description: 'Database performance analysis retrieved successfully' })
  async getDatabasePerformance() {
    return await this.databaseOptimizationService.analyzeQueryPerformance();
  }

  @Get('database/connections')
  @ApiOperation({ summary: 'Get database connection statistics' })
  @ApiResponse({ status: 200, description: 'Database connection stats retrieved successfully' })
  async getDatabaseConnections() {
    return await this.databaseOptimizationService.getConnectionStats();
  }

  @Post('database/optimize')
  @ApiOperation({ summary: 'Optimize database tables (VACUUM ANALYZE)' })
  @ApiResponse({ status: 200, description: 'Database optimization started successfully' })
  @HttpCode(HttpStatus.OK)
  async optimizeDatabase() {
    // Run optimization in background
    this.databaseOptimizationService.optimizeTables().catch(error => {
      console.error('Database optimization failed:', error);
    });
    
    return {
      message: 'Database optimization started',
      status: 'running',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check cache system health' })
  @ApiResponse({ status: 200, description: 'Cache health status retrieved successfully' })
  async getHealthStatus() {
    const [cacheStats, alerts, dbConnections] = await Promise.all([
      this.cacheService.getStats(),
      this.performanceService.getPerformanceAlerts(),
      this.databaseOptimizationService.getConnectionStats(),
    ]);

    const criticalAlerts = alerts.filter(alert => alert.type === 'critical');
    const warningAlerts = alerts.filter(alert => alert.type === 'warning');

    return {
      status: criticalAlerts.length > 0 ? 'critical' : warningAlerts.length > 0 ? 'warning' : 'healthy',
      cache: {
        hitRate: cacheStats.hitRate,
        totalKeys: cacheStats.totalKeys,
        memoryUsage: cacheStats.memoryUsage,
      },
      database: {
        connectionUtilization: dbConnections.connectionUtilization,
        activeConnections: dbConnections.activeConnections,
        totalConnections: dbConnections.totalConnections,
      },
      alerts: {
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
        total: alerts.length,
      },
      timestamp: new Date(),
    };
  }
}