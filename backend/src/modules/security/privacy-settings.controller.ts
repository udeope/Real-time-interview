import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivacySettingsService, PrivacySettingsUpdate } from './services/privacy-settings.service';

@Controller('privacy-settings')
@UseGuards(JwtAuthGuard)
export class PrivacySettingsController {
  constructor(private readonly privacySettingsService: PrivacySettingsService) {}

  /**
   * Get user's privacy settings
   */
  @Get()
  async getPrivacySettings(@Request() req) {
    return this.privacySettingsService.getUserPrivacySettings(req.user.id);
  }

  /**
   * Update privacy settings
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  async updatePrivacySettings(
    @Request() req,
    @Body() updates: PrivacySettingsUpdate,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const updatedSettings = await this.privacySettingsService.updatePrivacySettings(
      req.user.id,
      updates,
      ipAddress,
      userAgent,
    );

    return {
      message: 'Privacy settings updated successfully',
      settings: updatedSettings,
    };
  }

  /**
   * Reset privacy settings to defaults
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetToDefaults(
    @Request() req,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const defaultSettings = await this.privacySettingsService.resetToDefaults(
      req.user.id,
      ipAddress,
      userAgent,
    );

    return {
      message: 'Privacy settings reset to defaults',
      settings: defaultSettings,
    };
  }

  /**
   * Get privacy summary
   */
  @Get('summary')
  async getPrivacySummary(@Request() req) {
    return this.privacySettingsService.getPrivacySummary(req.user.id);
  }

  /**
   * Get data retention preferences
   */
  @Get('retention')
  async getRetentionPreferences(@Request() req) {
    return this.privacySettingsService.getRetentionPreferences(req.user.id);
  }

  /**
   * Check specific privacy permissions
   */
  @Get('permissions/:operation')
  async checkPermission(@Request() req, @Body('operation') operation: string) {
    try {
      await this.privacySettingsService.validatePrivacyForOperation(req.user.id, operation);
      return { allowed: true };
    } catch (error) {
      return { allowed: false, reason: error.message };
    }
  }

  /**
   * Get available privacy options and their descriptions
   */
  @Get('options')
  async getPrivacyOptions() {
    return {
      retentionOptions: {
        audioRetentionDays: {
          name: 'Audio Data Retention',
          description: 'How long to keep your audio recordings',
          options: [
            { value: 1, label: '1 day' },
            { value: 7, label: '1 week' },
            { value: 30, label: '1 month (recommended)' },
            { value: 90, label: '3 months' },
            { value: 365, label: '1 year' },
          ],
          default: 30,
        },
        transcriptionRetentionDays: {
          name: 'Transcription Data Retention',
          description: 'How long to keep your transcription data',
          options: [
            { value: 7, label: '1 week' },
            { value: 30, label: '1 month' },
            { value: 90, label: '3 months (recommended)' },
            { value: 180, label: '6 months' },
            { value: 365, label: '1 year' },
          ],
          default: 90,
        },
      },
      permissionOptions: {
        analyticsEnabled: {
          name: 'Analytics & Performance Tracking',
          description: 'Allow us to collect usage analytics to improve the service',
          default: true,
        },
        dataSharingEnabled: {
          name: 'Data Sharing',
          description: 'Allow sharing anonymized data for research purposes',
          default: false,
        },
        marketingEmailsEnabled: {
          name: 'Marketing Communications',
          description: 'Receive emails about new features and updates',
          default: false,
        },
        sessionRecordingEnabled: {
          name: 'Session Recording',
          description: 'Allow recording of interview sessions for analysis',
          default: true,
        },
        aiTrainingConsent: {
          name: 'AI Model Training',
          description: 'Allow your data to be used for improving AI models',
          default: false,
        },
      },
    };
  }
}