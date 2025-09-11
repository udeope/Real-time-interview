import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService, AuditAction } from '../services/audit.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);

  constructor(private readonly auditService: AuditService) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Capture request details
    const originalSend = res.send;
    let responseBody: any;
    let statusCode: number;

    res.send = function(body: any) {
      responseBody = body;
      statusCode = res.statusCode;
      return originalSend.call(this, body);
    };

    // Continue with request
    next();

    // Log after response is sent
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const success = statusCode < 400;

        // Determine audit action based on request
        const action = this.getAuditAction(req.method, req.path);
        
        if (action) {
          await this.auditService.log({
            userId: req.user?.id,
            action,
            resourceType: this.getResourceType(req.path),
            resourceId: this.extractResourceId(req.path, req.body),
            details: {
              method: req.method,
              path: req.path,
              statusCode,
              duration,
              userAgent: req.get('User-Agent'),
              query: req.query,
              // Only log body for certain actions (avoid logging sensitive data)
              ...(this.shouldLogBody(req.path) && { body: req.body }),
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            success,
            errorMessage: !success ? this.extractErrorMessage(responseBody) : undefined,
          });
        }
      } catch (error) {
        // Don't let audit logging failures affect the response
        this.logger.error(`Failed to log audit entry: ${error.message}`);
      }
    });
  }

  private getAuditAction(method: string, path: string): string | null {
    // Map HTTP methods and paths to audit actions
    const pathMappings: Record<string, string> = {
      // Authentication
      'POST /auth/login': AuditAction.LOGIN,
      'POST /auth/logout': AuditAction.LOGOUT,
      'POST /auth/register': AuditAction.REGISTER,
      'PUT /auth/password': AuditAction.PASSWORD_CHANGE,

      // Audio
      'POST /audio/upload': AuditAction.AUDIO_UPLOAD,
      'DELETE /audio': AuditAction.AUDIO_DELETE,

      // Transcription
      'POST /transcription/start': AuditAction.TRANSCRIPTION_START,
      'GET /transcription': AuditAction.TRANSCRIPTION_VIEW,
      'DELETE /transcription': AuditAction.TRANSCRIPTION_DELETE,

      // Response generation
      'POST /response/generate': AuditAction.RESPONSE_GENERATION,
      'GET /response': AuditAction.RESPONSE_VIEW,
      'POST /response/copy': AuditAction.RESPONSE_COPY,

      // Sessions
      'POST /interview-session': AuditAction.SESSION_CREATE,
      'PUT /interview-session/start': AuditAction.SESSION_START,
      'PUT /interview-session/end': AuditAction.SESSION_END,
      'DELETE /interview-session': AuditAction.SESSION_DELETE,

      // Privacy and consent
      'PUT /consent': AuditAction.CONSENT_GRANT,
      'DELETE /consent': AuditAction.CONSENT_REVOKE,
      'PUT /privacy-settings': AuditAction.PRIVACY_SETTINGS_UPDATE,

      // Data management
      'POST /gdpr/export': AuditAction.DATA_EXPORT_REQUEST,
      'GET /gdpr/download': AuditAction.DATA_EXPORT_DOWNLOAD,
      'POST /gdpr/delete': AuditAction.DATA_DELETE_REQUEST,

      // Profile
      'GET /user/profile': AuditAction.PROFILE_VIEW,
      'PUT /user/profile': AuditAction.PROFILE_UPDATE,
      'DELETE /user/profile': AuditAction.PROFILE_DELETE,
    };

    const key = `${method} ${this.normalizePath(path)}`;
    return pathMappings[key] || null;
  }

  private getResourceType(path: string): string | undefined {
    if (path.includes('/audio')) return 'audio';
    if (path.includes('/transcription')) return 'transcription';
    if (path.includes('/response')) return 'response';
    if (path.includes('/interview-session')) return 'session';
    if (path.includes('/user') || path.includes('/profile')) return 'user';
    if (path.includes('/consent') || path.includes('/privacy')) return 'privacy';
    if (path.includes('/gdpr')) return 'data_request';
    return undefined;
  }

  private extractResourceId(path: string, body: any): string | undefined {
    // Extract ID from path parameters
    const idMatch = path.match(/\/([a-f0-9-]{36})/i); // UUID pattern
    if (idMatch) {
      return idMatch[1];
    }

    // Extract ID from request body
    if (body && typeof body === 'object') {
      return body.id || body.sessionId || body.userId;
    }

    return undefined;
  }

  private shouldLogBody(path: string): boolean {
    // Only log body for certain endpoints (avoid sensitive data)
    const logBodyPaths = [
      '/consent',
      '/privacy-settings',
      '/gdpr',
    ];

    return logBodyPaths.some(logPath => path.includes(logPath));
  }

  private extractErrorMessage(responseBody: any): string | undefined {
    if (typeof responseBody === 'string') {
      try {
        const parsed = JSON.parse(responseBody);
        return parsed.message || parsed.error;
      } catch {
        return responseBody;
      }
    }

    if (typeof responseBody === 'object' && responseBody) {
      return responseBody.message || responseBody.error;
    }

    return undefined;
  }

  private normalizePath(path: string): string {
    // Replace UUIDs and other IDs with placeholders for mapping
    return path
      .replace(/\/[a-f0-9-]{36}/gi, '/:id') // UUID
      .replace(/\/\d+/g, '/:id') // Numeric ID
      .replace(/\/[a-zA-Z0-9_-]+\.(json|csv|pdf)$/i, '/:file'); // File downloads
  }
}