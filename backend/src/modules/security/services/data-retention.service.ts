import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../config/prisma.service';
import { AuditService, AuditAction } from './audit.service';

export interface RetentionPolicy {
  dataType: string;
  retentionDays: number;
  autoDelete: boolean;
  description?: string;
}

export interface CleanupResult {
  dataType: string;
  deletedCount: number;
  errors: string[];
}

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get all active retention policies
   */
  async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    const policies = await this.prisma.dataRetentionPolicy.findMany({
      where: { isActive: true },
      orderBy: { dataType: 'asc' },
    });

    return policies.map(policy => ({
      dataType: policy.dataType,
      retentionDays: policy.retentionDays,
      autoDelete: policy.autoDelete,
      description: policy.description,
    }));
  }

  /**
   * Update retention policy for a data type
   */
  async updateRetentionPolicy(dataType: string, retentionDays: number, autoDelete = true): Promise<void> {
    try {
      await this.prisma.dataRetentionPolicy.upsert({
        where: { dataType },
        update: {
          retentionDays,
          autoDelete,
          updatedAt: new Date(),
        },
        create: {
          dataType,
          retentionDays,
          autoDelete,
          description: `Retention policy for ${dataType} data`,
        },
      });

      this.logger.log(`Updated retention policy for ${dataType}: ${retentionDays} days`);
    } catch (error) {
      this.logger.error(`Failed to update retention policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up expired audio data
   */
  async cleanupAudioData(retentionDays: number): Promise<CleanupResult> {
    const result: CleanupResult = {
      dataType: 'audio',
      deletedCount: 0,
      errors: [],
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete audio chunks older than retention period
      const deletedChunks = await this.prisma.audioChunk.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      result.deletedCount = deletedChunks.count;
      
      if (result.deletedCount > 0) {
        this.logger.log(`Cleaned up ${result.deletedCount} audio chunks older than ${retentionDays} days`);
        
        await this.auditService.log({
          action: AuditAction.DATA_DELETE_COMPLETE,
          resourceType: 'audio',
          details: {
            dataType: 'audio',
            deletedCount: result.deletedCount,
            retentionDays,
            cutoffDate: cutoffDate.toISOString(),
          },
          success: true,
        });
      }
    } catch (error) {
      result.errors.push(`Audio cleanup failed: ${error.message}`);
      this.logger.error(`Audio cleanup failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Clean up expired transcription data
   */
  async cleanupTranscriptionData(retentionDays: number): Promise<CleanupResult> {
    const result: CleanupResult = {
      dataType: 'transcription',
      deletedCount: 0,
      errors: [],
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete transcription results older than retention period
      const deletedTranscriptions = await this.prisma.transcriptionResult.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      // Also clean up transcription cache
      const deletedCache = await this.prisma.transcriptionCache.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      result.deletedCount = deletedTranscriptions.count + deletedCache.count;
      
      if (result.deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedTranscriptions.count} transcriptions and ${deletedCache.count} cache entries older than ${retentionDays} days`);
        
        await this.auditService.log({
          action: AuditAction.DATA_DELETE_COMPLETE,
          resourceType: 'transcription',
          details: {
            dataType: 'transcription',
            deletedTranscriptions: deletedTranscriptions.count,
            deletedCache: deletedCache.count,
            retentionDays,
            cutoffDate: cutoffDate.toISOString(),
          },
          success: true,
        });
      }
    } catch (error) {
      result.errors.push(`Transcription cleanup failed: ${error.message}`);
      this.logger.error(`Transcription cleanup failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Clean up expired session data
   */
  async cleanupSessionData(retentionDays: number): Promise<CleanupResult> {
    const result: CleanupResult = {
      dataType: 'session',
      deletedCount: 0,
      errors: [],
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Get sessions to delete (with their related data)
      const sessionsToDelete = await this.prisma.interviewSession.findMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
        select: { id: true },
      });

      if (sessionsToDelete.length > 0) {
        const sessionIds = sessionsToDelete.map(s => s.id);

        // Delete related data first (due to foreign key constraints)
        await this.prisma.interaction.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });

        await this.prisma.sessionMetrics.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });

        // Delete sessions
        const deletedSessions = await this.prisma.interviewSession.deleteMany({
          where: { id: { in: sessionIds } },
        });

        result.deletedCount = deletedSessions.count;
        
        this.logger.log(`Cleaned up ${result.deletedCount} sessions older than ${retentionDays} days`);
        
        await this.auditService.log({
          action: AuditAction.DATA_DELETE_COMPLETE,
          resourceType: 'session',
          details: {
            dataType: 'session',
            deletedCount: result.deletedCount,
            retentionDays,
            cutoffDate: cutoffDate.toISOString(),
          },
          success: true,
        });
      }
    } catch (error) {
      result.errors.push(`Session cleanup failed: ${error.message}`);
      this.logger.error(`Session cleanup failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Clean up expired analytics data
   */
  async cleanupAnalyticsData(retentionDays: number): Promise<CleanupResult> {
    const result: CleanupResult = {
      dataType: 'analytics',
      deletedCount: 0,
      errors: [],
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete practice analytics older than retention period
      const deletedAnalytics = await this.prisma.practiceAnalytics.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      // Delete usage patterns older than retention period
      const deletedPatterns = await this.prisma.usagePattern.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      result.deletedCount = deletedAnalytics.count + deletedPatterns.count;
      
      if (result.deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedAnalytics.count} analytics records and ${deletedPatterns.count} usage patterns older than ${retentionDays} days`);
        
        await this.auditService.log({
          action: AuditAction.DATA_DELETE_COMPLETE,
          resourceType: 'analytics',
          details: {
            dataType: 'analytics',
            deletedAnalytics: deletedAnalytics.count,
            deletedPatterns: deletedPatterns.count,
            retentionDays,
            cutoffDate: cutoffDate.toISOString(),
          },
          success: true,
        });
      }
    } catch (error) {
      result.errors.push(`Analytics cleanup failed: ${error.message}`);
      this.logger.error(`Analytics cleanup failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Clean up user-specific data based on their privacy settings
   */
  async cleanupUserData(userId: string): Promise<CleanupResult[]> {
    const results: CleanupResult[] = [];

    try {
      // Get user's privacy settings
      const privacySettings = await this.prisma.privacySetting.findUnique({
        where: { userId },
      });

      if (!privacySettings) {
        return results;
      }

      // Clean up audio data based on user's retention preference
      if (privacySettings.audioRetentionDays > 0) {
        const audioResult = await this.cleanupUserAudioData(userId, privacySettings.audioRetentionDays);
        results.push(audioResult);
      }

      // Clean up transcription data based on user's retention preference
      if (privacySettings.transcriptionRetentionDays > 0) {
        const transcriptionResult = await this.cleanupUserTranscriptionData(userId, privacySettings.transcriptionRetentionDays);
        results.push(transcriptionResult);
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to cleanup user data for ${userId}: ${error.message}`);
      return results;
    }
  }

  /**
   * Clean up audio data for specific user
   */
  private async cleanupUserAudioData(userId: string, retentionDays: number): Promise<CleanupResult> {
    const result: CleanupResult = {
      dataType: 'user_audio',
      deletedCount: 0,
      errors: [],
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedChunks = await this.prisma.audioChunk.deleteMany({
        where: {
          session: {
            userId,
          },
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      result.deletedCount = deletedChunks.count;
      
      if (result.deletedCount > 0) {
        await this.auditService.logDataManagement(
          AuditAction.DATA_DELETE_COMPLETE,
          userId,
          undefined,
          {
            dataType: 'user_audio',
            deletedCount: result.deletedCount,
            retentionDays,
          },
        );
      }
    } catch (error) {
      result.errors.push(`User audio cleanup failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Clean up transcription data for specific user
   */
  private async cleanupUserTranscriptionData(userId: string, retentionDays: number): Promise<CleanupResult> {
    const result: CleanupResult = {
      dataType: 'user_transcription',
      deletedCount: 0,
      errors: [],
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedTranscriptions = await this.prisma.transcriptionResult.deleteMany({
        where: {
          session: {
            userId,
          },
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      result.deletedCount = deletedTranscriptions.count;
      
      if (result.deletedCount > 0) {
        await this.auditService.logDataManagement(
          AuditAction.DATA_DELETE_COMPLETE,
          userId,
          undefined,
          {
            dataType: 'user_transcription',
            deletedCount: result.deletedCount,
            retentionDays,
          },
        );
      }
    } catch (error) {
      result.errors.push(`User transcription cleanup failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Run automated cleanup based on retention policies
   * Scheduled to run daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runAutomatedCleanup(): Promise<void> {
    this.logger.log('Starting automated data cleanup...');

    try {
      const policies = await this.getRetentionPolicies();
      const results: CleanupResult[] = [];

      for (const policy of policies) {
        if (!policy.autoDelete) {
          continue;
        }

        let result: CleanupResult;

        switch (policy.dataType) {
          case 'audio':
            result = await this.cleanupAudioData(policy.retentionDays);
            break;
          case 'transcription':
            result = await this.cleanupTranscriptionData(policy.retentionDays);
            break;
          case 'session':
            result = await this.cleanupSessionData(policy.retentionDays);
            break;
          case 'analytics':
            result = await this.cleanupAnalyticsData(policy.retentionDays);
            break;
          default:
            continue;
        }

        results.push(result);
      }

      // Clean up old audit logs (keep for 1 year by default)
      await this.auditService.cleanupOldLogs(365);

      const totalDeleted = results.reduce((sum, result) => sum + result.deletedCount, 0);
      const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);

      this.logger.log(`Automated cleanup completed: ${totalDeleted} records deleted, ${totalErrors} errors`);

      if (totalErrors > 0) {
        const allErrors = results.flatMap(result => result.errors);
        this.logger.error(`Cleanup errors: ${allErrors.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(`Automated cleanup failed: ${error.message}`);
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStatistics(days = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cleanupLogs = await this.prisma.auditLog.findMany({
      where: {
        action: AuditAction.DATA_DELETE_COMPLETE,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        details: true,
        createdAt: true,
      },
    });

    const stats = cleanupLogs.reduce((acc, log) => {
      const details = log.details as any;
      const dataType = details?.dataType || 'unknown';
      const deletedCount = details?.deletedCount || 0;

      if (!acc[dataType]) {
        acc[dataType] = {
          totalDeleted: 0,
          cleanupCount: 0,
          lastCleanup: null,
        };
      }

      acc[dataType].totalDeleted += deletedCount;
      acc[dataType].cleanupCount += 1;
      
      if (!acc[dataType].lastCleanup || log.createdAt > acc[dataType].lastCleanup) {
        acc[dataType].lastCleanup = log.createdAt;
      }

      return acc;
    }, {} as Record<string, any>);

    return stats;
  }
}