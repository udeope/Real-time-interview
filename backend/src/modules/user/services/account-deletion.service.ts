import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';
import { AuditService } from '../../security/services/audit.service';

export interface AccountDeletionRequest {
  userId: string;
  reason?: string;
  feedback?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AccountDeletionResult {
  success: boolean;
  deletedAt: Date;
  dataRemoved: {
    userProfile: boolean;
    interviewSessions: boolean;
    practiceSessions: boolean;
    integrations: boolean;
    preferences: boolean;
    auditLogs: boolean;
    subscriptions: boolean;
  };
  errors?: string[];
}

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async requestAccountDeletion(request: AccountDeletionRequest): Promise<AccountDeletionResult> {
    const { userId, reason, feedback, ipAddress, userAgent } = request;

    this.logger.log(`Starting account deletion process for user ${userId}`);

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        sessions: true,
        practiceSessions: true,
        integrations: true,
        preferences: true,
        subscription: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Log the deletion request
    await this.auditService.logAction({
      userId,
      action: 'account_deletion_requested',
      resourceType: 'user',
      resourceId: userId,
      details: {
        reason,
        feedback,
        userEmail: user.email,
        userName: user.name,
      },
      ipAddress,
      userAgent,
    });

    const deletionResult: AccountDeletionResult = {
      success: false,
      deletedAt: new Date(),
      dataRemoved: {
        userProfile: false,
        interviewSessions: false,
        practiceSessions: false,
        integrations: false,
        preferences: false,
        auditLogs: false,
        subscriptions: false,
      },
      errors: [],
    };

    try {
      // Start transaction for atomic deletion
      await this.prisma.$transaction(async (tx) => {
        // 1. Delete user preferences
        try {
          await tx.userPreferences.deleteMany({
            where: { userId },
          });
          deletionResult.dataRemoved.preferences = true;
          this.logger.log(`Deleted preferences for user ${userId}`);
        } catch (error) {
          this.logger.error(`Failed to delete preferences for user ${userId}`, error);
          deletionResult.errors?.push('Failed to delete user preferences');
        }

        // 2. Delete integrations and related data
        try {
          // Delete calendar events
          await tx.calendarEvent.deleteMany({
            where: { userId },
          });

          // Delete video meetings
          await tx.videoMeeting.deleteMany({
            where: { userId },
          });

          // Delete user integrations
          await tx.userIntegration.deleteMany({
            where: { userId },
          });

          deletionResult.dataRemoved.integrations = true;
          this.logger.log(`Deleted integrations for user ${userId}`);
        } catch (error) {
          this.logger.error(`Failed to delete integrations for user ${userId}`, error);
          deletionResult.errors?.push('Failed to delete integrations');
        }

        // 3. Delete practice sessions and related data
        try {
          // Delete practice responses
          await tx.practiceResponse.deleteMany({
            where: { sessionId: { in: user.practiceSessions.map(s => s.id) } },
          });

          // Delete practice questions
          await tx.practiceQuestion.deleteMany({
            where: { sessionId: { in: user.practiceSessions.map(s => s.id) } },
          });

          // Delete practice analytics
          await tx.practiceAnalytics.deleteMany({
            where: { userId },
          });

          // Delete practice sessions
          await tx.practiceSession.deleteMany({
            where: { userId },
          });

          deletionResult.dataRemoved.practiceSessions = true;
          this.logger.log(`Deleted practice sessions for user ${userId}`);
        } catch (error) {
          this.logger.error(`Failed to delete practice sessions for user ${userId}`, error);
          deletionResult.errors?.push('Failed to delete practice sessions');
        }

        // 4. Delete interview sessions and related data
        try {
          // Delete transcription results
          await tx.transcriptionResult.deleteMany({
            where: { sessionId: { in: user.sessions.map(s => s.id) } },
          });

          // Delete audio chunks
          await tx.audioChunk.deleteMany({
            where: { sessionId: { in: user.sessions.map(s => s.id) } },
          });

          // Delete interactions
          await tx.interaction.deleteMany({
            where: { sessionId: { in: user.sessions.map(s => s.id) } },
          });

          // Delete session metrics
          await tx.sessionMetrics.deleteMany({
            where: { sessionId: { in: user.sessions.map(s => s.id) } },
          });

          // Delete performance metrics
          await tx.performanceMetrics.deleteMany({
            where: { userId },
          });

          // Delete satisfaction metrics
          await tx.userSatisfactionMetrics.deleteMany({
            where: { userId },
          });

          // Delete usage analytics
          await tx.usageAnalytics.deleteMany({
            where: { userId },
          });

          // Delete interview sessions
          await tx.interviewSession.deleteMany({
            where: { userId },
          });

          deletionResult.dataRemoved.interviewSessions = true;
          this.logger.log(`Deleted interview sessions for user ${userId}`);
        } catch (error) {
          this.logger.error(`Failed to delete interview sessions for user ${userId}`, error);
          deletionResult.errors?.push('Failed to delete interview sessions');
        }

        // 5. Delete subscription and billing data
        try {
          // Delete billing history
          await tx.billingHistory.deleteMany({
            where: { userId },
          });

          // Delete usage tracking
          await tx.usageTracking.deleteMany({
            where: { userId },
          });

          // Delete subscription
          await tx.subscription.deleteMany({
            where: { userId },
          });

          deletionResult.dataRemoved.subscriptions = true;
          this.logger.log(`Deleted subscription data for user ${userId}`);
        } catch (error) {
          this.logger.error(`Failed to delete subscription data for user ${userId}`, error);
          deletionResult.errors?.push('Failed to delete subscription data');
        }

        // 6. Delete security and privacy data
        try {
          // Delete user consents
          await tx.userConsent.deleteMany({
            where: { userId },
          });

          // Delete usage patterns
          await tx.usagePattern.deleteMany({
            where: { userId },
          });

          // Delete encryption keys
          await tx.encryptionKey.deleteMany({
            where: { userId },
          });

          // Delete data export requests
          await tx.dataExportRequest.deleteMany({
            where: { userId },
          });

          // Delete privacy settings
          await tx.privacySetting.deleteMany({
            where: { userId },
          });

          // Delete data exports
          await tx.dataExport.deleteMany({
            where: { userId },
          });

          // Delete webhook endpoints
          await tx.webhookEndpoint.deleteMany({
            where: { userId },
          });

          this.logger.log(`Deleted security and privacy data for user ${userId}`);
        } catch (error) {
          this.logger.error(`Failed to delete security data for user ${userId}`, error);
          deletionResult.errors?.push('Failed to delete security data');
        }

        // 7. Delete user profile
        try {
          await tx.userProfile.deleteMany({
            where: { userId },
          });

          deletionResult.dataRemoved.userProfile = true;
          this.logger.log(`Deleted user profile for user ${userId}`);
        } catch (error) {
          this.logger.error(`Failed to delete user profile for user ${userId}`, error);
          deletionResult.errors?.push('Failed to delete user profile');
        }

        // 8. Finally, delete the user account
        await tx.user.delete({
          where: { id: userId },
        });

        this.logger.log(`Successfully deleted user account ${userId}`);
      });

      // 9. Clean up audit logs (done outside transaction to avoid conflicts)
      try {
        await this.prisma.auditLog.deleteMany({
          where: { userId },
        });
        deletionResult.dataRemoved.auditLogs = true;
        this.logger.log(`Deleted audit logs for user ${userId}`);
      } catch (error) {
        this.logger.error(`Failed to delete audit logs for user ${userId}`, error);
        deletionResult.errors?.push('Failed to delete audit logs');
      }

      deletionResult.success = true;

      // Log successful deletion
      await this.auditService.logAction({
        userId: null, // User no longer exists
        action: 'account_deletion_completed',
        resourceType: 'user',
        resourceId: userId,
        details: {
          deletionResult,
          userEmail: user.email,
          userName: user.name,
        },
        ipAddress,
        userAgent,
      });

    } catch (error) {
      this.logger.error(`Account deletion failed for user ${userId}`, error);
      deletionResult.errors?.push(`Transaction failed: ${error.message}`);

      // Log failed deletion
      await this.auditService.logAction({
        userId,
        action: 'account_deletion_failed',
        resourceType: 'user',
        resourceId: userId,
        details: {
          error: error.message,
          userEmail: user.email,
          userName: user.name,
        },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: error.message,
      });

      throw error;
    }

    return deletionResult;
  }

  async scheduleAccountDeletion(userId: string, deletionDate: Date): Promise<void> {
    // This would integrate with a job queue system like Bull or Agenda
    // For now, we'll just log the scheduled deletion
    this.logger.log(`Account deletion scheduled for user ${userId} on ${deletionDate}`);

    await this.auditService.logAction({
      userId,
      action: 'account_deletion_scheduled',
      resourceType: 'user',
      resourceId: userId,
      details: {
        scheduledDeletionDate: deletionDate,
      },
    });
  }

  async cancelAccountDeletion(userId: string): Promise<void> {
    this.logger.log(`Account deletion cancelled for user ${userId}`);

    await this.auditService.logAction({
      userId,
      action: 'account_deletion_cancelled',
      resourceType: 'user',
      resourceId: userId,
      details: {
        cancelledAt: new Date(),
      },
    });
  }

  // Get account deletion statistics for admin purposes
  async getDeletionStats(startDate?: Date, endDate?: Date) {
    const whereClause: any = {
      action: 'account_deletion_completed',
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const deletions = await this.prisma.auditLog.findMany({
      where: whereClause,
      select: {
        createdAt: true,
        details: true,
      },
    });

    return {
      totalDeletions: deletions.length,
      deletionsByDate: deletions.reduce((acc, deletion) => {
        const date = deletion.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      deletions,
    };
  }
}