import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsentService, ConsentType, ConsentRequest } from './services/consent.service';

@Controller('consent')
@UseGuards(JwtAuthGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  /**
   * Get all user consents
   */
  @Get()
  async getUserConsents(@Request() req) {
    return this.consentService.getUserConsents(req.user.id);
  }

  /**
   * Check if user has specific consent
   */
  @Get(':consentType')
  async hasConsent(
    @Request() req,
    @Param('consentType') consentType: ConsentType,
  ) {
    const hasConsent = await this.consentService.hasConsent(req.user.id, consentType);
    return { hasConsent };
  }

  /**
   * Get missing required consents
   */
  @Get('missing/required')
  async getMissingRequiredConsents(@Request() req) {
    const missing = await this.consentService.getMissingRequiredConsents(req.user.id);
    return { missingConsents: missing };
  }

  /**
   * Update consent
   */
  @Put(':consentType')
  @HttpCode(HttpStatus.OK)
  async updateConsent(
    @Request() req,
    @Param('consentType') consentType: ConsentType,
    @Body() body: { granted: boolean; version?: string },
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const consentRequest: ConsentRequest = {
      consentType,
      granted: body.granted,
      version: body.version || '1.0.0',
      ipAddress,
      userAgent,
    };

    await this.consentService.updateConsent(req.user.id, consentRequest);
    return { message: 'Consent updated successfully' };
  }

  /**
   * Grant multiple consents (typically used during onboarding)
   */
  @Post('bulk-grant')
  @HttpCode(HttpStatus.OK)
  async grantMultipleConsents(
    @Request() req,
    @Body() body: { consentTypes: ConsentType[] },
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.consentService.grantMultipleConsents(
      req.user.id,
      body.consentTypes,
      ipAddress,
      userAgent,
    );
    return { message: 'Consents granted successfully' };
  }

  /**
   * Revoke all consents
   */
  @Post('revoke-all')
  @HttpCode(HttpStatus.OK)
  async revokeAllConsents(
    @Request() req,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.consentService.revokeAllConsents(req.user.id, ipAddress, userAgent);
    return { message: 'All consents revoked successfully' };
  }

  /**
   * Get consent history
   */
  @Get('history/:consentType?')
  async getConsentHistory(
    @Request() req,
    @Param('consentType') consentType?: ConsentType,
  ) {
    return this.consentService.getConsentHistory(req.user.id, consentType);
  }

  /**
   * Validate consents for action
   */
  @Post('validate/:action')
  @HttpCode(HttpStatus.OK)
  async validateConsentsForAction(
    @Request() req,
    @Param('action') action: string,
  ) {
    try {
      await this.consentService.validateConsentsForAction(req.user.id, action);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get consent requirements for action
   */
  @Get('requirements/:action')
  async getConsentRequirements(@Param('action') action: string) {
    const requiredConsents = this.consentService.isConsentRequiredForAction(action);
    return { requiredConsents };
  }

  /**
   * Get consent statistics (admin only)
   */
  @Get('admin/statistics')
  async getConsentStatistics() {
    // Note: In a real implementation, add admin role check
    return this.consentService.getConsentStatistics();
  }
}