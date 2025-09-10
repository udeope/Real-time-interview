import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InterviewSessionService } from './interview-session.service';
import { InterviewSessionRepository } from './interview-session.repository';
import { CreateInterviewSessionDto, UpdateInterviewSessionDto } from './dto/interview-session.dto';

describe('InterviewSessionService', () => {
  let service: InterviewSessionService;
  let repository: jest.Mocked<InterviewSessionRepository>;

  const mockSession = {
    id: 'session-1',
    userId: 'user-1',
    jobContext: {
      title: 'Software Engineer',
      company: 'Tech Corp',
      description: 'Full-stack development role',
      requirements: ['JavaScript', 'React', 'Node.js'],
      interviewType: 'technical' as const,
      seniority: 'mid',
    },
    status: 'active',
    settings: {
      transcriptionEnabled: true,
      responseGeneration: true,
      confidenceThreshold: 0.8,
    },
    startedAt: new Date(),
    endedAt: null,
    createdAt: new Date(),
  };

  const mockInteraction = {
    id: 'interaction-1',
    sessionId: 'session-1',
    question: 'Tell me about yourself',
    questionClassification: {
      type: 'behavioral' as const,
      category: 'introduction',
      difficulty: 'junior' as const,
      requiresSTAR: false,
    },
    generatedResponses: [],
    selectedResponse: null,
    userFeedback: null,
    timestamp: new Date(),
  };

  const mockMetrics = {
    id: 'metrics-1',
    sessionId: 'session-1',
    transcriptionLatencyMs: 1200,
    responseGenerationMs: 800,
    totalLatencyMs: 2000,
    transcriptionAccuracy: 0.96,
    userSatisfaction: 5,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createInteraction: jest.fn(),
      findInteractionById: jest.fn(),
      findInteractionsBySessionId: jest.fn(),
      updateInteraction: jest.fn(),
      createMetrics: jest.fn(),
      findMetricsBySessionId: jest.fn(),
      getSessionAnalytics: jest.fn(),
      getPerformanceTrends: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewSessionService,
        {
          provide: InterviewSessionRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<InterviewSessionService>(InterviewSessionService);
    repository = module.get(InterviewSessionRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const createSessionDto: CreateInterviewSessionDto = {
        jobContext: mockSession.jobContext,
        settings: mockSession.settings,
      };

      repository.findActiveByUserId.mockResolvedValue([]);
      repository.create.mockResolvedValue(mockSession as any);

      const result = await service.createSession('user-1', createSessionDto);

      expect(repository.findActiveByUserId).toHaveBeenCalledWith('user-1');
      expect(repository.create).toHaveBeenCalledWith('user-1', createSessionDto);
      expect(result).toEqual({
        id: mockSession.id,
        userId: mockSession.userId,
        jobContext: mockSession.jobContext,
        status: mockSession.status,
        settings: mockSession.settings,
        startedAt: mockSession.startedAt,
        endedAt: mockSession.endedAt,
        createdAt: mockSession.createdAt,
      });
    });

    it('should throw BadRequestException when user has too many active sessions', async () => {
      const createSessionDto: CreateInterviewSessionDto = {};
      const activeSessions = Array(3).fill(mockSession);

      repository.findActiveByUserId.mockResolvedValue(activeSessions as any);

      await expect(service.createSession('user-1', createSessionDto))
        .rejects.toThrow(BadRequestException);

      expect(repository.findActiveByUserId).toHaveBeenCalledWith('user-1');
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findSessionById', () => {
    it('should return session when found and user has access', async () => {
      repository.findById.mockResolvedValue(mockSession as any);

      const result = await service.findSessionById('session-1', 'user-1');

      expect(repository.findById).toHaveBeenCalledWith('session-1');
      expect(result.id).toBe(mockSession.id);
    });

    it('should throw NotFoundException when session not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findSessionById('session-1', 'user-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own session', async () => {
      repository.findById.mockResolvedValue(mockSession as any);

      await expect(service.findSessionById('session-1', 'user-2'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateSession', () => {
    it('should update session successfully', async () => {
      const updateDto: UpdateInterviewSessionDto = {
        status: 'paused',
      };

      repository.findById.mockResolvedValue(mockSession as any);
      repository.update.mockResolvedValue({ ...mockSession, status: 'paused' } as any);

      const result = await service.updateSession('session-1', updateDto, 'user-1');

      expect(repository.findById).toHaveBeenCalledWith('session-1');
      expect(repository.update).toHaveBeenCalledWith('session-1', updateDto);
      expect(result.status).toBe('paused');
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const updateDto: UpdateInterviewSessionDto = {
        status: 'active',
      };

      repository.findById.mockResolvedValue({ ...mockSession, status: 'completed' } as any);

      await expect(service.updateSession('session-1', updateDto, 'user-1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('createInteraction', () => {
    it('should create interaction successfully', async () => {
      const createInteractionDto = {
        sessionId: 'session-1',
        question: 'Tell me about yourself',
        questionClassification: mockInteraction.questionClassification,
      };

      repository.findById.mockResolvedValue(mockSession as any);
      repository.createInteraction.mockResolvedValue(mockInteraction as any);

      const result = await service.createInteraction(createInteractionDto, 'user-1');

      expect(repository.findById).toHaveBeenCalledWith('session-1');
      expect(repository.createInteraction).toHaveBeenCalledWith(createInteractionDto);
      expect(result.question).toBe(mockInteraction.question);
    });

    it('should throw BadRequestException when session is not active', async () => {
      const createInteractionDto = {
        sessionId: 'session-1',
        question: 'Tell me about yourself',
      };

      repository.findById.mockResolvedValue({ ...mockSession, status: 'completed' } as any);

      await expect(service.createInteraction(createInteractionDto, 'user-1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('recordMetrics', () => {
    it('should record metrics successfully', async () => {
      const createMetricsDto = {
        sessionId: 'session-1',
        transcriptionLatencyMs: 1200,
        responseGenerationMs: 800,
        totalLatencyMs: 2000,
        transcriptionAccuracy: 0.96,
        userSatisfaction: 5,
      };

      repository.findById.mockResolvedValue(mockSession as any);
      repository.createMetrics.mockResolvedValue(mockMetrics as any);

      const result = await service.recordMetrics(createMetricsDto, 'user-1');

      expect(repository.findById).toHaveBeenCalledWith('session-1');
      expect(repository.createMetrics).toHaveBeenCalledWith(createMetricsDto);
      expect(result.transcriptionLatencyMs).toBe(mockMetrics.transcriptionLatencyMs);
    });
  });

  describe('getUserAnalytics', () => {
    it('should return user analytics successfully', async () => {
      const mockAnalytics = {
        totalSessions: 10,
        completedSessions: 8,
        averageSessionDuration: 45,
        averageLatency: 1500,
        averageAccuracy: 0.95,
        averageSatisfaction: 4.2,
        questionTypeStats: [
          { type: '{"type":"behavioral"}', count: 15 },
          { type: '{"type":"technical"}', count: 10 },
        ],
      };

      const mockTrends = [
        {
          createdAt: new Date('2024-01-01'),
          totalLatencyMs: 1500,
          transcriptionAccuracy: 0.95,
          userSatisfaction: 4,
        },
      ];

      repository.getSessionAnalytics.mockResolvedValue(mockAnalytics as any);
      repository.getPerformanceTrends.mockResolvedValue(mockTrends as any);

      const result = await service.getUserAnalytics('user-1');

      expect(repository.getSessionAnalytics).toHaveBeenCalledWith('user-1', undefined, undefined);
      expect(repository.getPerformanceTrends).toHaveBeenCalledWith('user-1');
      expect(result.totalSessions).toBe(10);
      expect(result.mostCommonQuestionTypes).toHaveLength(2);
      expect(result.performanceTrends).toHaveLength(1);
    });
  });

  describe('status transitions', () => {
    it('should allow valid status transitions', async () => {
      const validTransitions = [
        { from: 'active', to: 'paused' },
        { from: 'active', to: 'completed' },
        { from: 'paused', to: 'active' },
        { from: 'paused', to: 'completed' },
      ];

      for (const transition of validTransitions) {
        repository.findById.mockResolvedValue({ ...mockSession, status: transition.from } as any);
        repository.update.mockResolvedValue({ ...mockSession, status: transition.to } as any);

        await expect(
          service.updateSession('session-1', { status: transition.to as any }, 'user-1')
        ).resolves.toBeDefined();
      }
    });

    it('should reject invalid status transitions', async () => {
      const invalidTransitions = [
        { from: 'completed', to: 'active' },
        { from: 'completed', to: 'paused' },
      ];

      for (const transition of invalidTransitions) {
        repository.findById.mockResolvedValue({ ...mockSession, status: transition.from } as any);

        await expect(
          service.updateSession('session-1', { status: transition.to as any }, 'user-1')
        ).rejects.toThrow(BadRequestException);
      }
    });
  });
});