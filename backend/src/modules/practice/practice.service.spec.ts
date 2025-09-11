import { Test, TestingModule } from '@nestjs/testing';
import { PracticeService } from './practice.service';
import { PracticeRepository } from './practice.repository';
import { QuestionBankService } from './services/question-bank.service';
import { FeedbackService } from './services/feedback.service';
import { PracticeAnalyticsService } from './services/practice-analytics.service';
import { CreatePracticeSessionDto, QuestionType, DifficultyLevel } from './dto/practice.dto';

describe('PracticeService', () => {
  let service: PracticeService;
  let practiceRepository: jest.Mocked<PracticeRepository>;
  let questionBankService: jest.Mocked<QuestionBankService>;
  let feedbackService: jest.Mocked<FeedbackService>;
  let analyticsService: jest.Mocked<PracticeAnalyticsService>;

  const mockUser = { id: 'user-1', email: 'test@example.com' };
  const mockSession = {
    id: 'session-1',
    userId: 'user-1',
    jobTitle: 'Software Engineer',
    industry: 'Software Engineering',
    difficulty: 'mid',
    questionTypes: ['technical', 'behavioral'],
    questionCount: 5,
    status: 'active',
    startedAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPracticeRepository = {
      createPracticeSession: jest.fn(),
      findPracticeSession: jest.fn(),
      updatePracticeSession: jest.fn(),
      createPracticeQuestion: jest.fn(),
      createPracticeResponse: jest.fn(),
      updatePracticeResponse: jest.fn(),
      findUserPracticeSessions: jest.fn(),
      seedQuestionBank: jest.fn(),
    };

    const mockQuestionBankService = {
      generateQuestionsForSession: jest.fn(),
      getQuestionsByCategory: jest.fn(),
    };

    const mockFeedbackService = {
      generateFeedback: jest.fn(),
      generateSessionSummary: jest.fn(),
    };

    const mockAnalyticsService = {
      generateSessionAnalytics: jest.fn(),
      getOverallUserStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PracticeService,
        { provide: PracticeRepository, useValue: mockPracticeRepository },
        { provide: QuestionBankService, useValue: mockQuestionBankService },
        { provide: FeedbackService, useValue: mockFeedbackService },
        { provide: PracticeAnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    service = module.get<PracticeService>(PracticeService);
    practiceRepository = module.get(PracticeRepository);
    questionBankService = module.get(QuestionBankService);
    feedbackService = module.get(FeedbackService);
    analyticsService = module.get(PracticeAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPracticeSession', () => {
    it('should create a practice session successfully', async () => {
      const dto: CreatePracticeSessionDto = {
        jobTitle: 'Software Engineer',
        industry: 'Software Engineering',
        difficulty: DifficultyLevel.MID,
        questionTypes: [QuestionType.TECHNICAL, QuestionType.BEHAVIORAL],
        questionCount: 5,
        duration: 30,
      };

      const mockQuestions = [
        {
          id: 'q1',
          question: 'Test question 1',
          type: QuestionType.TECHNICAL,
          category: 'Technical',
          difficulty: DifficultyLevel.MID,
        },
        {
          id: 'q2',
          question: 'Test question 2',
          type: QuestionType.BEHAVIORAL,
          category: 'Behavioral',
          difficulty: DifficultyLevel.MID,
        },
      ];

      practiceRepository.createPracticeSession.mockResolvedValue(mockSession as any);
      questionBankService.generateQuestionsForSession.mockResolvedValue(mockQuestions);
      practiceRepository.createPracticeQuestion.mockResolvedValue({
        id: 'pq1',
        sessionId: 'session-1',
        questionBankId: 'q1',
        questionOrder: 1,
        questionBank: mockQuestions[0],
      } as any);

      const result = await service.createPracticeSession('user-1', dto);

      expect(practiceRepository.createPracticeSession).toHaveBeenCalledWith('user-1', dto);
      expect(questionBankService.generateQuestionsForSession).toHaveBeenCalledWith(
        dto.jobTitle,
        dto.industry,
        dto.difficulty,
        dto.questionTypes,
        dto.questionCount,
      );
      expect(result).toEqual({
        sessionId: 'session-1',
        questions: mockQuestions,
        status: 'created',
        createdAt: mockSession.createdAt,
      });
    });

    it('should handle errors during session creation', async () => {
      const dto: CreatePracticeSessionDto = {
        jobTitle: 'Software Engineer',
        industry: 'Software Engineering',
        difficulty: DifficultyLevel.MID,
        questionTypes: [QuestionType.TECHNICAL],
        questionCount: 5,
      };

      practiceRepository.createPracticeSession.mockRejectedValue(new Error('Database error'));

      await expect(service.createPracticeSession('user-1', dto)).rejects.toThrow('Failed to create practice session');
    });
  });

  describe('getPracticeSession', () => {
    it('should return practice session with questions', async () => {
      const mockSessionWithQuestions = {
        ...mockSession,
        questions: [
          {
            id: 'pq1',
            questionOrder: 1,
            questionBank: {
              id: 'q1',
              question: 'Test question',
              type: 'technical',
              category: 'Technical',
              difficulty: 'mid',
            },
            response: null,
          },
        ],
      };

      practiceRepository.findPracticeSession.mockResolvedValue(mockSessionWithQuestions as any);

      const result = await service.getPracticeSession('session-1');

      expect(practiceRepository.findPracticeSession).toHaveBeenCalledWith('session-1');
      expect(result.questions).toHaveLength(1);
      expect(result.progress.total).toBe(1);
      expect(result.progress.answered).toBe(0);
    });

    it('should throw error if session not found', async () => {
      practiceRepository.findPracticeSession.mockResolvedValue(null);

      await expect(service.getPracticeSession('invalid-session')).rejects.toThrow('Practice session not found');
    });
  });

  describe('submitResponse', () => {
    it('should submit response and generate feedback', async () => {
      const responseDto = {
        sessionId: 'session-1',
        questionId: 'pq1',
        response: 'This is my response',
        duration: 120,
        usedAISuggestions: false,
      };

      const mockSessionWithQuestion = {
        ...mockSession,
        questions: [
          {
            id: 'pq1',
            questionBank: {
              question: 'Test question',
              type: 'technical',
              expectedStructure: 'Technical explanation',
              keyPoints: ['Point 1', 'Point 2'],
            },
          },
        ],
      };

      const mockResponse = {
        id: 'response-1',
        sessionId: 'session-1',
        questionId: 'pq1',
        response: 'This is my response',
        duration: 120,
      };

      const mockFeedback = {
        overallScore: 8.5,
        contentScore: 8.0,
        structureScore: 8.5,
        clarityScore: 9.0,
        feedback: 'Great response!',
        strengths: ['Clear explanation'],
        improvements: ['Add more examples'],
        suggestions: ['Practice more'],
      };

      practiceRepository.findPracticeSession.mockResolvedValue(mockSessionWithQuestion as any);
      practiceRepository.createPracticeResponse.mockResolvedValue(mockResponse as any);
      feedbackService.generateFeedback.mockResolvedValue(mockFeedback);
      practiceRepository.updatePracticeResponse.mockResolvedValue({} as any);

      const result = await service.submitResponse(responseDto);

      expect(practiceRepository.createPracticeResponse).toHaveBeenCalledWith({
        sessionId: responseDto.sessionId,
        questionId: responseDto.questionId,
        response: responseDto.response,
        duration: responseDto.duration,
        usedAISuggestions: responseDto.usedAISuggestions,
      });
      expect(feedbackService.generateFeedback).toHaveBeenCalled();
      expect(result).toEqual(mockFeedback);
    });
  });

  describe('completePracticeSession', () => {
    it('should complete session and generate analytics', async () => {
      const mockSessionWithResponses = {
        ...mockSession,
        questions: [
          {
            id: 'pq1',
            response: {
              overallScore: 8.0,
            },
          },
        ],
      };

      const mockAnalytics = {
        questionsAnswered: 1,
        averageScore: 8.0,
        progressMetrics: {
          achievements: ['Completed session'],
        },
        improvementAreas: ['Time management'],
      };

      practiceRepository.findPracticeSession.mockResolvedValue(mockSessionWithResponses as any);
      practiceRepository.updatePracticeSession.mockResolvedValue({
        ...mockSession,
        status: 'completed',
        completedAt: new Date(),
        duration: 30,
      } as any);
      analyticsService.generateSessionAnalytics.mockResolvedValue(mockAnalytics);

      const result = await service.completePracticeSession('session-1');

      expect(practiceRepository.updatePracticeSession).toHaveBeenCalledWith('session-1', {
        status: 'completed',
        completedAt: expect.any(Date),
        duration: expect.any(Number),
      });
      expect(analyticsService.generateSessionAnalytics).toHaveBeenCalledWith('session-1');
      expect(result.questionsAnswered).toBe(1);
      expect(result.averageScore).toBe(8.0);
    });
  });

  describe('getNextQuestion', () => {
    it('should return next unanswered question', async () => {
      const mockSessionWithQuestions = {
        ...mockSession,
        questions: [
          {
            id: 'pq1',
            question: 'Question 1',
            type: 'technical',
            category: 'Technical',
            difficulty: 'mid',
            answered: true,
          },
          {
            id: 'pq2',
            question: 'Question 2',
            type: 'behavioral',
            category: 'Behavioral',
            difficulty: 'mid',
            answered: false,
          },
        ],
      };

      jest.spyOn(service, 'getPracticeSession').mockResolvedValue(mockSessionWithQuestions as any);

      const result = await service.getNextQuestion('session-1');

      expect(result).toEqual({
        id: 'pq2',
        question: 'Question 2',
        type: 'behavioral',
        category: 'Behavioral',
        difficulty: 'mid',
        expectedStructure: undefined,
        keyPoints: undefined,
        timeLimit: undefined,
      });
    });

    it('should return null if all questions are answered', async () => {
      const mockSessionWithAllAnswered = {
        ...mockSession,
        questions: [
          {
            id: 'pq1',
            answered: true,
          },
        ],
      };

      jest.spyOn(service, 'getPracticeSession').mockResolvedValue(mockSessionWithAllAnswered as any);

      const result = await service.getNextQuestion('session-1');

      expect(result).toBeNull();
    });
  });

  describe('getUserPracticeSessions', () => {
    it('should return user practice sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          jobTitle: 'Software Engineer',
          industry: 'Software Engineering',
          averageScore: { toNumber: () => 8.5 },
          duration: 30,
          completedAt: new Date(),
          analytics: [{ questionsAnswered: 5, improvementAreas: ['Time management'] }],
        },
      ];

      practiceRepository.findUserPracticeSessions.mockResolvedValue(mockSessions as any);

      const result = await service.getUserPracticeSessions('user-1', 10);

      expect(practiceRepository.findUserPracticeSessions).toHaveBeenCalledWith('user-1', 10);
      expect(result).toHaveLength(1);
      expect(result[0].averageScore).toBe(8.5);
    });
  });

  describe('initializeQuestionBank', () => {
    it('should initialize question bank', async () => {
      practiceRepository.seedQuestionBank.mockResolvedValue(undefined);

      await service.initializeQuestionBank();

      expect(practiceRepository.seedQuestionBank).toHaveBeenCalled();
    });
  });
});