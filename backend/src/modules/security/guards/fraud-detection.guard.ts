import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { FraudDetectionService } from '../services/fraud-detection.service';
import { AuditService, AuditAction } from '../services/audit.service';

@Injectable()
export class FraudDetectionGuard implements CanActivate {
  private readonly logger = new Logger(FraudDetectionGuard.name);

  constructor(
    private fraudDetectionService: FraudDetectionService,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let auth guard handle authentication
    }

    try {
      // Check if user should be blocked due to high risk score
      const shouldBlock = await this.fraudDetectionService.shouldBlockUser(user.id);
      
      if (shouldBlock) {
        // Log the blocked attempt
        await this.auditService.logSecurity(
          AuditAction.UNAUTHORIZED_ACCESS,
          user.id,
          {
            reason: 'High fraud risk score',
            endpoint: request.url,
            method: request.method,
          },
          request.ip,
          request.get('User-Agent'),
        );

        throw new ForbiddenException(
          'Account temporarily restricted due to suspicious activity. Please contact support.',
        );
      }

      // Analyze user activity in background (don't block request)
      this.fraudDetectionService.analyzeUserActivity(user.id).catch(error => {
        this.logger.error(`Failed to analyze user activity: ${error.message}`);
      });

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // Don't block requests if fraud detection fails
      this.logger.error(`Fraud detection guard error: ${error.message}`);
      return true;
    }
  }
}