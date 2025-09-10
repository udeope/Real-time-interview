import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ResponseGenerationService } from './response-generation.service';
import { OpenAIService } from './providers/openai.service';
import { STARStructureService } from './services/star-structure.service';
import { ResponsePersonalizationService } from './services/response-personalization.service';
import { ResponseValidationService } from './services/response-validation.service';
import { ResponseCacheService } from './services/response-cache.service';
import { 
  ResponseGenerationRequest,
  PersonalizationContext,
  ResponseOption
} from './interfaces/response-generation.interface';

describe('ResponseGenerationService', () => {
  let service: ResponseGenerationService;
  let openaiService: jest.Mocked<OpenAIService>;
  let starService: jest.Mocked<STARStructureService>;
  let personalizationService: jest.Mocked<ResponsePersonalizationService>;
  let validationService: jest.Mocked<ResponseValidationService>;
  let cacheService: jest.Mocked<ResponseCacheService>;

  const mockContext: PersonalizationContext = {
    userProfile: {
      userId: 'user-123',
      experience: [
        {
          company: 'Tech Corp',
          role: 'Senior Developer',
          duration: '3 years',
          achievements: ['Led team of 5 developers', 'Improved performance by 40%'],
          technologies: ['React', 'Node.js', 'TypeScript']
        }
      ],
      skills: [
        {
          name: 'JavaScript',
          level: 'expert',
          category: 'technical',
          yearsOfExperience: 5
        }
      ],
      industries: ['technology'],
      seniority: 'senior',
      preferences: {
        preferredResponseStyle: 'detailed',
        focusAreas: ['leadership', 'technical'],
        communicationStyle: 'formal'
      }
    },
    jobContext: {
      title: 'Senior Full Stack Developer',
      company: 'Innovation Inc',
      description: 'Looking for experienced developer',
      requirements: ['React', 'Node.js', 'Leadership'],
      companyValues: ['Innovation', 'Collaboration'],
      interviewType: 'technical',
      seniority: 'senior',
      industry: 'technology'
    },
    questionClassification: {
      type: 'behavioral',
      category: 'leadership',
      difficulty: 'senior',
      requiresSTAR: true,
      confidence: 0.9,
      keywords: ['leadership', 'team']
    },
    conversationHistory: [],
    relevantExperiences: [],
    matchingSkills: []
  };

  const mockResponseOption: ResponseOption = {
    id: 'response-1',
    content: 'I have extensive experience leading development teams...',
    structure: 'STAR',
    estimatedDuration: 75,
    confidence: 0.85,
    tags: ['leadership', 'technical'],
    tone: 'detailed',
    reasoning: 'Uses STAR method for behavioral question'
  };

  beforeEach(async () => {
    const mockOpenAIService = {
      generateResponses: jest.fn(),
    };

    const mockSTARService = {
      applySTARStructure: jest.fn(),
      requiresSTARMethod: jest.fn(),
    };

    const mockPersonalizationService = {
      personalizeResponse: jest.fn(),
      generateMultipleOptions: jest.fn(),
    };

    const mockValidationService = {
      validateResponse: jest.fn(),
    };

    const mockCacheService = {
      getCachedResponses: jest.fn(),
      cacheResponses: jest.fn(),
      getCacheStats: jest.fn(),
      clearCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseGenerationService,
        {
          provide: OpenAIService,
          useValue: mockOpenAIService,
        },
        {
          provide: STARStructureService,
          useValue: mockSTARService,
        },
        {
          provide: ResponsePersonalizationService,
          useValue: mockPersonalizationService,
        },
        {
          provide: ResponseValidationService,
          useValue: mockValidationService,
        },
        {
          provide: ResponseCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ResponseGenerationService>(ResponseGenerationService);
    openaiService = module.get(OpenAIService);
    starService = module.get(STARStructureService);
    personalizationService = module.get(ResponsePersonalizationService);
    validationService = module.get(ResponseValidationService);
    cacheService = module.get(ResponseCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateResponses', () => {
    const mockRequest: ResponseGenerationRequest = {
      question: 'Tell me about a time you led a team',
      userId: 'user-123',
      context: mockContext,
      options: {
        responseCount: 3,
        maxDuration: 90
      }
    };

    it('should return cached responses when available', async () => {
      const cachedResponses = [mockResponseOption];
      cacheService.getCachedResponses.mockResolvedValue(cachedResponses);

      const result = await service.generateResponses(mockRequest);

      expect(result.responses).toEqual(cachedResponses);
      expect(result.fromCache).toBe(true);
      expect(cacheService.getCachedResponses).toHaveBeenCalledWith(
        mockRequest.question,
        mockRequest.context
      );
    });

    it('should generate new responses when cache miss', async () => {
      cacheService.getCachedResponses.mockResolvedValue(null);
      openaiService.generateResponses.mockResolvedValue([mockResponseOption]);
      personalizationService.generateMultipleOptions.mockResolvedValue([]);
      starService.applySTARStructure.mockResolvedValue(mockResponseOption.content);
      personalizationService.personalizeResponse.mockResolvedValue(mockResponseOption.content);
      validationService.validateResponse.mockResolvedValue({
        isValid: true,
        estimatedDurationSeconds: 75,
        wordCount: 150,
        issues: []
      });

      const result = await service.generateResponses(mockRequest);

      expect(result.responses).toHaveLength(1);
      expect(result.fromCache).toBe(false);
      expect(openaiService.generateResponses).toHaveBeenCalled();
      expect(cacheService.cacheResponses).toHaveBeenCalled();
    });

    it('should handle errors gracefully with fallback responses', async () => {
      cacheService.getCachedResponses.mockResolvedValue(null);
      openaiService.generateResponses.mockRejectedValue(new Error('API Error'));

      const result = await service.generateResponses(mockRequest);

      expect(result.responses).toHaveLength(1);
      expect(result.responses[0].tags).toContain('fallback');
      expect(result.fromCache).toBe(false);
    });

    it('should validate and optimize responses', async () => {
      cacheService.getCachedResponses.mockResolvedValue(null);
      openaiService.generateResponses.mockResolvedValue([mockResponseOption]);
      personalizationService.generateMultipleOptions.mockResolvedValue([]);
      starService.applySTARStructure.mockResolvedValue(mockResponseOption.content);
      personalizationService.personalizeResponse.mockResolvedValue(mockResponseOption.content);
      
      const validationResult = {
        isValid: true,
        estimatedDurationSeconds: 120,
        wordCount: 300,
        issues: ['Response is too long'],
        optimizedResponse: 'Optimized shorter response'
      };
      validationService.validateResponse.mockResolvedValue(validationResult);

      const result = await service.generateResponses(mockRequest);

      expect(result.responses[0].content).toBe('Optimized shorter response');
      expect(validationService.validateResponse).toHaveBeenCalledWith(
        mockResponseOption.content,
        90
      );
    });
  });

  describe('applySTARStructure', () => {
    it('should apply STAR structure to content', async () => {
      const content = 'I led a team project successfully';
      const experiences = mockContext.userProfile.experience;
      const structuredContent = '**Situation:** I led a team project successfully...';
      
      starService.applySTARStructure.mockResolvedValue(structuredContent);

      const result = await service.applySTARStructure(
        content,
        experiences,
        mockContext.questionClassification
      );

      expect(result).toBe(structuredContent);
      expect(starService.applySTARStructure).toHaveBeenCalledWith(
        content,
        experiences,
        mockContext.questionClassification
      );
    });
  });

  describe('personalizeResponse', () => {
    it('should personalize response template', async () => {
      const template = 'I have experience in {industry}';
      const personalizedResponse = 'I have experience in technology';
      
      personalizationService.personalizeResponse.mockResolvedValue(personalizedResponse);

      const result = await service.personalizeResponse(template, mockContext);

      expect(result).toBe(personalizedResponse);
      expect(personalizationService.personalizeResponse).toHaveBeenCalledWith(
        template,
        mockContext
      );
    });
  });

  describe('validateResponse', () => {
    it('should validate response and return results', async () => {
      const response = 'This is a test response';
      const validationResult = {
        isValid: true,
        estimatedDurationSeconds: 60,
        wordCount: 100,
        issues: []
      };
      
      validationService.validateResponse.mockResolvedValue(validationResult);

      const result = await service.validateResponse(response, 90);

      expect(result).toEqual(validationResult);
      expect(validationService.validateResponse).toHaveBeenCalledWith(response, 90);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const stats = {
        totalKeys: 100,
        memoryUsage: '1.2 MB',
        hitRate: 85.5,
        topQuestions: []
      };
      
      cacheService.getCacheStats.mockResolvedValue(stats);

      const result = await service.getCacheStats();

      expect(result).toEqual(stats);
      expect(cacheService.getCacheStats).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear cache and return deleted count', async () => {
      const deletedCount = 50;
      cacheService.clearCache.mockResolvedValue(deletedCount);

      const result = await service.clearCache('pattern:*');

      expect(result).toBe(deletedCount);
      expect(cacheService.clearCache).toHaveBeenCalledWith('pattern:*');
    });
  });

  describe('private methods', () => {
    it('should deduplicate similar responses', async () => {
      const duplicateResponses = [
        { ...mockResponseOption, id: '1', content: 'I have experience leading teams.' },
        { ...mockResponseOption, id: '2', content: 'I have experience leading teams!' },
        { ...mockResponseOption, id: '3', content: 'Different response entirely.' }
      ];

      cacheService.getCachedResponses.mockResolvedValue(null);
      openaiService.generateResponses.mockResolvedValue(duplicateResponses);
      personalizationService.generateMultipleOptions.mockResolvedValue([]);
      starService.applySTARStructure.mockResolvedValue(mockResponseOption.content);
      personalizationService.personalizeResponse.mockResolvedValue(mockResponseOption.content);
      validationService.validateResponse.mockResolvedValue({
        isValid: true,
        estimatedDurationSeconds: 75,
        wordCount: 150,
        issues: []
      });

      const request: ResponseGenerationRequest = {
        question: 'Test question',
        userId: 'user-123',
        context: mockContext
      };

      const result = await service.generateResponses(request);

      // Should have deduplicated the similar responses
      expect(result.responses.length).toBeLessThan(duplicateResponses.length);
    });

    it('should sort responses by confidence', async () => {
      const unsortedResponses = [
        { ...mockResponseOption, id: '1', confidence: 0.7 },
        { ...mockResponseOption, id: '2', confidence: 0.9 },
        { ...mockResponseOption, id: '3', confidence: 0.8 }
      ];

      cacheService.getCachedResponses.mockResolvedValue(null);
      openaiService.generateResponses.mockResolvedValue(unsortedResponses);
      personalizationService.generateMultipleOptions.mockResolvedValue([]);
      starService.applySTARStructure.mockResolvedValue(mockResponseOption.content);
      personalizationService.personalizeResponse.mockResolvedValue(mockResponseOption.content);
      validationService.validateResponse.mockResolvedValue({
        isValid: true,
        estimatedDurationSeconds: 75,
        wordCount: 150,
        issues: []
      });

      const request: ResponseGenerationRequest = {
        question: 'Test question',
        userId: 'user-123',
        context: mockContext
      };

      const result = await service.generateResponses(request);

      // Should be sorted by confidence (highest first)
      expect(result.responses.length).toBeGreaterThan(0);
      if (result.responses.length > 1) {
        expect(result.responses[0].confidence).toBeGreaterThanOrEqual(result.responses[1].confidence);
      }
    });
  });
});