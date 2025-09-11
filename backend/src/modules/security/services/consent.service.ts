import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';
import { AuditService, AuditAction } from './audit.service';

export enum ConsentType {
  AUDIO_PROCESSING = 'audio_processing',
  DATA_STORAGE = 'data_storage',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  AI_TRAINING = 'ai_training',
  DATA_SHARING = 'data_sharing',
}

export interface ConsentRequest {
  consentType: ConsentType;
  granted: boolean;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentStatus {
  consentType: ConsentType;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  version: string;
  isRequired: boolean;
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);
  private readonly currentPolicyVersion = '1.0.0';

  // Define which consents are required for basic functionality
  private readonly requiredConsents = [
    ConsentType.AUDIO_PROCESSING,
    ConsentType.DATA_STORAGE,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Grant or revoke consent for a user
   */
  async updateConsent(userId: string, request: ConsentRequest): Promise<void> {
    try {
      const existingConsent = await this.prisma.userConsent.findUnique({
        where: {
          userId_consentType_version: {
            userId,
            consentType: request.consentType,
            version: request.version,
          },
        },
      });

      if (existingConsent) {
        // Update existing consent
        await this.prisma.userConsent.update({
          where: {
            userId_consentType_version: {
              userId,
              consentType: request.consentType,
              version: request.version,
            },
          },
          data: {
            granted: request.granted,
            grantedAt: request.granted ? new Date() : existingConsent.grantedAt,
            revokedAt: !request.granted ? new Date() : null,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new consent record
        await this.prisma.userConsent.create({
          data: {
            userId,
            consentType: request.consentType,
            granted: request.granted,
            grantedAt: request.granted ? new Date() : null,
            revokedAt: !request.granted ? new Date() : null,
            version: request.version,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
          },
        });
      }

      // Log the consent action
      await this.auditService.logPrivacy(
        request.granted ? AuditAction.CONSENT_GRANT : AuditAction.CONSENT_REVOKE,
        userId,
        {
          consentType: request.consentType,
          version: request.version,
        },
        request.ipAddress,
        request.userAgent,
      );

      this.logger.log(`Consent ${request.granted ? 'granted' : 'revoked'} for user ${userId}, type: ${request.consentType}`);
    } catch (error) {
      this.logger.error(`Failed to update consent: ${error.message}`);
      throw new BadRequestException('Failed to update consent');
    }
  }

  /**
   * Get all consent statuses for a user
   */
  async getUserConsents(userId: string): Promise<ConsentStatus[]> {
    const consents = await this.prisma.userConsent.findMany({
      where: {
        userId,
        version: this.currentPolicyVersion,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Create status for all consent types
    const allConsentTypes = Object.values(ConsentType);
    return allConsentTypes.map(consentType => {
      const consent = consents.find(c => c.consentType === consentType);
      return {
        consentType,
        granted: consent?.granted ?? false,
        grantedAt: consent?.grantedAt,
        revokedAt: consent?.revokedAt,
        version: consent?.version ?? this.currentPolicyVersion,
        isRequired: this.requiredConsents.includes(consentType),
      };
    });
  }

  /**
   * Check if user has granted specific consent
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.prisma.userConsent.findUnique({
      where: {
        userId_consentType_version: {
          userId,
          consentType,
          version: this.currentPolicyVersion,
        },
      },
    });

    return consent?.granted ?? false;
  }

  /**
   * Check if user has all required consents
   */
  async hasRequiredConsents(userId: string): Promise<boolean> {
    const requiredConsentChecks = await Promise.all(
      this.requiredConsents.map(consentType => this.hasConsent(userId, consentType))
    );

    return requiredConsentChecks.every(granted => granted);
  }

  /**
   * Get missing required consents for a user
   */
  async getMissingRequiredConsents(userId: string): Promise<ConsentType[]> {
    const missing: ConsentType[] = [];

    for (const consentType of this.requiredConsents) {
      const hasConsent = await this.hasConsent(userId, consentType);
      if (!hasConsent) {
        missing.push(consentType);
      }
    }

    return missing;
  }

  /**
   * Bulk grant consents (typically used during registration)
   */
  async grantMultipleConsents(
    userId: string,
    consentTypes: ConsentType[],
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const consentRequests = consentTypes.map(consentType => ({
        consentType,
        granted: true,
        version: this.currentPolicyVersion,
        ipAddress,
        userAgent,
      }));

      for (const request of consentRequests) {
        await this.updateConsent(userId, request);
      }

      this.logger.log(`Bulk granted consents for user ${userId}: ${consentTypes.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to grant multiple consents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Revoke all consents for a user (used during account deletion)
   */
  async revokeAllConsents(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const allConsentTypes = Object.values(ConsentType);
      
      for (const consentType of allConsentTypes) {
        await this.updateConsent(userId, {
          consentType,
          granted: false,
          version: this.currentPolicyVersion,
          ipAddress,
          userAgent,
        });
      }

      this.logger.log(`Revoked all consents for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke all consents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get consent history for a user
   */
  async getConsentHistory(userId: string, consentType?: ConsentType) {
    const where: any = { userId };
    if (consentType) {
      where.consentType = consentType;
    }

    return this.prisma.userConsent.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        consentType: true,
        granted: true,
        grantedAt: true,
        revokedAt: true,
        version: true,
        ipAddress: true,
        createdAt: true,
      },
    });
  }

  /**
   * Check if consent is required for a specific action
   */
  isConsentRequiredForAction(action: string): ConsentType[] {
    const actionConsentMap: Record<string, ConsentType[]> = {
      'audio_capture': [ConsentType.AUDIO_PROCESSING, ConsentType.DATA_STORAGE],
      'transcription': [ConsentType.AUDIO_PROCESSING, ConsentType.DATA_STORAGE],
      'response_generation': [ConsentType.DATA_STORAGE],
      'analytics_tracking': [ConsentType.ANALYTICS],
      'marketing_email': [ConsentType.MARKETING],
      'ai_model_training': [ConsentType.AI_TRAINING],
      'data_sharing': [ConsentType.DATA_SHARING],
    };

    return actionConsentMap[action] || [];
  }

  /**
   * Validate that user has required consents for an action
   */
  async validateConsentsForAction(userId: string, action: string): Promise<void> {
    const requiredConsents = this.isConsentRequiredForAction(action);
    
    for (const consentType of requiredConsents) {
      const hasConsent = await this.hasConsent(userId, consentType);
      if (!hasConsent) {
        throw new BadRequestException(
          `Missing required consent: ${consentType} for action: ${action}`
        );
      }
    }
  }

  /**
   * Get consent statistics (for admin/analytics)
   */
  async getConsentStatistics() {
    const stats = await this.prisma.userConsent.groupBy({
      by: ['consentType', 'granted'],
      where: {
        version: this.currentPolicyVersion,
      },
      _count: {
        userId: true,
      },
    });

    return stats.reduce((acc, stat) => {
      if (!acc[stat.consentType]) {
        acc[stat.consentType] = { granted: 0, revoked: 0 };
      }
      if (stat.granted) {
        acc[stat.consentType].granted = stat._count.userId;
      } else {
        acc[stat.consentType].revoked = stat._count.userId;
      }
      return acc;
    }, {} as Record<string, { granted: number; revoked: number }>);
  }
}