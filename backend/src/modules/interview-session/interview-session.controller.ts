import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { InterviewSessionService } from './interview-session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateInterviewSessionDto,
  UpdateInterviewSessionDto,
  InterviewSessionResponseDto,
  InterviewSessionWithDetailsDto,
  CreateInteractionDto,
  UpdateInteractionDto,
  InteractionResponseDto,
  CreateSessionMetricsDto,
  SessionMetricsResponseDto,
  SessionAnalyticsDto,
} from './dto/interview-session.dto';

@Controller('interview-sessions')
@UseGuards(JwtAuthGuard)
export class InterviewSessionController {
  constructor(private readonly sessionService: InterviewSessionService) {}

  // Session Management Endpoints
  @Post()
  async createSession(
    @CurrentUser() user: any,
    @Body() createSessionDto: CreateInterviewSessionDto,
  ): Promise<InterviewSessionResponseDto> {
    return this.sessionService.createSession(user.id, createSessionDto);
  }

  @Get()
  async getUserSessions(
    @CurrentUser() user: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<InterviewSessionResponseDto[]> {
    return this.sessionService.findUserSessions(user.id, limit);
  }

  @Get('active')
  async getActiveSessions(
    @CurrentUser() user: any,
  ): Promise<InterviewSessionResponseDto[]> {
    return this.sessionService.findActiveSessions(user.id);
  }

  @Get('analytics')
  async getUserAnalytics(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SessionAnalyticsDto> {
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;
    return this.sessionService.getUserAnalytics(user.id, parsedStartDate, parsedEndDate);
  }

  @Get(':id')
  async getSession(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InterviewSessionResponseDto> {
    return this.sessionService.findSessionById(id, user.id);
  }

  @Get(':id/details')
  async getSessionWithDetails(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InterviewSessionWithDetailsDto> {
    return this.sessionService.findSessionWithDetails(id, user.id);
  }

  @Put(':id')
  async updateSession(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSessionDto: UpdateInterviewSessionDto,
  ): Promise<InterviewSessionResponseDto> {
    return this.sessionService.updateSession(id, updateSessionDto, user.id);
  }

  @Put(':id/start')
  @HttpCode(HttpStatus.OK)
  async startSession(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InterviewSessionResponseDto> {
    return this.sessionService.startSession(id, user.id);
  }

  @Put(':id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseSession(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InterviewSessionResponseDto> {
    return this.sessionService.pauseSession(id, user.id);
  }

  @Put(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeSession(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InterviewSessionResponseDto> {
    return this.sessionService.completeSession(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.sessionService.deleteSession(id, user.id);
  }

  // Interaction Management Endpoints
  @Post('interactions')
  async createInteraction(
    @CurrentUser() user: any,
    @Body() createInteractionDto: CreateInteractionDto,
  ): Promise<InteractionResponseDto> {
    return this.sessionService.createInteraction(createInteractionDto, user.id);
  }

  @Get(':id/interactions')
  async getSessionInteractions(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ): Promise<InteractionResponseDto[]> {
    return this.sessionService.findSessionInteractions(sessionId, user.id);
  }

  @Put('interactions/:interactionId')
  async updateInteraction(
    @CurrentUser() user: any,
    @Param('interactionId', ParseUUIDPipe) interactionId: string,
    @Body() updateInteractionDto: UpdateInteractionDto,
  ): Promise<InteractionResponseDto> {
    return this.sessionService.updateInteraction(interactionId, updateInteractionDto, user.id);
  }

  // Metrics Management Endpoints
  @Post('metrics')
  async recordMetrics(
    @CurrentUser() user: any,
    @Body() createMetricsDto: CreateSessionMetricsDto,
  ): Promise<SessionMetricsResponseDto> {
    return this.sessionService.recordMetrics(createMetricsDto, user.id);
  }

  @Get(':id/metrics')
  async getSessionMetrics(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionMetricsResponseDto[]> {
    return this.sessionService.getSessionMetrics(sessionId, user.id);
  }
}