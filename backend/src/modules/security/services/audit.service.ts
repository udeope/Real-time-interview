import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';

export interface AuditLogEntry {
  userId?: string;
  sessionId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export enum AuditAction {
  // Authentication
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PASSWORD_CHANGE = 'password_change',
  
  // Audio processing
  AUDIO_CAPTURE_START = 'audio_capture_start',
  AUDIO_CAPTURE_STOP = 'audio_capture_stop',
  AUDIO_UPLOAD = 'audio_upload',
  AUDIO_DELETE = 'audio_delete',
  
  // Transcription
  TRANSCRIPTION_START = 'transcription_start',
  TRANSCRIPTION_COMPLETE = 'transcription_complete',
  TRANSCRIPTION_VIEW = 'transcription_view',
  TRANSCRIPTION_DELETE = 'transcription_delete',
  
  // Response generation
  RESPONSE_GENERATION = 'response_generation',
  RESPONSE_VIEW = 'response_view',
  RESPONSE_COPY = 'response_copy',
  
  // Session management
  SESSION_CREATE = 'session_create',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  SESSION_DELETE = 'session_delete',
  
  // Privacy and consent
  CONSENT_GRANT = 'consent_grant',
  CONSENT_REVOKE = 'consent_revoke',
  PRIVACY_SETTINGS_UPDATE = 'privacy_settings_update',
  
  // Data management
  DATA_EXPORT_REQUEST = 'data_export_request',
  DATA_EXPORT_DOWNLOAD = 'data_export_download',
  DATA_DELETE_REQUEST = 'data_delete_request',
  DATA_DELETE_COMPLETE = 'data_delete_complete',
  
  // Profile management
  PROFILE_VIEW = 'profile_view',
  PROFILE_UPDATE = 'profile_update',
  PROFILE_DELETE = 'profile_delete',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          sessionId: entry.sessionId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          details: entry.details,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          success: entry.success ?? true,
          errorMessage: entry.errorMessage,
        },
      });

      // Also log to application logger for immediate monitoring
      const logMessage = `Audit: ${entry.action} by user ${entry.userId} ${entry.success ? 'succeeded' : 'failed'}`;
      if (entry.success !== false) {
        this.logger.log(logMessage);
      } else {
        this.logger.warn(`${logMessage}: ${entry.errorMessage}`);
      }
    } catch (error) {
      // Don't let audit logging failures break the main application
      this.logger.error(`Failed to log audit entry: ${error.message}`, error.stack);
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(action: AuditAction, userId: string, success: boolean, details?: Record<string, any>, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action,
      resourceType: 'user',
      resourceId: userId,
      details,
      ipAddress,
      userAgent,
      success,
    });
  }

  /**
   * Log audio processing events
   */
  async logAudio(action: AuditAction, userId: string, sessionId?: string, audioId?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      sessionId,
      action,
      resourceType: 'audio',
      resourceId: audioId,
      details,
    });
  }

  /**
   * Log transcription events
   */
  async logTranscription(action: AuditAction, userId: string, sessionId?: string, transcriptionId?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      sessionId,
      action,
      resourceType: 'transcription',
      resourceId: transcriptionId,
      details,
    });
  }

  /**
   * Log session events
   */
  async logSession(action: AuditAction, userId: string, sessionId: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      sessionId,
      action,
      resourceType: 'session',
      resourceId: sessionId,
      details,
    });
  }

  /**
   * Log privacy and consent events
   */
  async logPrivacy(action: AuditAction, userId: string, details?: Record<string, any>, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action,
      resourceType: 'privacy',
      resourceId: userId,
      details,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log data management events
   */
  async logDataManagement(action: AuditAction, userId: string, requestId?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action,
      resourceType: 'data_request',
      resourceId: requestId,
      details,
    });
  }

  /**
   * Log security events
   */
  async logSecurity(action: AuditAction, userId?: string, details?: Record<string, any>, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action,
      resourceType: 'security',
      details,
      ipAddress,
      userAgent,
      success: false, // Security events are typically failures/warnings
    });
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(userId: string, limit = 100, offset = 0) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        action: true,
        resourceType: true,
        details: true,
        success: true,
        createdAt: true,
        ipAddress: true,
      },
    });
  }

  /**
   * Get audit logs for a session
   */
  async getSessionAuditLogs(sessionId: string) {
    return this.prisma.auditLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        action: true,
        resourceType: true,
        details: true,
        success: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get security-related audit logs
   */
  async getSecurityLogs(limit = 100, offset = 0) {
    const securityActions = [
      AuditAction.SUSPICIOUS_ACTIVITY,
      AuditAction.RATE_LIMIT_EXCEEDED,
      AuditAction.UNAUTHORIZED_ACCESS,
    ];

    return this.prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { in: securityActions } },
          { success: false },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupOldLogs(retentionDays = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old audit logs older than ${retentionDays} days`);
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to cleanup old audit logs: ${error.message}`);
      throw error;
    }
  }
}