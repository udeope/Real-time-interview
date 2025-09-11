import { Module } from '@nestjs/common';
import { MetricsService } from './services/metrics.service';
import { AnalyticsService } from './services/analytics.service';
import { PerformanceMonitoringService } from './services/performance-monitoring.service';
import { UserSatisfactionService } from './services/user-satisfaction.service';
import { SystemHealthService } from './services/system-health.service';
import { MonitoringIntegrationService } from './services/monitoring-integration.service';
import { MonitoringController } from './monitoring.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    MetricsService,
    AnalyticsService,
    PerformanceMonitoringService,
    UserSatisfactionService,
    SystemHealthService,
    MonitoringIntegrationService,
  ],
  controllers: [MonitoringController],
  exports: [
    MetricsService,
    AnalyticsService,
    PerformanceMonitoringService,
    UserSatisfactionService,
    SystemHealthService,
    MonitoringIntegrationService,
  ],
})
export class MonitoringModule {}