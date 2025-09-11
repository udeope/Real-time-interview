import { Controller, Get, Post, Body, UseGuards, Req, Param, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DataExportService, ExportRequest } from './data-export.service';
import { Request, Response } from 'express';

@ApiTags('Data Export')
@Controller('integrations/data-export')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataExportController {
  constructor(private readonly dataExportService: DataExportService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new data export' })
  @ApiResponse({ status: 201, description: 'Export created successfully' })
  async createExport(
    @Body() body: Omit<ExportRequest, 'userId'>,
    @Req() req: Request,
  ) {
    const exportRequest: ExportRequest = {
      ...body,
      userId: req.user.id,
    };

    const result = await this.dataExportService.createExport(exportRequest);
    
    return {
      message: 'Export created successfully',
      export: result,
    };
  }

  @Get('status/:exportId')
  @ApiOperation({ summary: 'Get export status' })
  @ApiResponse({ status: 200, description: 'Export status retrieved successfully' })
  async getExportStatus(
    @Param('exportId') exportId: string,
    @Req() req: Request,
  ) {
    const status = await this.dataExportService.getExportStatus(exportId, req.user.id);
    
    if (!status) {
      return {
        message: 'Export not found or expired',
        exportId,
      };
    }

    return {
      exportId,
      status,
    };
  }

  @Get('download/:exportId')
  @ApiOperation({ summary: 'Download export file' })
  @ApiResponse({ status: 200, description: 'Export file downloaded successfully' })
  async downloadExport(
    @Param('exportId') exportId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const fileBuffer = await this.dataExportService.downloadExport(exportId, req.user.id);
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="export-${exportId}.zip"`);
      res.setHeader('Content-Length', fileBuffer.length);
      
      res.send(fileBuffer);
    } catch (error) {
      res.status(404).json({
        message: 'Export file not found or expired',
        exportId,
      });
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user export history' })
  @ApiResponse({ status: 200, description: 'Export history retrieved successfully' })
  async getExportHistory(
    @Req() req: Request,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    // This would fetch export history from database
    return {
      exports: [],
      total: 0,
      limit: limit || 10,
      offset: offset || 0,
    };
  }

  @Post('quick-export')
  @ApiOperation({ summary: 'Create a quick export with common settings' })
  @ApiResponse({ status: 201, description: 'Quick export created successfully' })
  async createQuickExport(
    @Body() body: { type: 'complete' | 'sessions-only' | 'profile-only' },
    @Req() req: Request,
  ) {
    let exportRequest: ExportRequest;

    switch (body.type) {
      case 'complete':
        exportRequest = {
          userId: req.user.id,
          format: 'zip',
          dataTypes: ['profile', 'sessions', 'transcriptions', 'responses', 'analytics', 'practice_sessions', 'integrations'],
          includeAudio: false,
          includeTranscriptions: true,
          includeResponses: true,
          includeAnalytics: true,
        };
        break;
      case 'sessions-only':
        exportRequest = {
          userId: req.user.id,
          format: 'json',
          dataTypes: ['sessions', 'transcriptions', 'responses'],
          includeTranscriptions: true,
          includeResponses: true,
          includeAnalytics: false,
        };
        break;
      case 'profile-only':
        exportRequest = {
          userId: req.user.id,
          format: 'json',
          dataTypes: ['profile', 'integrations'],
          includeTranscriptions: false,
          includeResponses: false,
          includeAnalytics: false,
        };
        break;
      default:
        throw new Error('Invalid quick export type');
    }

    const result = await this.dataExportService.createExport(exportRequest);
    
    return {
      message: `${body.type} export created successfully`,
      export: result,
    };
  }

  @Post('gdpr-export')
  @ApiOperation({ summary: 'Create GDPR-compliant complete data export' })
  @ApiResponse({ status: 201, description: 'GDPR export created successfully' })
  async createGDPRExport(@Req() req: Request) {
    const exportRequest: ExportRequest = {
      userId: req.user.id,
      format: 'zip',
      dataTypes: ['profile', 'sessions', 'transcriptions', 'responses', 'analytics', 'practice_sessions', 'integrations'],
      includeAudio: true,
      includeTranscriptions: true,
      includeResponses: true,
      includeAnalytics: true,
    };

    const result = await this.dataExportService.createExport(exportRequest);
    
    return {
      message: 'GDPR-compliant data export created successfully',
      export: result,
      notice: 'This export contains all your personal data as required by GDPR Article 20 (Right to Data Portability)',
    };
  }

  @Get('formats')
  @ApiOperation({ summary: 'Get available export formats and data types' })
  @ApiResponse({ status: 200, description: 'Export options retrieved successfully' })
  async getExportOptions() {
    return {
      formats: [
        { value: 'json', label: 'JSON', description: 'Machine-readable JSON format' },
        { value: 'csv', label: 'CSV', description: 'Comma-separated values for spreadsheets' },
        { value: 'pdf', label: 'PDF', description: 'Human-readable PDF document' },
        { value: 'zip', label: 'ZIP Archive', description: 'Multiple formats in a compressed archive' },
      ],
      dataTypes: [
        { value: 'profile', label: 'User Profile', description: 'Personal information and preferences' },
        { value: 'sessions', label: 'Interview Sessions', description: 'Interview session records and metadata' },
        { value: 'transcriptions', label: 'Transcriptions', description: 'Audio transcription data' },
        { value: 'responses', label: 'AI Responses', description: 'Generated response suggestions' },
        { value: 'analytics', label: 'Analytics', description: 'Usage statistics and performance metrics' },
        { value: 'practice_sessions', label: 'Practice Sessions', description: 'Practice session records and feedback' },
        { value: 'integrations', label: 'Integrations', description: 'Connected third-party services' },
      ],
      options: [
        { value: 'includeAudio', label: 'Include Audio Files', description: 'Include original audio recordings (large file size)' },
        { value: 'includeTranscriptions', label: 'Include Transcriptions', description: 'Include text transcriptions of audio' },
        { value: 'includeResponses', label: 'Include AI Responses', description: 'Include AI-generated response suggestions' },
        { value: 'includeAnalytics', label: 'Include Analytics', description: 'Include usage and performance data' },
      ],
    };
  }
}