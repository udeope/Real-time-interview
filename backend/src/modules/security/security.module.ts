import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma.service';

// Services
import { EncryptionService } from './services/encryption.service';
import { AuditService } from './services/audit.service';
import { ConsentService } from './services/consent.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { DataRetentionService } from './services/data-retention.service';
import { GdprService } from './services/gdpr.service';
import { PrivacySettingsService } from './services/privacy-settings.service';

// Controllers
import { SecurityController } from './security.controller';
import { ConsentController } from './consent.controller';
import { GdprController } from './gdpr.controller';
import { PrivacySettingsController } from './privacy-settings.controller';

// Guards and Middleware
import { ConsentGuard } from './guards/consent.guard';
import { FraudDetectionGuard } from './guards/fraud-detection.guard';
import { AuditMiddleware } from './middleware/audit.middleware';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    PrismaService,
    EncryptionService,
    AuditService,
    ConsentService,
    FraudDetectionService,
    DataRetentionService,
    GdprService,
    PrivacySettingsService,
    ConsentGuard,
    FraudDetectionGuard,
  ],
  controllers: [
    SecurityController,
    ConsentController,
    GdprController,
    PrivacySettingsController,
  ],
  exports: [
    EncryptionService,
    AuditService,
    ConsentService,
    FraudDetectionService,
    DataRetentionService,
    GdprService,
    PrivacySettingsService,
    ConsentGuard,
    FraudDetectionGuard,
    AuditMiddleware,
  ],
})
export class SecurityModule {}