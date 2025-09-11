import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '../../config/redis.config';
import { DatabaseService } from '../../config/database.config';
import { CacheService } from './services/cache.service';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { ResponsePrecomputationService } from './services/response-precomputation.service';
import { PerformanceMonitoringService } from './services/performance-monitoring.service';
import { RateLimitingService } from './services/rate-limiting.service';
import { DatabaseOptimizationService } from './database-optimization.service';
import { CacheController } from './cache.controller';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RedisService,
    DatabaseService,
    CacheService,
    CacheInvalidationService,
    ResponsePrecomputationService,
    PerformanceMonitoringService,
    RateLimitingService,
    DatabaseOptimizationService,
  ],
  controllers: [CacheController],
  exports: [
    CacheService,
    CacheInvalidationService,
    ResponsePrecomputationService,
    PerformanceMonitoringService,
    RateLimitingService,
    DatabaseOptimizationService,
  ],
})
export class CacheModule {}