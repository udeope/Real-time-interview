import { Test, TestingModule } from '@nestjs/testing';
import { ContextAnalysisService } from './context-analysis.service';
import { QuestionClassificationService } from './services/question-classification.service';
import { UserProfileAnalysisService } from './services/user-profile-analysis.service';
import { JobDescriptionParsingService } from './services/job-description-parsing.service';
import { ConversationHistoryService } from './services/conversation-history.service';
import { ContextDataAggregationService } from './services/context-data-aggregation.service';
import { QuestionClassification, JobContext, UserProfile } from './interfaces/context-analysis.interface';

describe('ContextAnalysisService', () => {
  let service: ContextAnalysisService;
  let questionClassificationService: jest.Mocked<QuestionClassificationService>;
  let userProfileService: jest.Mocked<UserProfileAnalysisService>;
  let jobParsingService: jest.Mocked<JobDescriptionParsingService>;
  let conversationHistoryService: jest.Mocked<ConversationHistoryService>;
  let contextAggregationService: jest.Mocked<ContextDataAggregationService>;

  const mockQuestionClassification: QuestionClassification = {
    type: 'technical',
    category: 'programming',
    difficulty: 'mid',
    requiresSTAR: false,
    confidence: 0.85,
    keywords: ['javascript', 'algorithm', 'optimization'],
    subCategories: ['frontend']
  };

  const mockJobContext: JobContext = {
    title: 'Senior Frontend Developer',
    company: 'Tech Corp',
    description: 'We are looking for a senior frontend developer...',
    requirements: ['5+ years JavaScript', 'React experience', 'TypeScript'],
    companyValues: ['Innovation', 'Collaboration'],
    interviewType: 'technical',
    seniority: 'Senior',
    industry: 'Technology'
  };

  const mockUserProfile: UserProfile = {
    userId: 'user-123',
    experience: [
      {
        company: 'Previous Corp',
        role: 'Frontend Developer',
        duration: '3 years',
        achievements: ['Built responsive web applications', 'Improved performance by 40%'],
        technologies: ['JavaScript', 'React', 'TypeScript']
      }
    ],
    skills: [
      {
        name: 'JavaScript',
        level: 'advanced',
        category: 'technical',
        yearsOfExperience: 5
      },
      {
        name: 'React',
        level: 'expert',
        category: 'technical',
        yearsOfExperience: 4
      }
    ],
    industries: ['Technology'],
    seniority: 'mid',
    preferences: {
      preferredResponseStyle: 'detailed',
      focusAreas: ['technical skills', 'problem solving'],
      avoidTopics: [],
      communicationStyle: 'formal'
    }
  };

  beforeEach(async () => {
    const mockQuestionClassificationService = {
      classifyQuestion: jest.fn()
    };

    const mockUserProfileService = {
      analyzeUserProfile: jest.fn(),
      extractSkillsFromExperience: jest.fn()
    };

    const mockJobParsingService = {
      extractJobContext: jest.fn(),
      matchRequirements: jest.fn()
    };

    const mockConversationHistoryService = {
      updateConversationHistory: jest.fn(),
      getConversationHistory: jest.fn(),
      getConversationStats: jest.fn(),
      getConversationContext: jest.fn(),
      findSimilarQuestions: jest.fn(),
      getRecentQuestionTypes: jest.fn()
    };

    const mockContextAggregationService = {
      getRelevantContext: jest.fn(),
      analyzeQuestionContext: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextAnalysisService,
        {
          provide: QuestionClassificationService,
          useValue: mockQuestionClassificationService
        },
        {
          provide: UserProfileAnalysisService,
          useValue: mockUserProfileService
        },
        {
          provide: JobDescriptionParsingService,
          useValue: mockJobParsingService
        },
        {
          provide: ConversationHistoryService,
          useValue: mockConversationHistoryService
        },
        {
          provide: ContextDataAggregationService,
          useValue: mockContextAggregationService
        }
      ]
    }).compile();

    service = module.get<ContextAnalysisService>(ContextAnalysisService);
    questionClassificationService = module.get(QuestionClassificationService);
    userProfileService = module.get(UserProfileAnalysisService);
    jobParsingService = module.get(JobDescriptionParsingService);
    conversationHistoryService = module.get(ConversationHistoryService);
    contextAggregationService = module.get(ContextDataAggregationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyQuestion', () => {
    it('should classify a technical question correctly', async () => {
      const question = 'How would you optimize a JavaScript function for better performance?';
      questionClassificationService.classifyQuestion.mockResolvedValue(mockQuestionClassification);

      const result = await service.classifyQuestion(question);

      expect(questionClassificationService.classifyQuestion).toHaveBeenCalledWith(
        question,
        undefined,
        undefined
      );
      expect(result).toEqual(mockQuestionClassification);
      expect(result.type).toBe('technical');
      expect(result.category).toBe('programming');
    });

    it('should classify a behavioral question correctly', async () => {
      const question = 'Tell me about a time when you had to work with a difficult team member';
      const behavioralClassification: QuestionClassification = {
        type: 'behavioral',
        category: 'teamwork',
        difficulty: 'mid',
        requiresSTAR: true,
        confidence: 0.9,
        keywords: ['team', 'difficult', 'work'],
        subCategories: ['collaboration']
      };

      questionClassificationService.classifyQuestion.mockResolvedValue(behavioralClassification);

      const result = await service.classifyQuestion(question);

      expect(result.type).toBe('behavioral');
      expect(result.requiresSTAR).toBe(true);
    });

    it('should handle job context in classification', async () => {
      const question = 'What is your experience with React?';
      questionClassificationService.classifyQuestion.mockResolvedValue(mockQuestionClassification);

      await service.classifyQuestion(question, undefined, mockJobContext);

      expect(questionClassificationService.classifyQuestion).toHaveBeenCalledWith(
        question,
        undefined,
        mockJobContext
      );
    });
  });

  describe('analyzeUserProfile', () => {
    it('should analyze user profile successfully', async () => {
      const userId = 'user-123';
      userProfileService.analyzeUserProfile.mockResolvedValue(mockUserProfile);

      const result = await service.analyzeUserProfile(userId);

      expect(userProfileService.analyzeUserProfile).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUserProfile);
      expect(result.skills).toHaveLength(2);
      expect(result.experience).toHaveLength(1);
    });

    it('should throw error when user profile not found', async () => {
      const userId = 'nonexistent-user';
      userProfileService.analyzeUserProfile.mockRejectedValue(
        new Error('User profile not found for user: nonexistent-user')
      );

      await expect(service.analyzeUserProfile(userId)).rejects.toThrow(
        'User profile not found for user: nonexistent-user'
      );
    });
  });

  describe('extractJobContext', () => {
    it('should extract job context from description', async () => {
      const jobDescription = 'We are looking for a Senior Frontend Developer with 5+ years of experience...';
      jobParsingService.extractJobContext.mockResolvedValue(mockJobContext);

      const result = await service.extractJobContext(jobDescription);

      expect(jobParsingService.extractJobContext).toHaveBeenCalledWith(jobDescription);
      expect(result).toEqual(mockJobContext);
      expect(result.title).toBe('Senior Frontend Developer');
      expect(result.seniority).toBe('Senior');
    });
  });

  describe('matchRequirements', () => {
    it('should match job requirements with user profile', async () => {
      const userId = 'user-123';
      const mockMatches = [
        {
          requirement: '5+ years JavaScript',
          matchingSkills: [mockUserProfile.skills[0]],
          matchingExperiences: [mockUserProfile.experience[0]],
          matchScore: 0.9,
          gaps: []
        }
      ];

      userProfileService.analyzeUserProfile.mockResolvedValue(mockUserProfile);
      jobParsingService.matchRequirements.mockResolvedValue(mockMatches);

      const result = await service.matchRequirements(mockJobContext, userId);

      expect(userProfileService.analyzeUserProfile).toHaveBeenCalledWith(userId);
      expect(jobParsingService.matchRequirements).toHaveBeenCalledWith(
        mockJobContext,
        mockUserProfile.skills,
        mockUserProfile.experience
      );
      expect(result).toEqual(mockMatches);
    });
  });

  describe('updateConversationHistory', () => {
    it('should update conversation history with question classification', async () => {
      const sessionId = 'session-123';
      const question = 'What is your experience with React?';
      const response = 'I have 4 years of experience with React...';

      questionClassificationService.classifyQuestion.mockResolvedValue(mockQuestionClassification);
      conversationHistoryService.updateConversationHistory.mockResolvedValue();

      await service.updateConversationHistory(sessionId, question, response, 4, 90);

      expect(questionClassificationService.classifyQuestion).toHaveBeenCalledWith(question);
      expect(conversationHistoryService.updateConversationHistory).toHaveBeenCalledWith(
        sessionId,
        question,
        mockQuestionClassification,
        response,
        4,
        90
      );
    });
  });

  describe('getRelevantContext', () => {
    it('should get comprehensive context data', async () => {
      const userId = 'user-123';
      const question = 'How do you handle state management in React?';
      const sessionId = 'session-123';

      const mockContextData = {
        userProfile: mockUserProfile,
        jobContext: mockJobContext,
        conversationHistory: [],
        relevantExperiences: [mockUserProfile.experience[0]],
        matchingSkills: [mockUserProfile.skills[1]], // React skill
        suggestedApproach: {
          structure: 'technical' as const,
          tone: 'analytical' as const,
          focusPoints: ['Demonstrate technical expertise', 'Show problem-solving approach'],
          examplesNeeded: true,
          estimatedDuration: 75
        }
      };

      contextAggregationService.getRelevantContext.mockResolvedValue(mockContextData);

      const result = await service.getRelevantContext(userId, question, sessionId, mockJobContext);

      expect(contextAggregationService.getRelevantContext).toHaveBeenCalledWith(
        userId,
        question,
        sessionId,
        mockJobContext
      );
      expect(result).toEqual(mockContextData);
    });
  });

  describe('analyzeQuestionContext', () => {
    it('should analyze question context comprehensively', async () => {
      const userId = 'user-123';
      const question = 'Describe a challenging project you worked on';
      const sessionId = 'session-123';

      const mockAnalysis = {
        classification: {
          type: 'behavioral' as const,
          category: 'problem-solving',
          difficulty: 'mid' as const,
          requiresSTAR: true,
          confidence: 0.88,
          keywords: ['challenging', 'project'],
          subCategories: ['project-management']
        },
        contextualFactors: ['Behavioral question requiring STAR structure', 'Mid-interview phase'],
        recommendedApproach: {
          structure: 'STAR' as const,
          tone: 'confident' as const,
          focusPoints: ['Use specific examples', 'Show impact and results'],
          examplesNeeded: true,
          estimatedDuration: 90
        },
        relevantExperiences: [mockUserProfile.experience[0]],
        keyPoints: ['Structure response using STAR method', 'Include specific metrics and outcomes']
      };

      userProfileService.analyzeUserProfile.mockResolvedValue(mockUserProfile);
      conversationHistoryService.getConversationHistory.mockResolvedValue([]);
      contextAggregationService.analyzeQuestionContext.mockResolvedValue(mockAnalysis);

      const result = await service.analyzeQuestionContext(question, userId, sessionId, mockJobContext);

      expect(userProfileService.analyzeUserProfile).toHaveBeenCalledWith(userId);
      expect(conversationHistoryService.getConversationHistory).toHaveBeenCalledWith(sessionId, 10);
      expect(contextAggregationService.analyzeQuestionContext).toHaveBeenCalledWith(
        question,
        mockUserProfile,
        mockJobContext,
        []
      );
      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('getConversationStats', () => {
    it('should get conversation statistics', async () => {
      const sessionId = 'session-123';
      const mockStats = {
        totalQuestions: 15,
        questionTypeDistribution: {
          technical: 8,
          behavioral: 5,
          situational: 2
        },
        averageFeedback: 4.2,
        totalDuration: 1800000 // 30 minutes in ms
      };

      conversationHistoryService.getConversationStats.mockResolvedValue(mockStats);

      const result = await service.getConversationStats(sessionId);

      expect(conversationHistoryService.getConversationStats).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual(mockStats);
      expect(result.totalQuestions).toBe(15);
      expect(result.questionTypeDistribution.technical).toBe(8);
    });
  });

  describe('findSimilarQuestions', () => {
    it('should find similar questions from user history', async () => {
      const userId = 'user-123';
      const question = 'How do you optimize React performance?';
      const mockSimilarQuestions = [
        {
          interactionId: 'interaction-1',
          timestamp: new Date(),
          question: 'What are React performance best practices?',
          questionClassification: mockQuestionClassification,
          response: 'I use React.memo and useMemo...',
          feedback: 5
        }
      ];

      conversationHistoryService.findSimilarQuestions.mockResolvedValue(mockSimilarQuestions);

      const result = await service.findSimilarQuestions(question, userId, 5);

      expect(conversationHistoryService.findSimilarQuestions).toHaveBeenCalledWith(question, userId, 5);
      expect(result).toEqual(mockSimilarQuestions);
      expect(result).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle and re-throw errors from underlying services', async () => {
      const question = 'Test question';
      questionClassificationService.classifyQuestion.mockRejectedValue(
        new Error('Classification service error')
      );

      await expect(service.classifyQuestion(question)).rejects.toThrow('Classification service error');
    });

    it('should handle database connection errors gracefully', async () => {
      const userId = 'user-123';
      userProfileService.analyzeUserProfile.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.analyzeUserProfile(userId)).rejects.toThrow('Database connection failed');
    });
  });
});