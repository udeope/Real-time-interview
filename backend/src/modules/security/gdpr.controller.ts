import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Response,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GdprService, DataExportRequest } from './services/gdpr.service';
import { Response as ExpressResponse } from 'express';

@Controller('gdpr')
@UseGuards(JwtAuthGuard)
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  /**
   * Create data export request
   */
  @Post('export')
  @HttpCode(HttpStatus.ACCEPTED)
  async createExportRequest(
    @Request() req,
    @Body() body: { dataTypes: string[]; format?: 'json' | 'csv' },
  ) {
    const exportRequest: DataExportRequest = {
      userId: req.user.id,
      requestType: 'export',
      dataTypes: body.dataTypes,
      format: body.format || 'json',
    };

    const requestId = await this.gdprService.createExportRequest(exportRequest);
    return {
      requestId,
      message: 'Export request created. You will be notified when it is ready.',
    };
  }

  /**
   * Create data deletion request (Right to be forgotten)
   */
  @Post('delete')
  @HttpCode(HttpStatus.ACCEPTED)
  async createDeletionRequest(
    @Request() req,
    @Body() body: { dataTypes: string[]; confirmation?: boolean },
  ) {
    if (!body.confirmation) {
      throw new BadRequestException('Deletion confirmation required');
    }

    const deletionRequest: DataExportRequest = {
      userId: req.user.id,
      requestType: 'delete',
      dataTypes: body.dataTypes,
    };

    const requestId = await this.gdprService.createExportRequest(deletionRequest);
    return {
      requestId,
      message: 'Deletion request created. Your data will be permanently deleted.',
    };
  }

  /**
   * Get export request status
   */
  @Get('request/:requestId')
  async getExportRequestStatus(
    @Request() req,
    @Param('requestId') requestId: string,
  ) {
    const request = await this.gdprService.getExportRequestStatus(requestId);
    
    // Verify the request belongs to the user
    if (request.userId !== req.user.id) {
      throw new BadRequestException('Request not found');
    }

    return request;
  }

  /**
   * Download exported data
   */
  @Get('download/:fileName')
  async downloadExportFile(
    @Request() req,
    @Param('fileName') fileName: string,
    @Response() res: ExpressResponse,
  ) {
    try {
      const fileBuffer = await this.gdprService.downloadExportFile(fileName, req.user.id);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(fileBuffer);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get data processing summary
   */
  @Get('data-summary')
  async getDataProcessingSummary(@Request() req) {
    return this.gdprService.getDataProcessingSummary(req.user.id);
  }

  /**
   * Get available data types for export/deletion
   */
  @Get('data-types')
  async getAvailableDataTypes() {
    return {
      dataTypes: [
        {
          key: 'profile',
          name: 'Profile Information',
          description: 'Your personal profile data and preferences',
        },
        {
          key: 'sessions',
          name: 'Interview Sessions',
          description: 'All your interview session data and interactions',
        },
        {
          key: 'transcriptions',
          name: 'Transcriptions',
          description: 'Audio transcription data from your sessions',
        },
        {
          key: 'audio',
          name: 'Audio Data',
          description: 'Recorded audio files (if any)',
        },
        {
          key: 'practice',
          name: 'Practice Data',
          description: 'Practice session data and responses',
        },
        {
          key: 'audit',
          name: 'Activity Logs',
          description: 'Your account activity and audit logs',
        },
        {
          key: 'privacy',
          name: 'Privacy & Consent',
          description: 'Your privacy settings and consent records',
        },
        {
          key: 'all',
          name: 'All Data',
          description: 'Complete account data including profile deletion',
        },
      ],
    };
  }

  /**
   * Get GDPR compliance information
   */
  @Get('compliance-info')
  async getComplianceInfo() {
    return {
      rights: [
        {
          name: 'Right to Access',
          description: 'You can request a copy of all personal data we hold about you',
          action: 'Use the export function to download your data',
        },
        {
          name: 'Right to Rectification',
          description: 'You can request correction of inaccurate personal data',
          action: 'Update your profile information in settings',
        },
        {
          name: 'Right to Erasure',
          description: 'You can request deletion of your personal data',
          action: 'Use the deletion function to remove your data',
        },
        {
          name: 'Right to Restrict Processing',
          description: 'You can request limitation of processing of your data',
          action: 'Revoke specific consents in privacy settings',
        },
        {
          name: 'Right to Data Portability',
          description: 'You can request transfer of your data in a structured format',
          action: 'Export your data in JSON format',
        },
        {
          name: 'Right to Object',
          description: 'You can object to processing of your personal data',
          action: 'Manage your consent preferences',
        },
      ],
      dataRetention: {
        audio: '30 days (configurable)',
        transcriptions: '90 days (configurable)',
        sessions: '1 year',
        analytics: '2 years',
        auditLogs: '1 year',
      },
      contact: {
        email: 'privacy@example.com',
        address: 'Data Protection Officer, Company Address',
      },
    };
  }
}