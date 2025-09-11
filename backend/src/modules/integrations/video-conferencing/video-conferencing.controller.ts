import { Controller, Get, Post, Query, Body, UseGuards, Req, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VideoConferencingService } from './video-conferencing.service';
import { Request } from 'express';

@ApiTags('Video Conferencing Integration')
@Controller('integrations/video-conferencing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VideoConferencingController {
  constructor(private readonly videoConferencingService: VideoConferencingService) {}

  @Get('zoom/auth-url')
  @ApiOperation({ summary: 'Get Zoom OAuth authorization URL' })
  @ApiResponse({ status: 200, description: 'Authorization URL generated successfully' })
  async getZoomAuthUrl(@Req() req: Request) {
    const state = `zoom_${req.user.id}_${Date.now()}`;
    const authUrl = await this.videoConferencingService.getZoomAuthUrl(state);
    
    return {
      authUrl,
      state,
      platform: 'zoom',
    };
  }

  @Get('teams/auth-url')
  @ApiOperation({ summary: 'Get Microsoft Teams OAuth authorization URL' })
  @ApiResponse({ status: 200, description: 'Authorization URL generated successfully' })
  async getTeamsAuthUrl(@Req() req: Request) {
    const state = `teams_${req.user.id}_${Date.now()}`;
    const authUrl = await this.videoConferencingService.getTeamsAuthUrl(state);
    
    return {
      authUrl,
      state,
      platform: 'teams',
    };
  }

  @Post('zoom/callback')
  @ApiOperation({ summary: 'Handle Zoom OAuth callback' })
  @ApiResponse({ status: 200, description: 'Zoom integration setup successfully' })
  async handleZoomCallback(
    @Body() body: { code: string; state: string },
    @Req() req: Request,
  ) {
    const { code, state } = body;
    
    // Verify state contains user ID
    const [platform, userId] = state.split('_');
    if (platform !== 'zoom' || userId !== req.user.id) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for access token
    const integration = await this.videoConferencingService.exchangeZoomCodeForToken(code);
    
    // TODO: Store integration in database
    
    return {
      message: 'Zoom integration setup successfully',
      platform: 'zoom',
      connectedAt: new Date().toISOString(),
    };
  }

  @Post('teams/callback')
  @ApiOperation({ summary: 'Handle Microsoft Teams OAuth callback' })
  @ApiResponse({ status: 200, description: 'Teams integration setup successfully' })
  async handleTeamsCallback(
    @Body() body: { code: string; state: string },
    @Req() req: Request,
  ) {
    const { code, state } = body;
    
    // Verify state contains user ID
    const [platform, userId] = state.split('_');
    if (platform !== 'teams' || userId !== req.user.id) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for access token
    const integration = await this.videoConferencingService.exchangeTeamsCodeForToken(code);
    
    // TODO: Store integration in database
    
    return {
      message: 'Microsoft Teams integration setup successfully',
      platform: 'teams',
      connectedAt: new Date().toISOString(),
    };
  }

  @Get('meetings')
  @ApiOperation({ summary: 'Get meetings from all connected video conferencing platforms' })
  @ApiResponse({ status: 200, description: 'Meetings retrieved successfully' })
  async getAllMeetings(@Req() req: Request) {
    const meetings = await this.videoConferencingService.detectInterviewMeetings(req.user.id);
    
    return {
      meetings,
      count: meetings.length,
      platforms: [...new Set(meetings.map(m => m.platform))],
    };
  }

  @Get('meetings/:platform')
  @ApiOperation({ summary: 'Get meetings from specific platform' })
  @ApiResponse({ status: 200, description: 'Platform meetings retrieved successfully' })
  async getPlatformMeetings(
    @Param('platform') platform: 'zoom' | 'teams' | 'meet',
    @Query('access_token') accessToken: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    let meetings;
    if (platform === 'zoom') {
      meetings = await this.videoConferencingService.getZoomMeetings(accessToken, fromDate, toDate);
    } else if (platform === 'teams') {
      meetings = await this.videoConferencingService.getTeamsMeetings(accessToken);
    } else if (platform === 'meet') {
      meetings = await this.videoConferencingService.getMeetMeetings(accessToken);
    } else {
      throw new Error('Unsupported video conferencing platform');
    }

    return {
      platform,
      meetings,
      count: meetings.length,
    };
  }

  @Get('meetings/:platform/:meetingId/participants')
  @ApiOperation({ summary: 'Get meeting participants' })
  @ApiResponse({ status: 200, description: 'Participants retrieved successfully' })
  async getMeetingParticipants(
    @Param('platform') platform: string,
    @Param('meetingId') meetingId: string,
    @Query('access_token') accessToken: string,
  ) {
    if (platform === 'zoom') {
      const participants = await this.videoConferencingService.getZoomMeetingParticipants(accessToken, meetingId);
      return {
        meetingId,
        platform,
        participants,
        count: participants.length,
      };
    }

    throw new Error('Participant retrieval not supported for this platform');
  }

  @Get('meetings/:platform/:meetingId/context')
  @ApiOperation({ summary: 'Get meeting context for interview preparation' })
  @ApiResponse({ status: 200, description: 'Meeting context retrieved successfully' })
  async getMeetingContext(
    @Param('platform') platform: string,
    @Param('meetingId') meetingId: string,
  ) {
    const context = await this.videoConferencingService.getMeetingContext(meetingId, platform);
    
    return {
      meetingId,
      platform,
      context,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('interviews')
  @ApiOperation({ summary: 'Get upcoming interview meetings across all platforms' })
  @ApiResponse({ status: 200, description: 'Interview meetings retrieved successfully' })
  async getUpcomingInterviews(@Req() req: Request) {
    const interviews = await this.videoConferencingService.detectInterviewMeetings(req.user.id);
    
    const upcomingInterviews = interviews.filter(
      interview => interview.startTime > new Date()
    );

    return {
      interviews: upcomingInterviews,
      count: upcomingInterviews.length,
      nextInterview: upcomingInterviews[0] || null,
      platforms: [...new Set(upcomingInterviews.map(i => i.platform))],
    };
  }
}