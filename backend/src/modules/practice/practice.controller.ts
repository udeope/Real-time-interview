import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PracticeService } from './practice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreatePracticeSessionDto,
  SubmitPracticeResponseDto,
  PracticeQuestionDto,
  PracticeFeedbackDto,
  PracticeSessionSummaryDto,
} from './dto/practice.dto';

// @ApiTags('practice')
@Controller('practice')
@UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Post('sessions')
  // @ApiOperation({ summary: 'Create a new practice session' })
  // @ApiResponse({ status: 201, description: 'Practice session created successfully' })
  async createSession(@Request() req: any, @Body() dto: CreatePracticeSessionDto) {
    return this.practiceService.createPracticeSession(req.user.sub, dto);
  }

  @Get('sessions/:sessionId')
  // @ApiOperation({ summary: 'Get practice session details' })
  // @ApiResponse({ status: 200, description: 'Practice session details' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.practiceService.getPracticeSession(sessionId);
  }

  @Get('sessions/:sessionId/next-question')
  // @ApiOperation({ summary: 'Get the next unanswered question in the session' })
  // @ApiResponse({ status: 200, description: 'Next question', type: PracticeQuestionDto })
  async getNextQuestion(@Param('sessionId') sessionId: string) {
    return this.practiceService.getNextQuestion(sessionId);
  }

  @Post('sessions/:sessionId/responses')
  // @ApiOperation({ summary: 'Submit a response to a practice question' })
  // @ApiResponse({ status: 201, description: 'Response submitted and feedback generated', type: PracticeFeedbackDto })
  async submitResponse(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitPracticeResponseDto,
  ) {
    return this.practiceService.submitResponse({
      ...dto,
      sessionId,
    });
  }

  @Put('sessions/:sessionId/complete')
  // @ApiOperation({ summary: 'Complete a practice session' })
  // @ApiResponse({ status: 200, description: 'Session completed', type: PracticeSessionSummaryDto })
  @HttpCode(HttpStatus.OK)
  async completeSession(@Param('sessionId') sessionId: string) {
    return this.practiceService.completePracticeSession(sessionId);
  }

  @Put('sessions/:sessionId/pause')
  // @ApiOperation({ summary: 'Pause a practice session' })
  // @ApiResponse({ status: 200, description: 'Session paused' })
  @HttpCode(HttpStatus.OK)
  async pauseSession(@Param('sessionId') sessionId: string) {
    await this.practiceService.pausePracticeSession(sessionId);
    return { message: 'Session paused successfully' };
  }

  @Put('sessions/:sessionId/resume')
  // @ApiOperation({ summary: 'Resume a paused practice session' })
  // @ApiResponse({ status: 200, description: 'Session resumed' })
  @HttpCode(HttpStatus.OK)
  async resumeSession(@Param('sessionId') sessionId: string) {
    await this.practiceService.resumePracticeSession(sessionId);
    return { message: 'Session resumed successfully' };
  }

  @Put('sessions/:sessionId/abandon')
  // @ApiOperation({ summary: 'Abandon a practice session' })
  // @ApiResponse({ status: 200, description: 'Session abandoned' })
  @HttpCode(HttpStatus.OK)
  async abandonSession(@Param('sessionId') sessionId: string) {
    await this.practiceService.abandonPracticeSession(sessionId);
    return { message: 'Session abandoned successfully' };
  }

  @Get('sessions')
  // @ApiOperation({ summary: 'Get user practice session history' })
  // @ApiResponse({ status: 200, description: 'User practice sessions', type: [PracticeSessionSummaryDto] })
  async getUserSessions(
    @Request() req: any,
    @Query('limit') limit?: number,
  ) {
    return this.practiceService.getUserPracticeSessions(req.user.sub, limit);
  }

  @Get('analytics')
  // @ApiOperation({ summary: 'Get user practice analytics' })
  // @ApiResponse({ status: 200, description: 'User practice analytics' })
  async getUserAnalytics(@Request() req: any) {
    return this.practiceService.getUserAnalytics(req.user.sub);
  }

  @Get('sessions/:sessionId/analytics')
  // @ApiOperation({ summary: 'Get session-specific analytics' })
  // @ApiResponse({ status: 200, description: 'Session analytics' })
  async getSessionAnalytics(@Param('sessionId') sessionId: string) {
    return this.practiceService.getSessionAnalytics(sessionId);
  }

  @Get('questions/categories/:category')
  // @ApiOperation({ summary: 'Get questions by category' })
  // @ApiResponse({ status: 200, description: 'Questions in category', type: [PracticeQuestionDto] })
  async getQuestionsByCategory(
    @Param('category') category: string,
    @Query('limit') limit?: number,
  ) {
    return this.practiceService.getQuestionsByCategory(category, limit);
  }

  @Post('initialize-question-bank')
  // @ApiOperation({ summary: 'Initialize question bank with seed data (admin only)' })
  // @ApiResponse({ status: 201, description: 'Question bank initialized' })
  async initializeQuestionBank() {
    await this.practiceService.initializeQuestionBank();
    return { message: 'Question bank initialized successfully' };
  }
}