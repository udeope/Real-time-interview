import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IntegrationType } from '@prisma/client';
import { IntegrationRepository } from '../repositories/integration.repository';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  meetingUrl?: string;
  isInterviewRelated: boolean;
  companyName?: string;
  jobTitle?: string;
}

export interface CalendarIntegration {
  provider: 'google' | 'outlook';
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly integrationRepository: IntegrationRepository,
  ) {}

  // Google Calendar Integration
  async getGoogleAuthUrl(state: string): Promise<string> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');
    const scope = 'https://www.googleapis.com/auth/calendar.readonly';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeGoogleCodeForToken(code: string): Promise<CalendarIntegration> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://oauth2.googleapis.com/token', {
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        })
      );

      const { access_token, refresh_token, expires_in } = response.data;
      
      return {
        provider: 'google',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to exchange Google code for token', error);
      throw new BadRequestException('Invalid Google authorization code');
    }
  }

  async getGoogleCalendarEvents(accessToken: string, timeMin?: Date, timeMax?: Date): Promise<CalendarEvent[]> {
    const now = new Date();
    const defaultTimeMin = timeMin || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const defaultTimeMax = timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    try {
      const response = await firstValueFrom(
        this.httpService.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: {
            timeMin: defaultTimeMin.toISOString(),
            timeMax: defaultTimeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 100,
          },
        })
      );

      return response.data.items.map(event => this.mapGoogleEvent(event));
    } catch (error) {
      this.logger.error('Failed to fetch Google Calendar events', error);
      throw new BadRequestException('Failed to fetch calendar events');
    }
  }

  // Outlook Calendar Integration
  async getOutlookAuthUrl(state: string): Promise<string> {
    const clientId = this.configService.get<string>('OUTLOOK_CLIENT_ID');
    const redirectUri = this.configService.get<string>('OUTLOOK_REDIRECT_URI');
    const scope = 'https://graph.microsoft.com/calendars.read';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      response_mode: 'query',
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeOutlookCodeForToken(code: string): Promise<CalendarIntegration> {
    const clientId = this.configService.get<string>('OUTLOOK_CLIENT_ID');
    const clientSecret = this.configService.get<string>('OUTLOOK_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('OUTLOOK_REDIRECT_URI');

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      const { access_token, refresh_token, expires_in } = response.data;
      
      return {
        provider: 'outlook',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to exchange Outlook code for token', error);
      throw new BadRequestException('Invalid Outlook authorization code');
    }
  }

  async getOutlookCalendarEvents(accessToken: string, timeMin?: Date, timeMax?: Date): Promise<CalendarEvent[]> {
    const now = new Date();
    const defaultTimeMin = timeMin || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const defaultTimeMax = timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    try {
      const response = await firstValueFrom(
        this.httpService.get('https://graph.microsoft.com/v1.0/me/events', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: {
            $filter: `start/dateTime ge '${defaultTimeMin.toISOString()}' and end/dateTime le '${defaultTimeMax.toISOString()}'`,
            $orderby: 'start/dateTime',
            $top: 100,
          },
        })
      );

      return response.data.value.map(event => this.mapOutlookEvent(event));
    } catch (error) {
      this.logger.error('Failed to fetch Outlook Calendar events', error);
      throw new BadRequestException('Failed to fetch calendar events');
    }
  }

  // Google Calendar Integration Methods
  async connectGoogleCalendar(userId: string, code: string): Promise<void> {
    try {
      const integration = await this.exchangeGoogleCodeForToken(code);
      
      await this.integrationRepository.createIntegration({
        userId,
        integrationType: IntegrationType.GOOGLE_CALENDAR,
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        expiresAt: integration.expiresAt,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });

      // Initial sync
      await this.syncGoogleCalendarEvents(userId);

      this.logger.log(`Successfully connected Google Calendar for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to connect Google Calendar for user ${userId}`, error);
      throw error;
    }
  }

  async connectOutlookCalendar(userId: string, code: string): Promise<void> {
    try {
      const integration = await this.exchangeOutlookCodeForToken(code);
      
      await this.integrationRepository.createIntegration({
        userId,
        integrationType: IntegrationType.OUTLOOK_CALENDAR,
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        expiresAt: integration.expiresAt,
        scopes: ['https://graph.microsoft.com/calendars.read'],
      });

      // Initial sync
      await this.syncOutlookCalendarEvents(userId);

      this.logger.log(`Successfully connected Outlook Calendar for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to connect Outlook Calendar for user ${userId}`, error);
      throw error;
    }
  }

  async syncGoogleCalendarEvents(userId: string): Promise<void> {
    const integration = await this.integrationRepository.findIntegrationByUserAndType(
      userId,
      IntegrationType.GOOGLE_CALENDAR,
    );

    if (!integration || !integration.isActive) {
      throw new BadRequestException('Google Calendar integration not found or inactive');
    }

    try {
      const events = await this.getGoogleCalendarEvents(integration.accessToken);
      
      for (const event of events) {
        await this.integrationRepository.upsertCalendarEvent({
          userId,
          integrationId: integration.id,
          externalId: event.id,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          attendees: event.attendees,
          location: event.location,
          meetingUrl: event.meetingUrl,
          isInterviewRelated: event.isInterviewRelated,
          companyName: event.companyName,
          jobTitle: event.jobTitle,
        });
      }

      await this.integrationRepository.updateLastSync(
        userId,
        IntegrationType.GOOGLE_CALENDAR,
        { eventsCount: events.length, lastSyncedAt: new Date() },
      );

      this.logger.log(`Successfully synced ${events.length} Google Calendar events for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to sync Google Calendar events for user ${userId}`, error);
      throw error;
    }
  }

  async syncOutlookCalendarEvents(userId: string): Promise<void> {
    const integration = await this.integrationRepository.findIntegrationByUserAndType(
      userId,
      IntegrationType.OUTLOOK_CALENDAR,
    );

    if (!integration || !integration.isActive) {
      throw new BadRequestException('Outlook Calendar integration not found or inactive');
    }

    try {
      const events = await this.getOutlookCalendarEvents(integration.accessToken);
      
      for (const event of events) {
        await this.integrationRepository.upsertCalendarEvent({
          userId,
          integrationId: integration.id,
          externalId: event.id,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          attendees: event.attendees,
          location: event.location,
          meetingUrl: event.meetingUrl,
          isInterviewRelated: event.isInterviewRelated,
          companyName: event.companyName,
          jobTitle: event.jobTitle,
        });
      }

      await this.integrationRepository.updateLastSync(
        userId,
        IntegrationType.OUTLOOK_CALENDAR,
        { eventsCount: events.length, lastSyncedAt: new Date() },
      );

      this.logger.log(`Successfully synced ${events.length} Outlook Calendar events for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to sync Outlook Calendar events for user ${userId}`, error);
      throw error;
    }
  }

  async getUpcomingInterviews(userId: string): Promise<any[]> {
    return this.integrationRepository.findUpcomingInterviews(userId);
  }

  async getCalendarEvents(
    userId: string,
    startTime?: Date,
    endTime?: Date,
    interviewOnly?: boolean,
  ): Promise<any[]> {
    return this.integrationRepository.findCalendarEvents(
      userId,
      startTime,
      endTime,
      interviewOnly,
    );
  }

  async disconnectCalendar(userId: string, provider: 'google' | 'outlook'): Promise<void> {
    const integrationType = provider === 'google' 
      ? IntegrationType.GOOGLE_CALENDAR 
      : IntegrationType.OUTLOOK_CALENDAR;

    try {
      const integration = await this.integrationRepository.findIntegrationByUserAndType(
        userId,
        integrationType,
      );

      if (integration) {
        // Delete associated calendar events
        await this.integrationRepository.deleteCalendarEventsByIntegration(integration.id);
        
        // Deactivate integration
        await this.integrationRepository.deactivateIntegration(userId, integrationType);
      }

      this.logger.log(`Successfully disconnected ${provider} calendar for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to disconnect ${provider} calendar for user ${userId}`, error);
      throw error;
    }
  }

  async getCalendarStatus(userId: string): Promise<any> {
    const [googleIntegration, outlookIntegration] = await Promise.all([
      this.integrationRepository.findIntegrationByUserAndType(
        userId,
        IntegrationType.GOOGLE_CALENDAR,
      ),
      this.integrationRepository.findIntegrationByUserAndType(
        userId,
        IntegrationType.OUTLOOK_CALENDAR,
      ),
    ]);

    return {
      google: {
        connected: googleIntegration?.isActive || false,
        lastSync: googleIntegration?.lastSync,
        syncData: googleIntegration?.syncData,
      },
      outlook: {
        connected: outlookIntegration?.isActive || false,
        lastSync: outlookIntegration?.lastSync,
        syncData: outlookIntegration?.syncData,
      },
    };
  }

  private mapGoogleEvent(event: any): CalendarEvent {
    const isInterviewRelated = this.isInterviewEvent(event.summary, event.description);
    const { companyName, jobTitle } = this.extractInterviewDetails(event.summary, event.description);

    return {
      id: event.id,
      title: event.summary || 'No Title',
      description: event.description,
      startTime: new Date(event.start.dateTime || event.start.date),
      endTime: new Date(event.end.dateTime || event.end.date),
      attendees: (event.attendees || []).map(attendee => attendee.email),
      location: event.location,
      meetingUrl: this.extractMeetingUrl(event.description),
      isInterviewRelated,
      companyName,
      jobTitle,
    };
  }

  private mapOutlookEvent(event: any): CalendarEvent {
    const isInterviewRelated = this.isInterviewEvent(event.subject, event.body?.content);
    const { companyName, jobTitle } = this.extractInterviewDetails(event.subject, event.body?.content);

    return {
      id: event.id,
      title: event.subject || 'No Title',
      description: event.body?.content,
      startTime: new Date(event.start.dateTime),
      endTime: new Date(event.end.dateTime),
      attendees: (event.attendees || []).map(attendee => attendee.emailAddress.address),
      location: event.location?.displayName,
      meetingUrl: this.extractMeetingUrl(event.body?.content),
      isInterviewRelated,
      companyName,
      jobTitle,
    };
  }

  private isInterviewEvent(title: string, description?: string): boolean {
    const interviewKeywords = [
      'interview', 'entrevista', 'screening', 'technical round', 'behavioral round',
      'final round', 'hiring manager', 'recruiter', 'talent acquisition',
      'job interview', 'phone screen', 'video interview'
    ];

    const content = `${title} ${description || ''}`.toLowerCase();
    return interviewKeywords.some(keyword => content.includes(keyword));
  }

  private extractInterviewDetails(title: string, description?: string): { companyName?: string; jobTitle?: string } {
    // Simple extraction - could be enhanced with NLP
    const content = `${title} ${description || ''}`;
    
    // Look for patterns like "Interview with [Company]" or "[Position] at [Company]"
    const companyMatch = content.match(/(?:with|at)\s+([A-Z][a-zA-Z\s&]+?)(?:\s|$|,|\.|:)/);
    const positionMatch = content.match(/(?:for|as)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:at|with)|$|,|\.|:)/);

    return {
      companyName: companyMatch?.[1]?.trim(),
      jobTitle: positionMatch?.[1]?.trim(),
    };
  }

  private extractMeetingUrl(content?: string): string | undefined {
    if (!content) return undefined;

    const urlPatterns = [
      /https:\/\/[a-zA-Z0-9.-]+\.zoom\.us\/[^\s]+/,
      /https:\/\/teams\.microsoft\.com\/[^\s]+/,
      /https:\/\/meet\.google\.com\/[^\s]+/,
      /https:\/\/[a-zA-Z0-9.-]+\.webex\.com\/[^\s]+/,
    ];

    for (const pattern of urlPatterns) {
      const match = content.match(pattern);
      if (match) return match[0];
    }

    return undefined;
  }

  private async getUserCalendarIntegrations(userId: string): Promise<CalendarIntegration[]> {
    const integrations = await this.integrationRepository.findUserIntegrations(userId);
    
    return integrations
      .filter(integration => 
        integration.integrationType === IntegrationType.GOOGLE_CALENDAR ||
        integration.integrationType === IntegrationType.OUTLOOK_CALENDAR
      )
      .map(integration => ({
        provider: integration.integrationType === IntegrationType.GOOGLE_CALENDAR ? 'google' : 'outlook',
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        expiresAt: integration.expiresAt,
      }));
  }
}