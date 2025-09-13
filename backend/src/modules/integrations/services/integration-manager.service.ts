import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IntegrationType } from '@prisma/client';
import { IntegrationRepository } from '../repositories/integration.repository';

@Injectable()
export class IntegrationManagerService {
  private readonly logger = new Logger(IntegrationManagerService.name);

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  // Scheduled task to refresh tokens that are about to expire
  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshExpiringTokens() {
    this.logger.log('Checking for tokens that need refresh...');
    
    try {
      const integrationsNeedingRefresh = await this.integrationRepository.findIntegrationsNeedingRefresh();
      
      this.logger.log(`Found ${integrationsNeedingRefresh.length} integrations needing token refresh`);

      for (const integration of integrationsNeedingRefresh) {
        try {
          await this.refreshIntegrationToken(integration);
        } catch (error) {
          this.logger.error(
            `Failed to refresh token for integration ${integration.id}`,
            error,
          );
          
          // Mark integration as inactive if refresh fails
          await this.integrationRepository.updateIntegration(
            integration.userId,
            integration.integrationType,
            {
              isActive: false,
            },
          );
        }
      }
    } catch (error) {
      this.logger.error('Error during token refresh process', error);
    }
  }

  private async refreshIntegrationToken(integration: any): Promise<void> {
    if (!integration.refreshToken) {
      throw new Error('No refresh token available');
    }

    let newTokenData: any;

    switch (integration.integrationType) {
      case IntegrationType.GOOGLE_CALENDAR:
      case IntegrationType.GOOGLE_MEET:
        newTokenData = await this.refreshGoogleToken(integration.refreshToken);
        break;
      case IntegrationType.OUTLOOK_CALENDAR:
      case IntegrationType.TEAMS:
        newTokenData = await this.refreshMicrosoftToken(integration.refreshToken);
        break;
      case IntegrationType.ZOOM:
        newTokenData = await this.refreshZoomToken(integration.refreshToken);
        break;
      case IntegrationType.LINKEDIN:
        // LinkedIn tokens typically don't have refresh tokens
        throw new Error('LinkedIn tokens cannot be refreshed automatically');
      default:
        throw new Error(`Unsupported integration type: ${integration.integrationType}`);
    }

    // Update the integration with new token data
    await this.integrationRepository.updateIntegration(
      integration.userId,
      integration.integrationType,
      {
        accessToken: newTokenData.access_token,
        refreshToken: newTokenData.refresh_token || integration.refreshToken,
        expiresAt: new Date(Date.now() + newTokenData.expires_in * 1000),
      },
    );

    this.logger.log(
      `Successfully refreshed token for integration ${integration.id} (${integration.integrationType})`,
    );
  }

  private async refreshGoogleToken(refreshToken: string): Promise<any> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    const response = await firstValueFrom(
      this.httpService.post('https://oauth2.googleapis.com/token', {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    );

    return response.data;
  }

  private async refreshMicrosoftToken(refreshToken: string): Promise<any> {
    const clientId = this.configService.get<string>('OUTLOOK_CLIENT_ID') || 
                     this.configService.get<string>('TEAMS_CLIENT_ID');
    const clientSecret = this.configService.get<string>('OUTLOOK_CLIENT_SECRET') || 
                         this.configService.get<string>('TEAMS_CLIENT_SECRET');

    const response = await firstValueFrom(
      this.httpService.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    return response.data;
  }

  private async refreshZoomToken(refreshToken: string): Promise<any> {
    const clientId = this.configService.get<string>('ZOOM_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ZOOM_CLIENT_SECRET');
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await firstValueFrom(
      this.httpService.post('https://zoom.us/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    return response.data;
  }

  // Handle integration errors and status tracking
  async handleIntegrationError(
    userId: string,
    integrationType: IntegrationType,
    error: any,
  ): Promise<void> {
    this.logger.error(
      `Integration error for user ${userId}, type ${integrationType}`,
      error,
    );

    // Check if it's an authentication error
    if (this.isAuthenticationError(error)) {
      await this.integrationRepository.updateIntegration(
        userId,
        integrationType,
        {
          isActive: false,
        },
      );

      this.logger.warn(
        `Deactivated integration ${integrationType} for user ${userId} due to auth error`,
      );
    }
  }

  private isAuthenticationError(error: any): boolean {
    const authErrorCodes = [401, 403];
    const authErrorMessages = [
      'unauthorized',
      'forbidden',
      'invalid_token',
      'token_expired',
      'access_denied',
    ];

    if (error.response?.status && authErrorCodes.includes(error.response.status)) {
      return true;
    }

    if (error.message) {
      const message = error.message.toLowerCase();
      return authErrorMessages.some(authError => message.includes(authError));
    }

    return false;
  }

  // Validate integration health
  async validateIntegrationHealth(
    userId: string,
    integrationType: IntegrationType,
  ): Promise<boolean> {
    try {
      const integration = await this.integrationRepository.findIntegrationByUserAndType(
        userId,
        integrationType,
      );

      if (!integration || !integration.isActive) {
        return false;
      }

      // Check if token is expired
      if (integration.expiresAt && integration.expiresAt <= new Date()) {
        return false;
      }

      // Perform a simple API call to validate the token
      return await this.testIntegrationConnection(integration);
    } catch (error) {
      this.logger.error(
        `Health check failed for integration ${integrationType} of user ${userId}`,
        error,
      );
      return false;
    }
  }

  private async testIntegrationConnection(integration: any): Promise<boolean> {
    try {
      switch (integration.integrationType) {
        case IntegrationType.GOOGLE_CALENDAR:
        case IntegrationType.GOOGLE_MEET:
          await firstValueFrom(
            this.httpService.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
              headers: { 'Authorization': `Bearer ${integration.accessToken}` },
            }),
          );
          return true;

        case IntegrationType.OUTLOOK_CALENDAR:
        case IntegrationType.TEAMS:
          await firstValueFrom(
            this.httpService.get('https://graph.microsoft.com/v1.0/me', {
              headers: { 'Authorization': `Bearer ${integration.accessToken}` },
            }),
          );
          return true;

        case IntegrationType.ZOOM:
          await firstValueFrom(
            this.httpService.get('https://api.zoom.us/v2/users/me', {
              headers: { 'Authorization': `Bearer ${integration.accessToken}` },
            }),
          );
          return true;

        case IntegrationType.LINKEDIN:
          await firstValueFrom(
            this.httpService.get('https://api.linkedin.com/v2/people/~', {
              headers: { 'Authorization': `Bearer ${integration.accessToken}` },
            }),
          );
          return true;

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  // Get integration health status for all user integrations
  async getIntegrationsHealthStatus(userId: string): Promise<any> {
    const integrations = await this.integrationRepository.findUserIntegrations(userId);
    const healthStatus = {};

    for (const integration of integrations) {
      const isHealthy = await this.validateIntegrationHealth(
        userId,
        integration.integrationType,
      );

      healthStatus[integration.integrationType] = {
        healthy: isHealthy,
        lastSync: integration.lastSync,
        expiresAt: integration.expiresAt,
        isActive: integration.isActive,
      };
    }

    return healthStatus;
  }

  // Manual sync trigger for specific integration
  async triggerIntegrationSync(
    userId: string,
    integrationType: IntegrationType,
  ): Promise<void> {
    const integration = await this.integrationRepository.findIntegrationByUserAndType(
      userId,
      integrationType,
    );

    if (!integration || !integration.isActive) {
      throw new Error(`Integration ${integrationType} not found or inactive`);
    }

    // Validate health before sync
    const isHealthy = await this.validateIntegrationHealth(userId, integrationType);
    if (!isHealthy) {
      throw new Error(`Integration ${integrationType} is not healthy`);
    }

    // Update last sync timestamp
    await this.integrationRepository.updateLastSync(
      userId,
      integrationType,
      { manualSyncTriggered: true, lastManualSync: new Date() },
    );

    this.logger.log(`Manual sync triggered for ${integrationType} of user ${userId}`);
  }
}