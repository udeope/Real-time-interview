import { Controller, Get, Post, Query, Body, UseGuards, Req, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import { Request } from 'express';

@ApiTags('Calendar Integration')
@Controller('integrations/calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('google/auth-url')
  @ApiOperation({ summary: 'Get Google Calendar OAuth authorization URL' })
  @ApiResponse({ status: 200, description: 'Authorization URL generated successfully' })
  async getGoogleAuthUrl(@Req() req: Request) {
    const state = `google_${req.user.id}_${Date.now()}`;
    const authUrl = await this.calendarService.getGoogleAuthUrl(state);
    
    return {
      authUrl,
      state,
      provider: 'google',
    };
  }

  @Get('outlook/auth-url')
  @ApiOperation({ summary: 'Get Outlook Calendar OAuth authorization URL' })
  @ApiResponse({ status: 200, description: 'Authorization URL generated successfully' })
  async getOutlookAuthUrl(@Req() req: Request) {
    const state = `outlook_${req.user.id}_${Date.now()}`;
    const authUrl = await this.calendarService.getOutlookAuthUrl(state);
    
    return {
      authUrl,
      state,
      provider: 'outlook',
    };
  }

  @Post('google/callback')
  @ApiOperation({ summary: 'Handle Google Calendar OAuth callback' })
  @ApiResponse({ status: 200, description: 'Calendar integration setup successfully' })
  async handleGoogleCallback(
    @Body() body: { code: string; state: string },
    @Req() req: Request,
  ) {
    const { code, state } = body;
    
    // Verify state contains user ID
    const [provider, userId] = state.split('_');
    if (provider !== 'google' || userId !== req.user.id) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for access token
    const integration = await this.calendarService.exchangeGoogleCodeForToken(code);
    
    // TODO: Store integration in database
    
    return {
      message: 'Google Calendar integration setup successfully',
      provider: 'google',
      connectedAt: new Date().toISOString(),
    };
  }

  @Post('outlook/callback')
  @ApiOperation({ summary: 'Handle Outlook Calendar OAuth callback' })
  @ApiResponse({ status: 200, description: 'Calendar integration setup successfully' })
  async handleOutlookCallback(
    @Body() body: { code: string; state: string },
    @Req() req: Request,
  ) {
    const { code, state } = body;
    
    // Verify state contains user ID
    const [provider, userId] = state.split('_');
    if (provider !== 'outlook' || userId !== req.user.id) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for access token
    const integration = await this.calendarService.exchangeOutlookCodeForToken(code);
    
    // TODO: Store integration in database
    
    return {
      message: 'Outlook Calendar integration setup successfully',
      provider: 'outlook',
      connectedAt: new Date().toISOString(),
    };
  }

  @Get('events')
  @ApiOperation({ summary: 'Get calendar events from all connected calendars' })
  @ApiResponse({ status: 200, description: 'Calendar events retrieved successfully' })
  async getCalendarEvents(
    @Query('timeMin') timeMin?: string,
    @Query('timeMax') timeMax?: string,
    @Req() req: Request,
  ) {
    const timeMinDate = timeMin ? new Date(timeMin) : undefined;
    const timeMaxDate = timeMax ? new Date(timeMax) : undefined;
    
    // This would get events from all connected calendar providers
    // For now, returning empty array
    return {
      events: [],
      providers: [],
      lastSync: new Date().toISOString(),
    };
  }

  @Get('interviews')
  @ApiOperation({ summary: 'Get upcoming interview events' })
  @ApiResponse({ status: 200, description: 'Interview events retrieved successfully' })
  async getUpcomingInterviews(@Req() req: Request) {
    const interviews = await this.calendarService.getUpcomingInterviews(req.user.id);
    
    return {
      interviews,
      count: interviews.length,
      nextInterview: interviews[0] || null,
    };
  }

  @Get('events/:provider')
  @ApiOperation({ summary: 'Get events from specific calendar provider' })
  @ApiResponse({ status: 200, description: 'Provider events retrieved successfully' })
  async getProviderEvents(
    @Param('provider') provider: 'google' | 'outlook',
    @Query('access_token') accessToken: string,
    @Query('timeMin') timeMin?: string,
    @Query('timeMax') timeMax?: string,
  ) {
    const timeMinDate = timeMin ? new Date(timeMin) : undefined;
    const timeMaxDate = timeMax ? new Date(timeMax) : undefined;

    let events;
    if (provider === 'google') {
      events = await this.calendarService.getGoogleCalendarEvents(accessToken, timeMinDate, timeMaxDate);
    } else if (provider === 'outlook') {
      events = await this.calendarService.getOutlookCalendarEvents(accessToken, timeMinDate, timeMaxDate);
    } else {
      throw new Error('Unsupported calendar provider');
    }

    return {
      provider,
      events,
      count: events.length,
    };
  }
}