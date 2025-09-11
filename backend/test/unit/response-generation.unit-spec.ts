import { Test, TestingModule } from '@nestjs/testing';
import { ResponseGenerationService } from '../../src/modules/response-generation/response-generation.service';
import { StarStructureService } from '../../src/modules/response-generation/services/star-structure.service';
import { ResponsePersonalizationService } from '../../src/modules/response-generation/services/response-personalization.service';
import { ResponseValidationService } from '../../src/modules/response-generation/services/response-validation.service';
import { OpenAIService } from '../../src/modules/response-generation/providers/openai.service';

describe('Response Generation Unit Tests', () => {
  let responseGenerationService: ResponseGenerationService;
  let starStructureService: StarStructureService;
  let personalizationService: ResponsePersonalizationService;
  let validationService: ResponseValidationService;
  let openAIService: OpenAIService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseGenerationService,
        {
          provide: StarStructureService,
          useValue: {
            applySTARStructure: jest.fn(),
            validateSTARComponents: jest.fn(),
          },
        },
        {
          provide: ResponsePersonalizationService,
          useValue: {
            personalizeResponse: jest.fn(),
            adaptToProfile: jest.fn(),
          },
        },
        {
          provide: ResponseValidationService,
          useValue: {
            validateLength: jest.fn(),
            validateContent: jest.fn(),
            estimateDuration: jest.fn(),
          },
        },
        {
          provide: OpenAIService,
          useValue: {
            generateResponse: jest.fn(),
            generateMultipleOptions: jest.fn(),
          },
        },
      ],
    }).compile();

    responseGenerationService = module.get<ResponseGenerationService>(ResponseGenerationService);
    starStructureService = module.get<StarStructureService>(StarStructureService);
    personalizationService = module.get<ResponsePersonalizationService>(ResponsePersonalizationService);
    validationService = module.get<ResponseValidationService>(ResponseValidationService);
    openAIService = module.get<OpenAIService>(OpenAIService);
  });

  describe('Response Generation', () => {
    it('should generate multiple response options', async () => {
      const question = 'Tell me about your experience with React';
      const context = {
        jobTitle: 'Frontend Developer',
        userSkills: ['React', 'JavaScript', 'TypeScript'],
        questionType: 'technical',
      };

      const mockResponses = [
        {
          id: '1',
          content: 'I have 3 years of experience with React...',
          structure: 'direct',
          estimatedDuration: 60,
          confidence: 0.95,
          tags: ['react', 'frontend'],
        },
        {
          id: '2',
          content: 'In my previous role, I worked extensively with React...',
          structure: 'STAR',
          estimatedDuration: 75,
          confidence: 0.92,
          tags: ['react', 'experience'],
        },
      ];

      jest.spyOn(openAIService, 'generateMultipleOptions').mockResolvedValue(mockResponses);
      jest.spyOn(validationService, 'validateLength').mockReturnValue(true);
      jest.spyOn(validationService, 'estimateDuration').mockReturnValue(60);

      const responses = await responseGenerationService.generateResponses(question, context, {});

      expect(responses).toHaveLength(2);
      expect(responses[0].content).toContain('React');
      expect(responses[0].estimatedDuration).toBeLessThan(90);
      expect(openAIService.generateMultipleOptions).toHaveBeenCalledWith(question, context);
    });

    it('should apply STAR structure for behavioral questions', async () => {
      const behavioralQuestion = 'Tell me about a time you solved a difficult problem';
      const context = {
        questionType: 'behavioral',
        requiresSTAR: true,
      };
      const userExperience = [
        {
          company: 'Tech Corp',
          achievements: ['Reduced API response time by 50%'],
        },
      ];

      const starResponse = {
        situation: 'At Tech Corp, our API was experiencing slow response times...',
        task: 'I was tasked with improving the performance...',
        action: 'I implemented caching and optimized database queries...',
        result: 'This reduced response time by 50% and improved user satisfaction.',
      };

      jest.spyOn(starStructureService, 'applySTARStructure').mockResolvedValue(starResponse);

      const result = await responseGenerationService.generateSTARResponse(
        behavioralQuestion,
        context,
        userExperience,
      );

      expect(result.situation).toBeDefined();
      expect(result.task).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.result).toBeDefined();
      expect(starStructureService.applySTARStructure).toHaveBeenCalled();
    });

    it('should personalize responses based on user profile', async () => {
      const genericResponse = 'I have experience with JavaScript development';
      const userProfile = {
        experience: [
          {
            company: 'Startup Inc',
            role: 'Full Stack Developer',
            technologies: ['JavaScript', 'Node.js', 'React'],
          },
        ],
        seniority: 'mid',
      };

      const personalizedResponse = 'In my role as Full Stack Developer at Startup Inc, I worked extensively with JavaScript, particularly with Node.js and React...';

      jest.spyOn(personalizationService, 'personalizeResponse').mockResolvedValue(personalizedResponse);

      const result = await responseGenerationService.personalizeResponse(genericResponse, userProfile);

      expect(result).toContain('Startup Inc');
      expect(result).toContain('Full Stack Developer');
      expect(personalizationService.personalizeResponse).toHaveBeenCalledWith(genericResponse, userProfile);
    });

    it('should validate response length and duration', async () => {
      const longResponse = 'This is a very long response that exceeds the recommended speaking time...'.repeat(50);
      const shortResponse = 'This is a concise response that fits within time limits.';

      jest.spyOn(validationService, 'validateLength')
        .mockReturnValueOnce(false) // long response
        .mockReturnValueOnce(true); // short response

      jest.spyOn(validationService, 'estimateDuration')
        .mockReturnValueOnce(120) // long response
        .mockReturnValueOnce(45); // short response

      const longValidation = await responseGenerationService.validateResponse(longResponse);
      const shortValidation = await responseGenerationService.validateResponse(shortResponse);

      expect(longValidation.isValid).toBe(false);
      expect(longValidation.estimatedDuration).toBeGreaterThan(90);
      expect(shortValidation.isValid).toBe(true);
      expect(shortValidation.estimatedDuration).toBeLessThan(90);
    });

    it('should handle API failures gracefully', async () => {
      const question = 'Tell me about yourself';
      const context = { questionType: 'general' };

      jest.spyOn(openAIService, 'generateMultipleOptions').mockRejectedValue(new Error('API Error'));

      const fallbackResponse = {
        id: 'fallback',
        content: 'I apologize, but I\'m having trouble generating a response right now.',
        structure: 'direct',
        estimatedDuration: 10,
        confidence: 0.5,
        tags: ['fallback'],
      };

      jest.spyOn(responseGenerationService, 'getFallbackResponse').mockResolvedValue(fallbackResponse);

      const responses = await responseGenerationService.generateResponses(question, context, {});

      expect(responses).toHaveLength(1);
      expect(responses[0].id).toBe('fallback');
      expect(responses[0].confidence).toBeLessThan(1);
    });
  });

  describe('Response Caching', () => {
    it('should cache frequently requested responses', async () => {
      const commonQuestion = 'Tell me about yourself';
      const cachedResponse = {
        id: 'cached',
        content: 'Cached response content',
        structure: 'direct',
        estimatedDuration: 60,
        confidence: 0.95,
        tags: ['cached'],
      };

      jest.spyOn(responseGenerationService, 'getCachedResponse').mockResolvedValue(cachedResponse);

      const response = await responseGenerationService.generateResponses(commonQuestion, {}, {});

      expect(response[0]).toEqual(cachedResponse);
      expect(openAIService.generateMultipleOptions).not.toHaveBeenCalled();
    });
  });
});