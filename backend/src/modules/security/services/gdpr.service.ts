import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';
import { AuditService, AuditAction } from './audit.service';
import { ConsentService } from './consent.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

export interface DataExportRequest {
  userId: string;
  requestType: 'export' | 'delete';
  dataTypes: string[];
  format?: 'json' | 'csv';
}

export interface ExportedData {
  user: any;
  profile: any;
  sessions: any[];
  transcriptions: any[];
  responses: any[];
  auditLogs: any[];
  consents: any[];
  privacySettings: any;
}

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);
  private readonly exportDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly consentService: ConsentService,
    private readonly configService: ConfigService,
  ) {
    this.exportDir = this.configService.get<string>('DATA_EXPORT_DIR') || './data-exports';
  }

  /**
   * Create a data export request
   */
  async createExportRequest(request: DataExportRequest): Promise<string> {
    try {
      // Validate user exists
      const user = await this.prisma.user.findUnique({
        where: { id: request.userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Create export request record
      const exportRequest = await this.prisma.dataExportRequest.create({
        data: {
          userId: request.userId,
          requestType: request.requestType,
          requestedDataTypes: request.dataTypes,
          status: 'pending',
        },
      });

      // Log the request
      await this.auditService.logDataManagement(
        AuditAction.DATA_EXPORT_REQUEST,
        request.userId,
        exportRequest.id,
        {
          requestType: request.requestType,
          dataTypes: request.dataTypes,
        },
      );

      // Process the request asynchronously
      this.processExportRequest(exportRequest.id).catch(error => {
        this.logger.error(`Failed to process export request ${exportRequest.id}: ${error.message}`);
      });

      return exportRequest.id;
    } catch (error) {
      this.logger.error(`Failed to create export request: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process data export request
   */
  private async processExportRequest(requestId: string): Promise<void> {
    try {
      // Update status to processing
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: 'processing' },
      });

      const request = await this.prisma.dataExportRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error('Export request not found');
      }

      if (request.requestType === 'export') {
        await this.processDataExport(request);
      } else if (request.requestType === 'delete') {
        await this.processDataDeletion(request);
      }

      // Update status to completed
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      this.logger.log(`Successfully processed ${request.requestType} request ${requestId}`);
    } catch (error) {
      // Update status to failed
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });

      this.logger.error(`Failed to process export request ${requestId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process data export
   */
  private async processDataExport(request: any): Promise<void> {
    const exportData = await this.collectUserData(request.userId, request.requestedDataTypes);
    
    // Generate export file
    const fileName = `user-data-export-${request.userId}-${Date.now()}.json`;
    const filePath = path.join(this.exportDir, fileName);
    
    // Ensure export directory exists
    await fs.mkdir(this.exportDir, { recursive: true });
    
    // Write data to file
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    
    // Set expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Update request with file URL
    const exportUrl = `/api/gdpr/download/${fileName}`;
    await this.prisma.dataExportRequest.update({
      where: { id: request.id },
      data: {
        exportUrl,
        expiresAt,
      },
    });

    // Log the export
    await this.auditService.logDataManagement(
      AuditAction.DATA_EXPORT_DOWNLOAD,
      request.userId,
      request.id,
      {
        fileName,
        dataSize: (await fs.stat(filePath)).size,
        expiresAt: expiresAt.toISOString(),
      },
    );
  }

  /**
   * Process data deletion (Right to be forgotten)
   */
  private async processDataDeletion(request: any): Promise<void> {
    const userId = request.userId;
    const dataTypes = request.requestedDataTypes as string[];

    try {
      // Start transaction for data deletion
      await this.prisma.$transaction(async (tx) => {
        // Delete based on requested data types
        if (dataTypes.includes('audio') || dataTypes.includes('all')) {
          await tx.audioChunk.deleteMany({
            where: {
              session: { userId },
            },
          });
        }

        if (dataTypes.includes('transcriptions') || dataTypes.includes('all')) {
          await tx.transcriptionResult.deleteMany({
            where: {
              session: { userId },
            },
          });
        }

        if (dataTypes.includes('sessions') || dataTypes.includes('all')) {
          // Delete interactions first (foreign key constraint)
          await tx.interaction.deleteMany({
            where: {
              session: { userId },
            },
          });

          // Delete session metrics
          await tx.sessionMetrics.deleteMany({
            where: {
              session: { userId },
            },
          });

          // Delete sessions
          await tx.interviewSession.deleteMany({
            where: { userId },
          });
        }

        if (dataTypes.includes('practice') || dataTypes.includes('all')) {
          await tx.practiceResponse.deleteMany({
            where: {
              session: { userId },
            },
          });

          await tx.practiceQuestion.deleteMany({
            where: {
              session: { userId },
            },
          });

          await tx.practiceAnalytics.deleteMany({
            where: { userId },
          });

          await tx.practiceSession.deleteMany({
            where: { userId },
          });
        }

        if (dataTypes.includes('profile') || dataTypes.includes('all')) {
          await tx.userProfile.deleteMany({
            where: { userId },
          });
        }

        if (dataTypes.includes('privacy') || dataTypes.includes('all')) {
          await tx.userConsent.deleteMany({
            where: { userId },
          });

          await tx.privacySetting.deleteMany({
            where: { userId },
          });

          await tx.encryptionKey.deleteMany({
            where: { userId },
          });
        }

        if (dataTypes.includes('analytics') || dataTypes.includes('all')) {
          await tx.usagePattern.deleteMany({
            where: { userId },
          });
        }

        // If deleting all data, delete the user account
        if (dataTypes.includes('all')) {
          await tx.user.delete({
            where: { id: userId },
          });
        }
      });

      // Log the deletion
      await this.auditService.logDataManagement(
        AuditAction.DATA_DELETE_COMPLETE,
        userId,
        request.id,
        {
          deletedDataTypes: dataTypes,
          deletionDate: new Date().toISOString(),
        },
      );

      this.logger.log(`Successfully deleted data for user ${userId}: ${dataTypes.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to delete data for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: string, dataTypes: string[]): Promise<ExportedData> {
    const exportData: ExportedData = {
      user: null,
      profile: null,
      sessions: [],
      transcriptions: [],
      responses: [],
      auditLogs: [],
      consents: [],
      privacySettings: null,
    };

    try {
      // Always include basic user data
      exportData.user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          subscriptionTier: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (dataTypes.includes('profile') || dataTypes.includes('all')) {
        exportData.profile = await this.prisma.userProfile.findUnique({
          where: { userId },
        });
      }

      if (dataTypes.includes('sessions') || dataTypes.includes('all')) {
        exportData.sessions = await this.prisma.interviewSession.findMany({
          where: { userId },
          include: {
            interactions: true,
            metrics: true,
          },
        });
      }

      if (dataTypes.includes('transcriptions') || dataTypes.includes('all')) {
        exportData.transcriptions = await this.prisma.transcriptionResult.findMany({
          where: {
            session: { userId },
          },
        });
      }

      if (dataTypes.includes('practice') || dataTypes.includes('all')) {
        const practiceSessions = await this.prisma.practiceSession.findMany({
          where: { userId },
          include: {
            questions: {
              include: {
                questionBank: true,
                response: true,
              },
            },
            analytics: true,
          },
        });
        exportData.responses = practiceSessions;
      }

      if (dataTypes.includes('audit') || dataTypes.includes('all')) {
        exportData.auditLogs = await this.prisma.auditLog.findMany({
          where: { userId },
          select: {
            action: true,
            resourceType: true,
            details: true,
            success: true,
            createdAt: true,
            ipAddress: true,
          },
        });
      }

      if (dataTypes.includes('privacy') || dataTypes.includes('all')) {
        exportData.consents = await this.prisma.userConsent.findMany({
          where: { userId },
        });

        exportData.privacySettings = await this.prisma.privacySetting.findUnique({
          where: { userId },
        });
      }

      return exportData;
    } catch (error) {
      this.logger.error(`Failed to collect user data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get export request status
   */
  async getExportRequestStatus(requestId: string): Promise<any> {
    const request = await this.prisma.dataExportRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requestType: true,
        status: true,
        exportUrl: true,
        expiresAt: true,
        completedAt: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    if (!request) {
      throw new BadRequestException('Export request not found');
    }

    return request;
  }

  /**
   * Download exported data file
   */
  async downloadExportFile(fileName: string, userId: string): Promise<Buffer> {
    try {
      // Verify the request belongs to the user
      const request = await this.prisma.dataExportRequest.findFirst({
        where: {
          userId,
          exportUrl: `/api/gdpr/download/${fileName}`,
          status: 'completed',
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!request) {
        throw new BadRequestException('Export file not found or expired');
      }

      const filePath = path.join(this.exportDir, fileName);
      const fileBuffer = await fs.readFile(filePath);

      // Log the download
      await this.auditService.logDataManagement(
        AuditAction.DATA_EXPORT_DOWNLOAD,
        userId,
        request.id,
        {
          fileName,
          downloadDate: new Date().toISOString(),
        },
      );

      return fileBuffer;
    } catch (error) {
      this.logger.error(`Failed to download export file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up expired export files
   */
  async cleanupExpiredExports(): Promise<void> {
    try {
      const expiredRequests = await this.prisma.dataExportRequest.findMany({
        where: {
          status: 'completed',
          expiresAt: {
            lt: new Date(),
          },
          exportUrl: {
            not: null,
          },
        },
      });

      for (const request of expiredRequests) {
        try {
          // Extract filename from URL
          const fileName = request.exportUrl?.split('/').pop();
          if (fileName) {
            const filePath = path.join(this.exportDir, fileName);
            await fs.unlink(filePath);
          }

          // Update request to remove URL
          await this.prisma.dataExportRequest.update({
            where: { id: request.id },
            data: {
              exportUrl: null,
            },
          });
        } catch (fileError) {
          this.logger.warn(`Failed to delete expired export file for request ${request.id}: ${fileError.message}`);
        }
      }

      this.logger.log(`Cleaned up ${expiredRequests.length} expired export files`);
    } catch (error) {
      this.logger.error(`Failed to cleanup expired exports: ${error.message}`);
    }
  }

  /**
   * Get user's data processing summary (for transparency)
   */
  async getDataProcessingSummary(userId: string): Promise<any> {
    const summary = {
      dataTypes: {
        audio: 0,
        transcriptions: 0,
        sessions: 0,
        interactions: 0,
        practiceData: 0,
      },
      retentionPeriods: {},
      consents: {},
      lastActivity: null,
    };

    try {
      // Count different data types
      summary.dataTypes.audio = await this.prisma.audioChunk.count({
        where: { session: { userId } },
      });

      summary.dataTypes.transcriptions = await this.prisma.transcriptionResult.count({
        where: { session: { userId } },
      });

      summary.dataTypes.sessions = await this.prisma.interviewSession.count({
        where: { userId },
      });

      summary.dataTypes.interactions = await this.prisma.interaction.count({
        where: { session: { userId } },
      });

      summary.dataTypes.practiceData = await this.prisma.practiceSession.count({
        where: { userId },
      });

      // Get privacy settings (retention periods)
      const privacySettings = await this.prisma.privacySetting.findUnique({
        where: { userId },
      });

      if (privacySettings) {
        summary.retentionPeriods = {
          audio: privacySettings.audioRetentionDays,
          transcriptions: privacySettings.transcriptionRetentionDays,
        };
      }

      // Get consent status
      summary.consents = await this.consentService.getUserConsents(userId);

      // Get last activity
      const lastAuditLog = await this.prisma.auditLog.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      summary.lastActivity = lastAuditLog?.createdAt;

      return summary;
    } catch (error) {
      this.logger.error(`Failed to get data processing summary: ${error.message}`);
      throw error;
    }
  }
}