import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../config/database.config';
import { 
  CreateInterviewSessionDto, 
  UpdateInterviewSessionDto,
  CreateInteractionDto,
  UpdateInteractionDto,
  CreateSessionMetricsDto
} from './dto/interview-session.dto';
import { InterviewSession, Interaction, SessionMetrics } from '@prisma/client';

@Injectable()
export class InterviewSessionRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // Interview Session CRUD Operations
  async create(userId: string, createSessionDto: CreateInterviewSessionDto): Promise<InterviewSession> {
    return this.databaseService.interviewSession.create({
      data: {
        userId,
        jobContext: createSessionDto.jobContext as any || null,
        settings: createSessionDto.settings as any || null,
        status: 'active',
      },
    });
  }

  async findById(id: string): Promise<InterviewSession | null> {
    return this.databaseService.interviewSession.findUnique({
      where: { id },
    });
  }

  async findByIdWithDetails(id: string) {
    return this.databaseService.interviewSession.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        interactions: {
          orderBy: {
            timestamp: 'asc',
          },
        },
        metrics: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async findByUserId(userId: string, limit?: number): Promise<InterviewSession[]> {
    return this.databaseService.interviewSession.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async findActiveByUserId(userId: string): Promise<InterviewSession[]> {
    return this.databaseService.interviewSession.findMany({
      where: { 
        userId,
        status: 'active',
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  async update(id: string, updateSessionDto: UpdateInterviewSessionDto): Promise<InterviewSession> {
    return this.databaseService.interviewSession.update({
      where: { id },
      data: {
        ...updateSessionDto,
        jobContext: updateSessionDto.jobContext as any,
        settings: updateSessionDto.settings as any,
        endedAt: updateSessionDto.status === 'completed' && !updateSessionDto.endedAt 
          ? new Date() 
          : updateSessionDto.endedAt ? new Date(updateSessionDto.endedAt) : undefined,
      },
    });
  }

  async delete(id: string): Promise<InterviewSession> {
    return this.databaseService.interviewSession.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: 'active' | 'paused' | 'completed'): Promise<InterviewSession> {
    return this.databaseService.interviewSession.update({
      where: { id },
      data: {
        status,
        endedAt: status === 'completed' ? new Date() : null,
      },
    });
  }

  // Interaction CRUD Operations
  async createInteraction(createInteractionDto: CreateInteractionDto): Promise<Interaction> {
    return this.databaseService.interaction.create({
      data: {
        sessionId: createInteractionDto.sessionId,
        question: createInteractionDto.question,
        questionClassification: createInteractionDto.questionClassification as any || null,
        generatedResponses: createInteractionDto.generatedResponses as any || null,
        selectedResponse: createInteractionDto.selectedResponse || null,
        userFeedback: createInteractionDto.userFeedback || null,
      },
    });
  }

  async findInteractionById(id: string): Promise<Interaction | null> {
    return this.databaseService.interaction.findUnique({
      where: { id },
    });
  }

  async findInteractionsBySessionId(sessionId: string): Promise<Interaction[]> {
    return this.databaseService.interaction.findMany({
      where: { sessionId },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }

  async updateInteraction(id: string, updateInteractionDto: UpdateInteractionDto): Promise<Interaction> {
    return this.databaseService.interaction.update({
      where: { id },
      data: updateInteractionDto,
    });
  }

  async deleteInteraction(id: string): Promise<Interaction> {
    return this.databaseService.interaction.delete({
      where: { id },
    });
  }

  // Session Metrics Operations
  async createMetrics(createMetricsDto: CreateSessionMetricsDto): Promise<SessionMetrics> {
    return this.databaseService.sessionMetrics.create({
      data: createMetricsDto,
    });
  }

  async findMetricsBySessionId(sessionId: string): Promise<SessionMetrics[]> {
    return this.databaseService.sessionMetrics.findMany({
      where: { sessionId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getLatestMetrics(sessionId: string): Promise<SessionMetrics | null> {
    return this.databaseService.sessionMetrics.findFirst({
      where: { sessionId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Analytics and Aggregation Methods
  async getSessionAnalytics(userId: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = { userId };
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [
      totalSessions,
      completedSessions,
      averageMetrics,
      questionTypeStats
    ] = await Promise.all([
      // Total sessions count
      this.databaseService.interviewSession.count({
        where: whereClause,
      }),

      // Completed sessions with duration
      this.databaseService.interviewSession.findMany({
        where: {
          ...whereClause,
          status: 'completed',
          endedAt: { not: null },
        },
        select: {
          startedAt: true,
          endedAt: true,
        },
      }),

      // Average metrics
      this.databaseService.sessionMetrics.aggregate({
        where: {
          session: {
            userId,
            ...(startDate || endDate ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              }
            } : {}),
          },
        },
        _avg: {
          transcriptionLatencyMs: true,
          responseGenerationMs: true,
          totalLatencyMs: true,
          transcriptionAccuracy: true,
          userSatisfaction: true,
        },
      }),

      // Question type statistics
      this.databaseService.interaction.groupBy({
        by: ['questionClassification'],
        where: {
          session: {
            userId,
            ...(startDate || endDate ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              }
            } : {}),
          },
        },
        _count: {
          questionClassification: true,
        },
      }),
    ]);

    // Calculate average session duration
    const averageSessionDuration = completedSessions.length > 0
      ? completedSessions.reduce((acc, session) => {
          const duration = session.endedAt!.getTime() - session.startedAt.getTime();
          return acc + duration;
        }, 0) / completedSessions.length
      : 0;

    return {
      totalSessions,
      completedSessions: completedSessions.length,
      averageSessionDuration: Math.round(averageSessionDuration / 1000 / 60), // in minutes
      averageLatency: averageMetrics._avg.totalLatencyMs || 0,
      averageAccuracy: averageMetrics._avg.transcriptionAccuracy || 0,
      averageSatisfaction: averageMetrics._avg.userSatisfaction || 0,
      questionTypeStats: questionTypeStats.map(stat => ({
        type: stat.questionClassification,
        count: stat._count.questionClassification,
      })),
    };
  }

  async getPerformanceTrends(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.databaseService.sessionMetrics.findMany({
      where: {
        session: {
          userId,
          createdAt: {
            gte: startDate,
          },
        },
      },
      select: {
        transcriptionLatencyMs: true,
        responseGenerationMs: true,
        totalLatencyMs: true,
        transcriptionAccuracy: true,
        userSatisfaction: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}