import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException 
} from '@nestjs/common';
import { InterviewSessionRepository } from './interview-session.repository';
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
  SessionAnalyticsDto
} from './dto/interview-session.dto';

@Injectable()
export class InterviewSessionService {
  constructor(
    private readonly sessionRepository: InterviewSessionRepository,
  ) {}

  // Interview Session Management
  async createSession(userId: string, createSessionDto: CreateInterviewSessionDto): Promise<InterviewSessionResponseDto> {
    // Check if user has active sessions (limit to prevent resource abuse)
    const activeSessions = await this.sessionRepository.findActiveByUserId(userId);
    if (activeSessions.length >= 3) {
      throw new BadRequestException('Maximum number of active sessions reached. Please complete or pause existing sessions.');
    }

    const session = await this.sessionRepository.create(userId, createSessionDto);
    return this.mapToResponseDto(session);
  }

  async findSessionById(id: string, userId?: string): Promise<InterviewSessionResponseDto> {
    const session = await this.sessionRepository.findById(id);
    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    // Check ownership if userId is provided
    if (userId && session.userId !== userId) {
      throw new ForbiddenException('Access denied to this session');
    }

    return this.mapToResponseDto(session);
  }

  async findSessionWithDetails(id: string, userId?: string): Promise<InterviewSessionWithDetailsDto> {
    const session = await this.sessionRepository.findByIdWithDetails(id);
    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    // Check ownership if userId is provided
    if (userId && session.userId !== userId) {
      throw new ForbiddenException('Access denied to this session');
    }

    return this.mapToDetailedResponseDto(session);
  }

  async findUserSessions(userId: string, limit?: number): Promise<InterviewSessionResponseDto[]> {
    const sessions = await this.sessionRepository.findByUserId(userId, limit);
    return sessions.map(session => this.mapToResponseDto(session));
  }

  async findActiveSessions(userId: string): Promise<InterviewSessionResponseDto[]> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId);
    return sessions.map(session => this.mapToResponseDto(session));
  }

  async updateSession(
    id: string, 
    updateSessionDto: UpdateInterviewSessionDto, 
    userId?: string
  ): Promise<InterviewSessionResponseDto> {
    const existingSession = await this.sessionRepository.findById(id);
    if (!existingSession) {
      throw new NotFoundException('Interview session not found');
    }

    // Check ownership if userId is provided
    if (userId && existingSession.userId !== userId) {
      throw new ForbiddenException('Access denied to this session');
    }

    // Validate status transitions
    if (updateSessionDto.status) {
      this.validateStatusTransition(existingSession.status, updateSessionDto.status);
    }

    const updatedSession = await this.sessionRepository.update(id, updateSessionDto);
    return this.mapToResponseDto(updatedSession);
  }

  async startSession(id: string, userId?: string): Promise<InterviewSessionResponseDto> {
    return this.updateSession(id, { status: 'active' }, userId);
  }

  async pauseSession(id: string, userId?: string): Promise<InterviewSessionResponseDto> {
    return this.updateSession(id, { status: 'paused' }, userId);
  }

  async completeSession(id: string, userId?: string): Promise<InterviewSessionResponseDto> {
    return this.updateSession(id, { status: 'completed' }, userId);
  }

  async deleteSession(id: string, userId?: string): Promise<void> {
    const existingSession = await this.sessionRepository.findById(id);
    if (!existingSession) {
      throw new NotFoundException('Interview session not found');
    }

    // Check ownership if userId is provided
    if (userId && existingSession.userId !== userId) {
      throw new ForbiddenException('Access denied to this session');
    }

    await this.sessionRepository.delete(id);
  }

  // Interaction Management
  async createInteraction(createInteractionDto: CreateInteractionDto, userId?: string): Promise<InteractionResponseDto> {
    // Verify session exists and user has access
    const session = await this.sessionRepository.findById(createInteractionDto.sessionId);
    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (userId && session.userId !== userId) {
      throw new ForbiddenException('Access denied to this session');
    }

    // Verify session is active
    if (session.status !== 'active') {
      throw new BadRequestException('Cannot add interactions to inactive session');
    }

    const interaction = await this.sessionRepository.createInteraction(createInteractionDto);
    return this.mapInteractionToResponseDto(interaction);
  }

  async updateInteraction(
    id: string, 
    updateInteractionDto: UpdateInteractionDto, 
    userId?: string
  ): Promise<InteractionResponseDto> {
    const interaction = await this.sessionRepository.findInteractionById(id);
    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    // Check session ownership if userId is provided
    if (userId) {
      const session = await this.sessionRepository.findById(interaction.sessionId);
      if (!session || session.userId !== userId) {
        throw new ForbiddenException('Access denied to this interaction');
      }
    }

    const updatedInteraction = await this.sessionRepository.updateInteraction(id, updateInteractionDto);
    return this.mapInteractionToResponseDto(updatedInteraction);
  }

  async findSessionInteractions(sessionId: string, userId?: string): Promise<InteractionResponseDto[]> {
    // Verify session exists and user has access
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (userId && session.userId !== userId) {
      throw new ForbiddenException('Access denied to this session');
    }

    const interactions = await this.sessionRepository.findInteractionsBySessionId(sessionId);
    return interactions.map(interaction => this.mapInteractionToResponseDto(interaction));
  }

  // Metrics Management
  async recordMetrics(createMetricsDto: CreateSessionMetricsDto, userId?: string): Promise<SessionMetricsResponseDto> {
    // Verify session exists and user has access
    const session = await this.sessionRepository.findById(createMetricsDto.sessionId);
    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (userId && session.userId !== userId) {
      throw new ForbiddenException('Access denied to this session');
    }

    const metrics = await this.sessionRepository.createMetrics(createMetricsDto);
    return this.mapMetricsToResponseDto(metrics);
  }

  async getSessionMetrics(sessionId: string, userId?: string): Promise<SessionMetricsResponseDto[]> {
    // Verify session exists and user has access
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (userId && session.userId !== userId) {
      throw new ForbiddenException('Access denied to this session');
    }

    const metrics = await this.sessionRepository.findMetricsBySessionId(sessionId);
    return metrics.map(metric => this.mapMetricsToResponseDto(metric));
  }

  // Analytics
  async getUserAnalytics(userId: string, startDate?: Date, endDate?: Date): Promise<SessionAnalyticsDto> {
    const analytics = await this.sessionRepository.getSessionAnalytics(userId, startDate, endDate);
    const trends = await this.sessionRepository.getPerformanceTrends(userId);

    return {
      totalSessions: analytics.totalSessions,
      averageSessionDuration: analytics.averageSessionDuration,
      averageLatency: analytics.averageLatency,
      averageAccuracy: Number(analytics.averageAccuracy) || 0,
      averageSatisfaction: analytics.averageSatisfaction,
      mostCommonQuestionTypes: analytics.questionTypeStats.map(stat => ({
        type: stat.type ? JSON.parse(stat.type as string)?.type || 'unknown' : 'unknown',
        count: stat.count,
      })),
      performanceTrends: trends.map(trend => ({
        date: trend.createdAt.toISOString().split('T')[0],
        metrics: {
          latency: trend.totalLatencyMs,
          accuracy: trend.transcriptionAccuracy,
          satisfaction: trend.userSatisfaction,
        },
      })),
    };
  }

  // Private helper methods
  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      'active': ['paused', 'completed'],
      'paused': ['active', 'completed'],
      'completed': [], // No transitions from completed
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`
      );
    }
  }

  private mapToResponseDto(session: any): InterviewSessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      jobContext: session.jobContext,
      status: session.status,
      settings: session.settings,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      createdAt: session.createdAt,
    };
  }

  private mapToDetailedResponseDto(session: any): InterviewSessionWithDetailsDto {
    return {
      ...this.mapToResponseDto(session),
      interactions: session.interactions?.map((interaction: any) => 
        this.mapInteractionToResponseDto(interaction)
      ) || [],
      metrics: session.metrics?.map((metric: any) => 
        this.mapMetricsToResponseDto(metric)
      ) || [],
    };
  }

  private mapInteractionToResponseDto(interaction: any): InteractionResponseDto {
    return {
      id: interaction.id,
      sessionId: interaction.sessionId,
      question: interaction.question,
      questionClassification: interaction.questionClassification,
      generatedResponses: interaction.generatedResponses,
      selectedResponse: interaction.selectedResponse,
      userFeedback: interaction.userFeedback,
      timestamp: interaction.timestamp,
    };
  }

  private mapMetricsToResponseDto(metrics: any): SessionMetricsResponseDto {
    return {
      id: metrics.id,
      sessionId: metrics.sessionId,
      transcriptionLatencyMs: metrics.transcriptionLatencyMs,
      responseGenerationMs: metrics.responseGenerationMs,
      totalLatencyMs: metrics.totalLatencyMs,
      transcriptionAccuracy: metrics.transcriptionAccuracy ? Number(metrics.transcriptionAccuracy) : undefined,
      userSatisfaction: metrics.userSatisfaction,
      createdAt: metrics.createdAt,
    };
  }
}