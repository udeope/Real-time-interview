import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Main Integration Controller
import { IntegrationsController } from './integrations.controller';

// LinkedIn Integration
import { LinkedInService } from './linkedin/linkedin.service';
import { LinkedInController } from './linkedin/linkedin.controller';

// Calendar Integration
import { CalendarService } from './calendar/calendar.service';
import { CalendarController } from './calendar/calendar.controller';

// Video Conferencing Integration
import { VideoConferencingService } from './video-conferencing/video-conferencing.service';
import { VideoConferencingController } from './video-conferencing/video-conferencing.controller';

// Data Export
import { DataExportService } from './data-export/data-export.service';
import { DataExportController } from './data-export/data-export.controller';

// Webhooks
import { WebhookService } from './webhooks/webhook.service';
import { WebhookController } from './webhooks/webhook.controller';

// Repository and Services
import { IntegrationRepository } from './repositories/integration.repository';
import { IntegrationManagerService } from './services/integration-manager.service';

// Import other required modules
import { ContextAnalysisModule } from '../context-analysis/context-analysis.module';
import { InterviewSessionModule } from '../interview-session/interview-session.module';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../../config/prisma.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    ContextAnalysisModule,
    InterviewSessionModule,
    UserModule,
  ],
  controllers: [
    IntegrationsController,
    LinkedInController,
    CalendarController,
    VideoConferencingController,
    DataExportController,
    WebhookController,
  ],
  providers: [
    IntegrationRepository,
    IntegrationManagerService,
    LinkedInService,
    CalendarService,
    VideoConferencingService,
    DataExportService,
    WebhookService,
  ],
  exports: [
    IntegrationRepository,
    IntegrationManagerService,
    LinkedInService,
    CalendarService,
    VideoConferencingService,
    DataExportService,
    WebhookService,
  ],
})
export class IntegrationsModule {}