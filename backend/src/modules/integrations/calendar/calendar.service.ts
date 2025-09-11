import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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

  async getUpcomingInterviews(userId: string): Promise<CalendarEvent[]> {
    // This would fetch user's calendar integrations from database
    // For now, returning mock data structure
    const integrations = await this.getUserCalendarIntegrations(userId);
    const allEvents: CalendarEvent[] = [];

    for (const integration of integrations) {
      let events: CalendarEvent[] = [];
      
      if (integration.provider === 'google') {
        events = await this.getGoogleCalendarEvents(integration.accessToken);
      } else if (integration.provider === 'outlook') {
        events = await this.getOutlookCalendarEvents(integration.accessToken);
      }

      // Filter for interview-related events
      const interviewEvents = events.filter(event => event.isInterviewRelated);
      allEvents.push(...interviewEvents);
    }

    // Sort by start time
    return allEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
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
    // This would fetch from database - returning empty array for now
    // In real implementation, this would query the user_integrations table
    return [];
  }
}