import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IntegrationType } from '@prisma/client';
import { IntegrationRepository } from '../repositories/integration.repository';

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
    private readonly integrationRepository: IntegrationRepository,
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

  // Connection Methods
  async connectZoom(userId: string, code: string): Promise<void> {
    try {
      const integration = await this.exchangeZoomCodeForToken(code);
      
      await this.integrationRepository.createIntegration({
        userId,
        integrationType: IntegrationType.ZOOM,
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        expiresAt: integration.expiresAt,
        scopes: ['meeting:read'],
      });

      // Initial sync
      await this.syncZoomMeetings(userId);

      this.logger.log(`Successfully connected Zoom for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to connect Zoom for user ${userId}`, error);
      throw error;
    }
  }

  async connectTeams(userId: string, code: string): Promise<void> {
    try {
      const integration = await this.exchangeTeamsCodeForToken(code);
      
      await this.integrationRepository.createIntegration({
        userId,
        integrationType: IntegrationType.TEAMS,
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        expiresAt: integration.expiresAt,
        scopes: ['https://graph.microsoft.com/OnlineMeetings.Read'],
      });

      // Initial sync
      await this.syncTeamsMeetings(userId);

      this.logger.log(`Successfully connected Teams for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to connect Teams for user ${userId}`, error);
      throw error;
    }
  }

  async connectGoogleMeet(userId: string, code: string): Promise<void> {
    try {
      // Google Meet uses Calendar API integration
      const integration = await this.exchangeGoogleCodeForToken(code);
      
      await this.integrationRepository.createIntegration({
        userId,
        integrationType: IntegrationType.GOOGLE_MEET,
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        expiresAt: integration.expiresAt,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });

      // Initial sync
      await this.syncGoogleMeetMeetings(userId);

      this.logger.log(`Successfully connected Google Meet for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to connect Google Meet for user ${userId}`, error);
      throw error;
    }
  }

  // Sync Methods
  async syncZoomMeetings(userId: string): Promise<void> {
    const integration = await this.integrationRepository.findIntegrationByUserAndType(
      userId,
      IntegrationType.ZOOM,
    );

    if (!integration || !integration.isActive) {
      throw new BadRequestException('Zoom integration not found or inactive');
    }

    try {
      const meetings = await this.getZoomMeetings(integration.accessToken);
      
      for (const meeting of meetings) {
        await this.integrationRepository.upsertVideoMeeting({
          userId,
          integrationId: integration.id,
          externalId: meeting.id,
          title: meeting.title,
          startTime: meeting.startTime,
          duration: meeting.duration,
          joinUrl: meeting.joinUrl,
          hostId: meeting.hostId,
          platform: meeting.platform,
          isRecorded: meeting.isRecorded,
          participants: meeting.participants,
          isInterviewRelated: this.isInterviewMeeting(meeting),
        });
      }

      await this.integrationRepository.updateLastSync(
        userId,
        IntegrationType.ZOOM,
        { meetingsCount: meetings.length, lastSyncedAt: new Date() },
      );

      this.logger.log(`Successfully synced ${meetings.length} Zoom meetings for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to sync Zoom meetings for user ${userId}`, error);
      throw error;
    }
  }

  async syncTeamsMeetings(userId: string): Promise<void> {
    const integration = await this.integrationRepository.findIntegrationByUserAndType(
      userId,
      IntegrationType.TEAMS,
    );

    if (!integration || !integration.isActive) {
      throw new BadRequestException('Teams integration not found or inactive');
    }

    try {
      const meetings = await this.getTeamsMeetings(integration.accessToken);
      
      for (const meeting of meetings) {
        await this.integrationRepository.upsertVideoMeeting({
          userId,
          integrationId: integration.id,
          externalId: meeting.id,
          title: meeting.title,
          startTime: meeting.startTime,
          duration: meeting.duration,
          joinUrl: meeting.joinUrl,
          hostId: meeting.hostId,
          platform: meeting.platform,
          participants: meeting.participants,
          isInterviewRelated: this.isInterviewMeeting(meeting),
        });
      }

      await this.integrationRepository.updateLastSync(
        userId,
        IntegrationType.TEAMS,
        { meetingsCount: meetings.length, lastSyncedAt: new Date() },
      );

      this.logger.log(`Successfully synced ${meetings.length} Teams meetings for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to sync Teams meetings for user ${userId}`, error);
      throw error;
    }
  }

  async syncGoogleMeetMeetings(userId: string): Promise<void> {
    const integration = await this.integrationRepository.findIntegrationByUserAndType(
      userId,
      IntegrationType.GOOGLE_MEET,
    );

    if (!integration || !integration.isActive) {
      throw new BadRequestException('Google Meet integration not found or inactive');
    }

    try {
      const meetings = await this.getMeetMeetings(integration.accessToken);
      
      for (const meeting of meetings) {
        await this.integrationRepository.upsertVideoMeeting({
          userId,
          integrationId: integration.id,
          externalId: meeting.id,
          title: meeting.title,
          startTime: meeting.startTime,
          duration: meeting.duration,
          joinUrl: meeting.joinUrl,
          hostId: meeting.hostId,
          platform: meeting.platform,
          participants: meeting.participants,
          isInterviewRelated: this.isInterviewMeeting(meeting),
        });
      }

      await this.integrationRepository.updateLastSync(
        userId,
        IntegrationType.GOOGLE_MEET,
        { meetingsCount: meetings.length, lastSyncedAt: new Date() },
      );

      this.logger.log(`Successfully synced ${meetings.length} Google Meet meetings for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to sync Google Meet meetings for user ${userId}`, error);
      throw error;
    }
  }

  // Utility methods for detecting interview context
  async detectInterviewMeetings(userId: string): Promise<any[]> {
    return this.integrationRepository.findUpcomingVideoInterviews(userId);
  }

  async getVideoMeetings(
    userId: string,
    startTime?: Date,
    endTime?: Date,
    interviewOnly?: boolean,
  ): Promise<any[]> {
    return this.integrationRepository.findVideoMeetings(
      userId,
      startTime,
      endTime,
      interviewOnly,
    );
  }

  async disconnectPlatform(userId: string, platform: 'zoom' | 'teams' | 'meet'): Promise<void> {
    let integrationType: IntegrationType;
    
    switch (platform) {
      case 'zoom':
        integrationType = IntegrationType.ZOOM;
        break;
      case 'teams':
        integrationType = IntegrationType.TEAMS;
        break;
      case 'meet':
        integrationType = IntegrationType.GOOGLE_MEET;
        break;
      default:
        throw new BadRequestException('Invalid platform');
    }

    try {
      const integration = await this.integrationRepository.findIntegrationByUserAndType(
        userId,
        integrationType,
      );

      if (integration) {
        // Delete associated video meetings
        await this.integrationRepository.deleteVideoMeetingsByIntegration(integration.id);
        
        // Deactivate integration
        await this.integrationRepository.deactivateIntegration(userId, integrationType);
      }

      this.logger.log(`Successfully disconnected ${platform} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to disconnect ${platform} for user ${userId}`, error);
      throw error;
    }
  }

  async getVideoConferencingStatus(userId: string): Promise<any> {
    const [zoomIntegration, teamsIntegration, meetIntegration] = await Promise.all([
      this.integrationRepository.findIntegrationByUserAndType(userId, IntegrationType.ZOOM),
      this.integrationRepository.findIntegrationByUserAndType(userId, IntegrationType.TEAMS),
      this.integrationRepository.findIntegrationByUserAndType(userId, IntegrationType.GOOGLE_MEET),
    ]);

    return {
      zoom: {
        connected: zoomIntegration?.isActive || false,
        lastSync: zoomIntegration?.lastSync,
        syncData: zoomIntegration?.syncData,
      },
      teams: {
        connected: teamsIntegration?.isActive || false,
        lastSync: teamsIntegration?.lastSync,
        syncData: teamsIntegration?.syncData,
      },
      meet: {
        connected: meetIntegration?.isActive || false,
        lastSync: meetIntegration?.lastSync,
        syncData: meetIntegration?.syncData,
      },
    };
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
    const integrations = await this.integrationRepository.findUserIntegrations(userId);
    
    return integrations
      .filter(integration => 
        integration.integrationType === IntegrationType.ZOOM ||
        integration.integrationType === IntegrationType.TEAMS ||
        integration.integrationType === IntegrationType.GOOGLE_MEET
      )
      .map(integration => ({
        platform: this.mapIntegrationTypeToPlatform(integration.integrationType),
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        expiresAt: integration.expiresAt,
        accountId: integration.providerUserId,
      }));
  }

  private mapIntegrationTypeToPlatform(type: IntegrationType): 'zoom' | 'teams' | 'meet' {
    switch (type) {
      case IntegrationType.ZOOM:
        return 'zoom';
      case IntegrationType.TEAMS:
        return 'teams';
      case IntegrationType.GOOGLE_MEET:
        return 'meet';
      default:
        throw new Error(`Unsupported integration type: ${type}`);
    }
  }

  private async exchangeGoogleCodeForToken(code: string): Promise<PlatformIntegration> {
    // This would be similar to the Google Calendar token exchange
    // For now, returning a mock structure
    return {
      platform: 'meet',
      accessToken: 'mock_token',
      refreshToken: 'mock_refresh_token',
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };
  }
}