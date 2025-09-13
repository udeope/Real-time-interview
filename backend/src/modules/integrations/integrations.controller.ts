import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LinkedInService } from './linkedin/linkedin.service';
import { CalendarService } from './calendar/calendar.service';
import { VideoConferencingService } from './video-conferencing/video-conferencing.service';
import { IntegrationRepository } from './repositories/integration.repository';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    private readonly linkedInService: LinkedInService,
    private readonly calendarService: CalendarService,
    private readonly videoConferencingService: VideoConferencingService,
    private readonly integrationRepository: IntegrationRepository,
  ) {}

  // General Integration Status
  @Get('status')
  async getIntegrationStatus(@Request() req) {
    const userId = req.user.id;

    const [linkedInStatus, calendarStatus, videoStatus, stats] = await Promise.all([
      this.linkedInService.getLinkedInStatus(userId),
      this.calendarService.getCalendarStatus(userId),
      this.videoConferencingService.getVideoConferencingStatus(userId),
      this.integrationRepository.getIntegrationStats(userId),
    ]);

    return {
      linkedin: linkedInStatus,
      calendar: calendarStatus,
      videoConferencing: videoStatus,
      stats,
    };
  }

  @Get()
  async getUserIntegrations(@Request() req) {
    const userId = req.user.id;
    return this.integrationRepository.findUserIntegrations(userId);
  }

  // LinkedIn Integration
  @Get('linkedin/auth-url')
  async getLinkedInAuthUrl(@Query('state') state: string) {
    if (!state) {
      throw new BadRequestException('State parameter is required');
    }
    return {
      authUrl: await this.linkedInService.getAuthUrl(state),
    };
  }

  @Post('linkedin/connect')
  async connectLinkedIn(@Request() req, @Body() body: { code: string }) {
    const userId = req.user.id;
    await this.linkedInService.connectLinkedIn(userId, body.code);
    return { success: true, message: 'LinkedIn connected successfully' };
  }

  @Post('linkedin/sync')
  async syncLinkedIn(@Request() req) {
    const userId = req.user.id;
    await this.linkedInService.syncUserProfile(userId);
    return { success: true, message: 'LinkedIn profile synced successfully' };
  }

  @Delete('linkedin')
  async disconnectLinkedIn(@Request() req) {
    const userId = req.user.id;
    await this.linkedInService.disconnectLinkedIn(userId);
    return { success: true, message: 'LinkedIn disconnected successfully' };
  }

  // Google Calendar Integration
  @Get('calendar/google/auth-url')
  async getGoogleCalendarAuthUrl(@Query('state') state: string) {
    if (!state) {
      throw new BadRequestException('State parameter is required');
    }
    return {
      authUrl: await this.calendarService.getGoogleAuthUrl(state),
    };
  }

  @Post('calendar/google/connect')
  async connectGoogleCalendar(@Request() req, @Body() body: { code: string }) {
    const userId = req.user.id;
    await this.calendarService.connectGoogleCalendar(userId, body.code);
    return { success: true, message: 'Google Calendar connected successfully' };
  }

  @Post('calendar/google/sync')
  async syncGoogleCalendar(@Request() req) {
    const userId = req.user.id;
    await this.calendarService.syncGoogleCalendarEvents(userId);
    return { success: true, message: 'Google Calendar synced successfully' };
  }

  @Delete('calendar/google')
  async disconnectGoogleCalendar(@Request() req) {
    const userId = req.user.id;
    await this.calendarService.disconnectCalendar(userId, 'google');
    return { success: true, message: 'Google Calendar disconnected successfully' };
  }

  // Outlook Calendar Integration
  @Get('calendar/outlook/auth-url')
  async getOutlookCalendarAuthUrl(@Query('state') state: string) {
    if (!state) {
      throw new BadRequestException('State parameter is required');
    }
    return {
      authUrl: await this.calendarService.getOutlookAuthUrl(state),
    };
  }

  @Post('calendar/outlook/connect')
  async connectOutlookCalendar(@Request() req, @Body() body: { code: string }) {
    const userId = req.user.id;
    await this.calendarService.connectOutlookCalendar(userId, body.code);
    return { success: true, message: 'Outlook Calendar connected successfully' };
  }

  @Post('calendar/outlook/sync')
  async syncOutlookCalendar(@Request() req) {
    const userId = req.user.id;
    await this.calendarService.syncOutlookCalendarEvents(userId);
    return { success: true, message: 'Outlook Calendar synced successfully' };
  }

  @Delete('calendar/outlook')
  async disconnectOutlookCalendar(@Request() req) {
    const userId = req.user.id;
    await this.calendarService.disconnectCalendar(userId, 'outlook');
    return { success: true, message: 'Outlook Calendar disconnected successfully' };
  }

  // Zoom Integration
  @Get('video/zoom/auth-url')
  async getZoomAuthUrl(@Query('state') state: string) {
    if (!state) {
      throw new BadRequestException('State parameter is required');
    }
    return {
      authUrl: await this.videoConferencingService.getZoomAuthUrl(state),
    };
  }

  @Post('video/zoom/connect')
  async connectZoom(@Request() req, @Body() body: { code: string }) {
    const userId = req.user.id;
    await this.videoConferencingService.connectZoom(userId, body.code);
    return { success: true, message: 'Zoom connected successfully' };
  }

  @Post('video/zoom/sync')
  async syncZoom(@Request() req) {
    const userId = req.user.id;
    await this.videoConferencingService.syncZoomMeetings(userId);
    return { success: true, message: 'Zoom meetings synced successfully' };
  }

  @Delete('video/zoom')
  async disconnectZoom(@Request() req) {
    const userId = req.user.id;
    await this.videoConferencingService.disconnectPlatform(userId, 'zoom');
    return { success: true, message: 'Zoom disconnected successfully' };
  }

  // Teams Integration
  @Get('video/teams/auth-url')
  async getTeamsAuthUrl(@Query('state') state: string) {
    if (!state) {
      throw new BadRequestException('State parameter is required');
    }
    return {
      authUrl: await this.videoConferencingService.getTeamsAuthUrl(state),
    };
  }

  @Post('video/teams/connect')
  async connectTeams(@Request() req, @Body() body: { code: string }) {
    const userId = req.user.id;
    await this.videoConferencingService.connectTeams(userId, body.code);
    return { success: true, message: 'Teams connected successfully' };
  }

  @Post('video/teams/sync')
  async syncTeams(@Request() req) {
    const userId = req.user.id;
    await this.videoConferencingService.syncTeamsMeetings(userId);
    return { success: true, message: 'Teams meetings synced successfully' };
  }

  @Delete('video/teams')
  async disconnectTeams(@Request() req) {
    const userId = req.user.id;
    await this.videoConferencingService.disconnectPlatform(userId, 'teams');
    return { success: true, message: 'Teams disconnected successfully' };
  }

  // Google Meet Integration
  @Post('video/meet/connect')
  async connectGoogleMeet(@Request() req, @Body() body: { code: string }) {
    const userId = req.user.id;
    await this.videoConferencingService.connectGoogleMeet(userId, body.code);
    return { success: true, message: 'Google Meet connected successfully' };
  }

  @Post('video/meet/sync')
  async syncGoogleMeet(@Request() req) {
    const userId = req.user.id;
    await this.videoConferencingService.syncGoogleMeetMeetings(userId);
    return { success: true, message: 'Google Meet meetings synced successfully' };
  }

  @Delete('video/meet')
  async disconnectGoogleMeet(@Request() req) {
    const userId = req.user.id;
    await this.videoConferencingService.disconnectPlatform(userId, 'meet');
    return { success: true, message: 'Google Meet disconnected successfully' };
  }

  // Data Retrieval
  @Get('calendar/events')
  async getCalendarEvents(
    @Request() req,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('interviewOnly') interviewOnly?: string,
  ) {
    const userId = req.user.id;
    return this.calendarService.getCalendarEvents(
      userId,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined,
      interviewOnly === 'true',
    );
  }

  @Get('calendar/interviews')
  async getUpcomingInterviews(@Request() req) {
    const userId = req.user.id;
    return this.calendarService.getUpcomingInterviews(userId);
  }

  @Get('video/meetings')
  async getVideoMeetings(
    @Request() req,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('interviewOnly') interviewOnly?: string,
  ) {
    const userId = req.user.id;
    return this.videoConferencingService.getVideoMeetings(
      userId,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined,
      interviewOnly === 'true',
    );
  }

  @Get('video/interviews')
  async getUpcomingVideoInterviews(@Request() req) {
    const userId = req.user.id;
    return this.videoConferencingService.detectInterviewMeetings(userId);
  }

  // Bulk Operations
  @Post('sync-all')
  async syncAllIntegrations(@Request() req) {
    const userId = req.user.id;
    const integrations = await this.integrationRepository.findUserIntegrations(userId);
    
    const syncPromises = [];

    for (const integration of integrations) {
      switch (integration.integrationType) {
        case 'LINKEDIN':
          syncPromises.push(this.linkedInService.syncUserProfile(userId));
          break;
        case 'GOOGLE_CALENDAR':
          syncPromises.push(this.calendarService.syncGoogleCalendarEvents(userId));
          break;
        case 'OUTLOOK_CALENDAR':
          syncPromises.push(this.calendarService.syncOutlookCalendarEvents(userId));
          break;
        case 'ZOOM':
          syncPromises.push(this.videoConferencingService.syncZoomMeetings(userId));
          break;
        case 'TEAMS':
          syncPromises.push(this.videoConferencingService.syncTeamsMeetings(userId));
          break;
        case 'GOOGLE_MEET':
          syncPromises.push(this.videoConferencingService.syncGoogleMeetMeetings(userId));
          break;
      }
    }

    await Promise.allSettled(syncPromises);

    return { 
      success: true, 
      message: `Synced ${integrations.length} integrations`,
      syncedCount: integrations.length,
    };
  }

  @Delete('disconnect-all')
  async disconnectAllIntegrations(@Request() req) {
    const userId = req.user.id;
    const integrations = await this.integrationRepository.findUserIntegrations(userId);
    
    for (const integration of integrations) {
      await this.integrationRepository.deactivateIntegration(
        userId,
        integration.integrationType,
      );
    }

    return { 
      success: true, 
      message: `Disconnected ${integrations.length} integrations`,
      disconnectedCount: integrations.length,
    };
  }
}