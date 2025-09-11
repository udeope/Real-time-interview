import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as archiver from 'archiver';
import { InterviewSessionService } from '../../interview-session/interview-session.service';
import { UserService } from '../../user/user.service';

export interface ExportRequest {
  userId: string;
  format: 'json' | 'csv' | 'pdf' | 'zip';
  dataTypes: ExportDataType[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  includeAudio?: boolean;
  includeTranscriptions?: boolean;
  includeResponses?: boolean;
  includeAnalytics?: boolean;
}

export type ExportDataType = 
  | 'profile' 
  | 'sessions' 
  | 'transcriptions' 
  | 'responses' 
  | 'analytics' 
  | 'practice_sessions'
  | 'integrations';

export interface ExportResult {
  exportId: string;
  downloadUrl: string;
  expiresAt: Date;
  fileSize: number;
  format: string;
  createdAt: Date;
}

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);
  private readonly exportDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly interviewSessionService: InterviewSessionService,
    private readonly userService: UserService,
  ) {
    this.exportDir = this.configService.get<string>('EXPORT_DIRECTORY') || './exports';
  }

  async createExport(request: ExportRequest): Promise<ExportResult> {
    const exportId = this.generateExportId();
    const exportPath = path.join(this.exportDir, exportId);
    
    try {
      // Create export directory
      await fs.mkdir(exportPath, { recursive: true });

      // Collect data based on request
      const exportData = await this.collectExportData(request);

      // Generate files based on format
      let filePath: string;
      if (request.format === 'zip') {
        filePath = await this.createZipExport(exportPath, exportData, request);
      } else {
        filePath = await this.createSingleFileExport(exportPath, exportData, request);
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Generate download URL (would be signed URL in production)
      const downloadUrl = `/api/exports/${exportId}/download`;
      
      // Set expiration (24 hours)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result: ExportResult = {
        exportId,
        downloadUrl,
        expiresAt,
        fileSize: stats.size,
        format: request.format,
        createdAt: new Date(),
      };

      // Store export metadata in database
      await this.storeExportMetadata(result, request.userId);

      this.logger.log(`Export created successfully: ${exportId}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to create export: ${error.message}`, error);
      throw new BadRequestException('Failed to create data export');
    }
  }

  async getExportStatus(exportId: string, userId: string): Promise<ExportResult | null> {
    // This would fetch from database
    // For now, returning null
    return null;
  }

  async downloadExport(exportId: string, userId: string): Promise<Buffer> {
    const exportPath = path.join(this.exportDir, exportId);
    
    try {
      // Find the export file
      const files = await fs.readdir(exportPath);
      if (files.length === 0) {
        throw new Error('Export file not found');
      }

      const filePath = path.join(exportPath, files[0]);
      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error(`Failed to download export: ${error.message}`, error);
      throw new BadRequestException('Export file not found or expired');
    }
  }

  async deleteExpiredExports(): Promise<void> {
    try {
      const exports = await fs.readdir(this.exportDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const exportId of exports) {
        const exportPath = path.join(this.exportDir, exportId);
        const stats = await fs.stat(exportPath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.rm(exportPath, { recursive: true, force: true });
          this.logger.log(`Deleted expired export: ${exportId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to clean up expired exports: ${error.message}`, error);
    }
  }

  private async collectExportData(request: ExportRequest): Promise<any> {
    const data: any = {};

    // Collect user profile data
    if (request.dataTypes.includes('profile')) {
      data.profile = await this.collectProfileData(request.userId);
    }

    // Collect interview sessions
    if (request.dataTypes.includes('sessions')) {
      data.sessions = await this.collectSessionData(request.userId, request.dateRange);
    }

    // Collect transcriptions
    if (request.dataTypes.includes('transcriptions') && request.includeTranscriptions) {
      data.transcriptions = await this.collectTranscriptionData(request.userId, request.dateRange);
    }

    // Collect responses
    if (request.dataTypes.includes('responses') && request.includeResponses) {
      data.responses = await this.collectResponseData(request.userId, request.dateRange);
    }

    // Collect analytics
    if (request.dataTypes.includes('analytics') && request.includeAnalytics) {
      data.analytics = await this.collectAnalyticsData(request.userId, request.dateRange);
    }

    // Collect practice sessions
    if (request.dataTypes.includes('practice_sessions')) {
      data.practiceSessions = await this.collectPracticeSessionData(request.userId, request.dateRange);
    }

    // Collect integrations
    if (request.dataTypes.includes('integrations')) {
      data.integrations = await this.collectIntegrationData(request.userId);
    }

    return data;
  }

  private async collectProfileData(userId: string): Promise<any> {
    // This would fetch user profile data
    return {
      userId,
      profile: {
        // User profile data would be fetched here
        exportedAt: new Date().toISOString(),
      },
    };
  }

  private async collectSessionData(userId: string, dateRange?: { from: Date; to: Date }): Promise<any> {
    // This would fetch interview session data
    return {
      sessions: [],
      totalSessions: 0,
      dateRange,
      exportedAt: new Date().toISOString(),
    };
  }

  private async collectTranscriptionData(userId: string, dateRange?: { from: Date; to: Date }): Promise<any> {
    return {
      transcriptions: [],
      totalTranscriptions: 0,
      dateRange,
      exportedAt: new Date().toISOString(),
    };
  }

  private async collectResponseData(userId: string, dateRange?: { from: Date; to: Date }): Promise<any> {
    return {
      responses: [],
      totalResponses: 0,
      dateRange,
      exportedAt: new Date().toISOString(),
    };
  }

  private async collectAnalyticsData(userId: string, dateRange?: { from: Date; to: Date }): Promise<any> {
    return {
      analytics: {
        sessionMetrics: [],
        performanceMetrics: [],
        usageStatistics: [],
      },
      dateRange,
      exportedAt: new Date().toISOString(),
    };
  }

  private async collectPracticeSessionData(userId: string, dateRange?: { from: Date; to: Date }): Promise<any> {
    return {
      practiceSessions: [],
      totalPracticeSessions: 0,
      dateRange,
      exportedAt: new Date().toISOString(),
    };
  }

  private async collectIntegrationData(userId: string): Promise<any> {
    return {
      integrations: {
        linkedin: null,
        calendar: [],
        videoConferencing: [],
      },
      exportedAt: new Date().toISOString(),
    };
  }

  private async createZipExport(exportPath: string, data: any, request: ExportRequest): Promise<string> {
    const zipPath = path.join(exportPath, 'export.zip');
    const output = await fs.open(zipPath, 'w');
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.createWriteStream().on('close', () => {
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output.createWriteStream());

      // Add JSON data file
      archive.append(JSON.stringify(data, null, 2), { name: 'data.json' });

      // Add CSV files for each data type
      for (const dataType of request.dataTypes) {
        if (data[dataType]) {
          const csv = this.convertToCSV(data[dataType]);
          archive.append(csv, { name: `${dataType}.csv` });
        }
      }

      // Add README
      const readme = this.generateReadme(request);
      archive.append(readme, { name: 'README.txt' });

      archive.finalize();
    });
  }

  private async createSingleFileExport(exportPath: string, data: any, request: ExportRequest): Promise<string> {
    let content: string;
    let fileName: string;

    switch (request.format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        fileName = 'export.json';
        break;
      case 'csv':
        content = this.convertToCSV(data);
        fileName = 'export.csv';
        break;
      case 'pdf':
        // PDF generation would be implemented here
        content = 'PDF export not yet implemented';
        fileName = 'export.txt';
        break;
      default:
        throw new Error(`Unsupported export format: ${request.format}`);
    }

    const filePath = path.join(exportPath, fileName);
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - would be enhanced for complex data structures
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csvRows.push(values.join(','));
      }
      
      return csvRows.join('\n');
    }
    
    return JSON.stringify(data, null, 2);
  }

  private generateReadme(request: ExportRequest): string {
    return `
AI Interview Assistant - Data Export
===================================

Export ID: ${this.generateExportId()}
Created: ${new Date().toISOString()}
Format: ${request.format}
Data Types: ${request.dataTypes.join(', ')}

This export contains your personal data from the AI Interview Assistant platform.

Files included:
- data.json: Complete data in JSON format
- *.csv: Individual data types in CSV format (if applicable)

Data Types:
- profile: Your user profile and preferences
- sessions: Interview session records
- transcriptions: Audio transcription data
- responses: AI-generated response suggestions
- analytics: Usage and performance metrics
- practice_sessions: Practice session records
- integrations: Connected third-party services

Privacy Notice:
This export contains personal data. Please handle it securely and delete it when no longer needed.

For questions about your data, please contact support.
    `.trim();
  }

  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeExportMetadata(result: ExportResult, userId: string): Promise<void> {
    // This would store export metadata in database
    this.logger.log(`Storing export metadata for user ${userId}: ${result.exportId}`);
  }
}