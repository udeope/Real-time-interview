import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface VideoConferencingMeeting {
  id: string;
  title: string;
  startTime: Date;
  duration: number; // in minutes
  joinUrl: string;
  hostId: string;
  participants: VideoConferencingParticipant[];
  platform: 'zoom' | 'teams' | 'meet';
  isRecorded?: boolean;
  recordingUrl?: string;
}

export interface VideoConferencingParticipant {
  id: string;
  name: string;
  email: string;
  role: 'host' | 'participant';
  joinTime?: Date;
  leaveTime?: Date;
}

export interface PlatformIntegration {
  platform: 'zoom' | 'teams' | 'meet';
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  accountId?: string;
}

@Injectable()
export class VideoConferencingService {
  private readonly logger = new Logger(VideoConferencingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  // Zoom Integration
  async getZoomAuthUrl(state: string): Promise<string> {
    const clientId = this.configService.get<string>('ZOOM_CLIENT_ID');
    const redirectUri = this.configService.get<string>('ZOOM_REDIRECT_URI');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });

    return `https://zoom.us/oauth/authorize?${params.toString()}`;
  }

  async exchangeZoomCodeForToken(code: string): Promise<PlatformIntegration> {
    const clientId = this.configService.get<string>('ZOOM_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ZOOM_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('ZOOM_REDIRECT_URI');

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://zoom.us/oauth/token', {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }, {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      const { access_token, refresh_token, expires_in } = response.data;
      
      return {
        platform: 'zoom',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to exchange Zoom code for token', error);
      throw new BadRequestException('Invalid Zoom authorization code');
    }
  }

  async getZoomMeetings(accessToken: string, from?: Date, to?: Date): Promise<VideoConferencingMeeting[]> {
    const fromDate = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
      const response = await firstValueFrom(
        this.httpService.get('https://api.zoom.us/v2/users/me/meetings', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: {
            type: 'scheduled',
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
          },
        })
      );

      return response.data.meetings.map(meeting => this.mapZoomMeeting(meeting));
    } catch (error) {
      this.logger.error('Failed to fetch Zoom meetings', error);
      throw new BadRequestException('Failed to fetch Zoom meetings');
    }
  }

  async getZoomMeetingParticipants(accessToken: string, meetingId: string): Promise<VideoConferencingParticipant[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://api.zoom.us/v2/meetings/${meetingId}/participants`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
      );

      return response.data.participants.map(participant => ({
        id: participant.id,
        name: participant.name,
        email: participant.email,
        role: participant.role === 1 ? 'host' : 'participant',
        joinTime: participant.join_time ? new Date(participant.join_time) : undefined,
        leaveTime: participant.leave_time ? new Date(participant.leave_time) : undefined,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch Zoom meeting participants', error);
      return [];
    }
  }

  // Microsoft Teams Integration
  async getTeamsAuthUrl(state: string): Promise<string> {
    const clientId = this.configService.get<string>('TEAMS_CLIENT_ID');
    const redirectUri = this.configService.get<string>('TEAMS_REDIRECT_URI');
    const scope = 'https://graph.microsoft.com/OnlineMeetings.Read';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeTeamsCodeForToken(code: string): Promise<PlatformIntegration> {
    const clientId = this.configService.get<string>('TEAMS_CLIENT_ID');
    const clientSecret = this.configService.get<string>('TEAMS_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('TEAMS_REDIRECT_URI');

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      const { access_token, refresh_token, expires_in } = response.data;
      
      return {
        platform: 'teams',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to exchange Teams code for token', error);
      throw new BadRequestException('Invalid Teams authorization code');
    }
  }

  async getTeamsMeetings(accessToken: string): Promise<VideoConferencingMeeting[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
      );

      return response.data.value.map(meeting => this.mapTeamsMeeting(meeting));
    } catch (error) {
      this.logger.error('Failed to fetch Teams meetings', error);
      throw new BadRequestException('Failed to fetch Teams meetings');
    }
  }

  // Google Meet Integration (via Calendar API)
  async getMeetMeetings(accessToken: string): Promise<VideoConferencingMeeting[]> {
    try {
      // Google Meet meetings are typically accessed through Calendar API
      const response = await firstValueFrom(
        this.httpService.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: {
            timeMin: new Date().toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            q: 'meet.google.com',
          },
        })
      );

      return response.data.items
        .filter(event => event.hangoutLink || (event.description && event.description.includes('meet.google.com')))
        .map(event => this.mapMeetMeeting(event));
    } catch (error) {
      this.logger.error('Failed to fetch Google Meet meetings', error);
      throw new BadRequestException('Failed to fetch Google Meet meetings');
    }
  }

  // Utility methods for detecting interview context
  async detectInterviewMeetings(userId: string): Promise<VideoConferencingMeeting[]> {
    const integrations = await this.getUserVideoIntegrations(userId);
    const allMeetings: VideoConferencingMeeting[] = [];

    for (const integration of integrations) {
      let meetings: VideoConferencingMeeting[] = [];
      
      if (integration.platform === 'zoom') {
        meetings = await this.getZoomMeetings(integration.accessToken);
      } else if (integration.platform === 'teams') {
        meetings = await this.getTeamsMeetings(integration.accessToken);
      } else if (integration.platform === 'meet') {
        meetings = await this.getMeetMeetings(integration.accessToken);
      }

      // Filter for interview-related meetings
      const interviewMeetings = meetings.filter(meeting => this.isInterviewMeeting(meeting));
      allMeetings.push(...interviewMeetings);
    }

    return allMeetings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async getMeetingContext(meetingId: string, platform: string): Promise<any> {
    // This would provide context about the meeting for the interview assistant
    return {
      meetingId,
      platform,
      suggestedPreparation: [
        'Test your audio and video',
        'Prepare questions about the role',
        'Review the job description',
        'Have your resume ready',
      ],
      technicalChecklist: [
        'Stable internet connection',
        'Backup communication method',
        'Quiet environment',
        'Professional background',
      ],
    };
  }

  private mapZoomMeeting(meeting: any): VideoConferencingMeeting {
    return {
      id: meeting.id.toString(),
      title: meeting.topic,
      startTime: new Date(meeting.start_time),
      duration: meeting.duration,
      joinUrl: meeting.join_url,
      hostId: meeting.host_id,
      participants: [], // Would be populated separately
      platform: 'zoom',
      isRecorded: meeting.settings?.auto_recording !== 'none',
    };
  }

  private mapTeamsMeeting(meeting: any): VideoConferencingMeeting {
    return {
      id: meeting.id,
      title: meeting.subject || 'Teams Meeting',
      startTime: new Date(meeting.startDateTime),
      duration: 60, // Teams doesn't provide duration directly
      joinUrl: meeting.joinWebUrl,
      hostId: meeting.organizer?.identity?.user?.id || '',
      participants: [], // Would be populated separately
      platform: 'teams',
    };
  }

  private mapMeetMeeting(event: any): VideoConferencingMeeting {
    return {
      id: event.id,
      title: event.summary,
      startTime: new Date(event.start.dateTime),
      duration: Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / (1000 * 60)),
      joinUrl: event.hangoutLink || this.extractMeetUrl(event.description),
      hostId: event.organizer?.email || '',
      participants: [], // Would be populated from attendees
      platform: 'meet',
    };
  }

  private extractMeetUrl(description?: string): string {
    if (!description) return '';
    const meetUrlMatch = description.match(/https:\/\/meet\.google\.com\/[a-z-]+/);
    return meetUrlMatch ? meetUrlMatch[0] : '';
  }

  private isInterviewMeeting(meeting: VideoConferencingMeeting): boolean {
    const interviewKeywords = [
      'interview', 'screening', 'technical round', 'behavioral round',
      'final round', 'hiring', 'recruiter', 'talent acquisition'
    ];

    const title = meeting.title.toLowerCase();
    return interviewKeywords.some(keyword => title.includes(keyword));
  }

  private async getUserVideoIntegrations(userId: string): Promise<PlatformIntegration[]> {
    // This would fetch from database - returning empty array for now
    return [];
  }
}