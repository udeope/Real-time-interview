import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

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

// Import other required modules
import { ContextAnalysisModule } from '../context-analysis/context-analysis.module';
import { InterviewSessionModule } from '../interview-session/interview-session.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    ContextAnalysisModule,
    InterviewSessionModule,
    UserModule,
  ],
  controllers: [
    LinkedInController,
    CalendarController,
    VideoConferencingController,
    DataExportController,
    WebhookController,
  ],
  providers: [
    LinkedInService,
    CalendarService,
    VideoConferencingService,
    DataExportService,
    WebhookService,
  ],
  exports: [
    LinkedInService,
    CalendarService,
    VideoConferencingService,
    DataExportService,
    WebhookService,
  ],
})
export class IntegrationsModule {}