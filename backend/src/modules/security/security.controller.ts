import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './services/audit.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { DataRetentionService } from './services/data-retention.service';
import { EncryptionService } from './services/encryption.service';

@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(
    private readonly auditService: AuditService,
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly dataRetentionService: DataRetentionService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Get user's audit logs
   */
  @Get('audit-logs')
  async getUserAuditLogs(
    @Request() req,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.auditService.getUserAuditLogs(req.user.id, limit, offset);
  }

  /**
   * Get session audit logs
   */
  @Get('audit-logs/session/:sessionId')
  async getSessionAuditLogs(@Param('sessionId') sessionId: string) {
    return this.auditService.getSessionAuditLogs(sessionId);
  }

  /**
   * Get user's risk score
   */
  @Get('risk-score')
  async getUserRiskScore(@Request() req) {
    const riskScore = await this.fraudDetectionService.getUserRiskScore(req.user.id);
    return { riskScore };
  }

  /**
   * Analyze user activity for fraud detection
   */
  @Post('analyze-activity')
  @HttpCode(HttpStatus.OK)
  async analyzeUserActivity(@Request() req) {
    const alerts = await this.fraudDetectionService.analyzeUserActivity(req.user.id);
    return { alerts };
  }

  /**
   * Get data retention policies
   */
  @Get('retention-policies')
  async getRetentionPolicies() {
    return this.dataRetentionService.getRetentionPolicies();
  }

  /**
   * Get cleanup statistics
   */
  @Get('cleanup-stats')
  async getCleanupStatistics(@Query('days') days = 30) {
    return this.dataRetentionService.getCleanupStatistics(days);
  }

  /**
   * Manually trigger user data cleanup
   */
  @Post('cleanup-user-data')
  @HttpCode(HttpStatus.OK)
  async cleanupUserData(@Request() req) {
    const results = await this.dataRetentionService.cleanupUserData(req.user.id);
    return { results };
  }

  /**
   * Rotate user encryption keys
   */
  @Post('rotate-keys')
  @HttpCode(HttpStatus.OK)
  async rotateEncryptionKeys(@Request() req) {
    await this.encryptionService.rotateUserKeys(req.user.id);
    return { message: 'Encryption keys rotated successfully' };
  }

  /**
   * Get security events (admin only)
   */
  @Get('security-events')
  async getSecurityEvents(
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ) {
    // Note: In a real implementation, add admin role check
    return this.auditService.getSecurityLogs(limit, offset);
  }

  /**
   * Get flagged users (admin only)
   */
  @Get('flagged-users')
  async getFlaggedUsers(@Query('limit') limit = 50) {
    // Note: In a real implementation, add admin role check
    return this.fraudDetectionService.getFlaggedUsers(limit);
  }

  /**
   * Mark usage pattern as reviewed (admin only)
   */
  @Put('usage-pattern/:patternId/review')
  async markPatternAsReviewed(
    @Param('patternId') patternId: string,
    @Body() body: { reviewedBy: string; notes?: string },
  ) {
    // Note: In a real implementation, add admin role check
    await this.fraudDetectionService.markAsReviewed(patternId, body.reviewedBy, body.notes);
    return { message: 'Pattern marked as reviewed' };
  }

  /**
   * Update retention policy (admin only)
   */
  @Put('retention-policy/:dataType')
  async updateRetentionPolicy(
    @Param('dataType') dataType: string,
    @Body() body: { retentionDays: number; autoDelete?: boolean },
  ) {
    // Note: In a real implementation, add admin role check
    await this.dataRetentionService.updateRetentionPolicy(
      dataType,
      body.retentionDays,
      body.autoDelete,
    );
    return { message: 'Retention policy updated' };
  }
}