import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';
import { AuditService, AuditAction } from './audit.service';

export interface PrivacySettingsUpdate {
  audioRetentionDays?: number;
  transcriptionRetentionDays?: number;
  analyticsEnabled?: boolean;
  dataSharingEnabled?: boolean;
  marketingEmailsEnabled?: boolean;
  sessionRecordingEnabled?: boolean;
  aiTrainingConsent?: boolean;
}

export interface PrivacySettings {
  audioRetentionDays: number;
  transcriptionRetentionDays: number;
  analyticsEnabled: boolean;
  dataSharingEnabled: boolean;
  marketingEmailsEnabled: boolean;
  sessionRecordingEnabled: boolean;
  aiTrainingConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrivacySettingsService {
  private readonly logger = new Logger(PrivacySettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get user's privacy settings
   */
  async getUserPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      let settings = await this.prisma.privacySetting.findUnique({
        where: { userId },
      });

      // Create default settings if none exist
      if (!settings) {
        settings = await this.createDefaultPrivacySettings(userId);
      }

      return {
        audioRetentionDays: settings.audioRetentionDays,
        transcriptionRetentionDays: settings.transcriptionRetentionDays,
        analyticsEnabled: settings.analyticsEnabled,
        dataSharingEnabled: settings.dataSharingEnabled,
        marketingEmailsEnabled: settings.marketingEmailsEnabled,
        sessionRecordingEnabled: settings.sessionRecordingEnabled,
        aiTrainingConsent: settings.aiTrainingConsent,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get privacy settings for user ${userId}: ${error.message}`);
      throw new BadRequestException('Failed to retrieve privacy settings');
    }
  }

  /**
   * Update user's privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    updates: PrivacySettingsUpdate,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PrivacySettings> {
    try {
      // Validate retention days
      if (updates.audioRetentionDays !== undefined && updates.audioRetentionDays < 1) {
        throw new BadRequestException('Audio retention days must be at least 1');
      }

      if (updates.transcriptionRetentionDays !== undefined && updates.transcriptionRetentionDays < 1) {
        throw new BadRequestException('Transcription retention days must be at least 1');
      }

      // Get current settings for comparison
      const currentSettings = await this.getUserPrivacySettings(userId);

      // Update settings
      const updatedSettings = await this.prisma.privacySetting.upsert({
        where: { userId },
        update: {
          ...updates,
          updatedAt: new Date(),
        },
        create: {
          userId,
          audioRetentionDays: updates.audioRetentionDays ?? 30,
          transcriptionRetentionDays: updates.transcriptionRetentionDays ?? 90,
          analyticsEnabled: updates.analyticsEnabled ?? true,
          dataSharingEnabled: updates.dataSharingEnabled ?? false,
          marketingEmailsEnabled: updates.marketingEmailsEnabled ?? false,
          sessionRecordingEnabled: updates.sessionRecordingEnabled ?? true,
          aiTrainingConsent: updates.aiTrainingConsent ?? false,
        },
      });

      // Log the privacy settings update
      await this.auditService.logPrivacy(
        AuditAction.PRIVACY_SETTINGS_UPDATE,
        userId,
        {
          changes: this.getChanges(currentSettings, updates),
          previousSettings: currentSettings,
          newSettings: updates,
        },
        ipAddress,
        userAgent,
      );

      this.logger.log(`Privacy settings updated for user ${userId}`);

      return {
        audioRetentionDays: updatedSettings.audioRetentionDays,
        transcriptionRetentionDays: updatedSettings.transcriptionRetentionDays,
        analyticsEnabled: updatedSettings.analyticsEnabled,
        dataSharingEnabled: updatedSettings.dataSharingEnabled,
        marketingEmailsEnabled: updatedSettings.marketingEmailsEnabled,
        sessionRecordingEnabled: updatedSettings.sessionRecordingEnabled,
        aiTrainingConsent: updatedSettings.aiTrainingConsent,
        createdAt: updatedSettings.createdAt,
        updatedAt: updatedSettings.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to update privacy settings for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create default privacy settings for a new user
   */
  private async createDefaultPrivacySettings(userId: string) {
    return this.prisma.privacySetting.create({
      data: {
        userId,
        audioRetentionDays: 30,
        transcriptionRetentionDays: 90,
        analyticsEnabled: true,
        dataSharingEnabled: false,
        marketingEmailsEnabled: false,
        sessionRecordingEnabled: true,
        aiTrainingConsent: false,
      },
    });
  }

  /**
   * Get changes between current and new settings
   */
  private getChanges(current: PrivacySettings, updates: PrivacySettingsUpdate): Record<string, any> {
    const changes: Record<string, any> = {};

    Object.keys(updates).forEach(key => {
      const currentValue = current[key as keyof PrivacySettings];
      const newValue = updates[key as keyof PrivacySettingsUpdate];
      
      if (currentValue !== newValue) {
        changes[key] = {
          from: currentValue,
          to: newValue,
        };
      }
    });

    return changes;
  }

  /**
   * Reset privacy settings to defaults
   */
  async resetToDefaults(userId: string, ipAddress?: string, userAgent?: string): Promise<PrivacySettings> {
    const defaultSettings: PrivacySettingsUpdate = {
      audioRetentionDays: 30,
      transcriptionRetentionDays: 90,
      analyticsEnabled: true,
      dataSharingEnabled: false,
      marketingEmailsEnabled: false,
      sessionRecordingEnabled: true,
      aiTrainingConsent: false,
    };

    return this.updatePrivacySettings(userId, defaultSettings, ipAddress, userAgent);
  }

  /**
   * Check if user allows analytics tracking
   */
  async isAnalyticsEnabled(userId: string): Promise<boolean> {
    const settings = await this.getUserPrivacySettings(userId);
    return settings.analyticsEnabled;
  }

  /**
   * Check if user allows data sharing
   */
  async isDataSharingEnabled(userId: string): Promise<boolean> {
    const settings = await this.getUserPrivacySettings(userId);
    return settings.dataSharingEnabled;
  }

  /**
   * Check if user allows session recording
   */
  async isSessionRecordingEnabled(userId: string): Promise<boolean> {
    const settings = await this.getUserPrivacySettings(userId);
    return settings.sessionRecordingEnabled;
  }

  /**
   * Check if user consents to AI training
   */
  async hasAiTrainingConsent(userId: string): Promise<boolean> {
    const settings = await this.getUserPrivacySettings(userId);
    return settings.aiTrainingConsent;
  }

  /**
   * Get user's data retention preferences
   */
  async getRetentionPreferences(userId: string): Promise<{ audio: number; transcription: number }> {
    const settings = await this.getUserPrivacySettings(userId);
    return {
      audio: settings.audioRetentionDays,
      transcription: settings.transcriptionRetentionDays,
    };
  }

  /**
   * Validate privacy settings before processing sensitive operations
   */
  async validatePrivacyForOperation(userId: string, operation: string): Promise<void> {
    const settings = await this.getUserPrivacySettings(userId);

    switch (operation) {
      case 'analytics_tracking':
        if (!settings.analyticsEnabled) {
          throw new BadRequestException('Analytics tracking is disabled in privacy settings');
        }
        break;

      case 'data_sharing':
        if (!settings.dataSharingEnabled) {
          throw new BadRequestException('Data sharing is disabled in privacy settings');
        }
        break;

      case 'session_recording':
        if (!settings.sessionRecordingEnabled) {
          throw new BadRequestException('Session recording is disabled in privacy settings');
        }
        break;

      case 'ai_training':
        if (!settings.aiTrainingConsent) {
          throw new BadRequestException('AI training consent not granted in privacy settings');
        }
        break;

      default:
        // No validation needed for unknown operations
        break;
    }
  }

  /**
   * Get privacy settings summary for display
   */
  async getPrivacySummary(userId: string): Promise<any> {
    const settings = await this.getUserPrivacySettings(userId);

    return {
      dataRetention: {
        audio: `${settings.audioRetentionDays} days`,
        transcription: `${settings.transcriptionRetentionDays} days`,
      },
      permissions: {
        analytics: settings.analyticsEnabled ? 'Enabled' : 'Disabled',
        dataSharing: settings.dataSharingEnabled ? 'Enabled' : 'Disabled',
        marketingEmails: settings.marketingEmailsEnabled ? 'Enabled' : 'Disabled',
        sessionRecording: settings.sessionRecordingEnabled ? 'Enabled' : 'Disabled',
        aiTraining: settings.aiTrainingConsent ? 'Consented' : 'Not consented',
      },
      lastUpdated: settings.updatedAt,
    };
  }
}