import { Test, TestingModule } from '@nestjs/testing';
import { ResponseGenerationService } from '../../src/modules/response-generation/response-generation.service';
import { STARStructureService } from '../../src/modules/response-generation/services/star-structure.service';
import { ResponsePersonalizationService } from '../../src/modules/response-generation/services/response-personalization.service';
import { ResponseValidationService } from '../../src/modules/response-generation/services/response-validation.service';
import { ResponseCacheService } from '../../src/modules/response-generation/services/response-cache.service';
import { OpenAIService } from '../../src/modules/response-generation/providers/openai.service';
import {
    ResponseGenerationRequest,
    ResponseOption,
    PersonalizationContext,
    ResponseValidationResult
} from '../../src/modules/response-generation/interfaces/response-generation.interface';

describe('Response Generation Unit Tests', () => {
    let responseGenerationService: ResponseGenerationService;
    let starStructureService: STARStructureService;
    let personalizationService: ResponsePersonalizationService;
    let validationService: ResponseValidationService;
    let cacheService: ResponseCacheService;
    let openAIService: OpenAIService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseGenerationService,
                {
                    provide: STARStructureService,
                    useValue: {
                        applySTARStructure: jest.fn(),
                        requiresSTARMethod: jest.fn(),
                        extractSTARComponents: jest.fn(),
                        formatSTARResponse: jest.fn(),
                    },
                },
                {
                    provide: ResponsePersonalizationService,
                    useValue: {
                        personalizeResponse: jest.fn(),
                        generateMultipleOptions: jest.fn(),
                        adaptResponseTone: jest.fn(),
                        selectOptimalStructure: jest.fn(),
                    },
                },
                {
                    provide: ResponseValidationService,
                    useValue: {
                        validateResponse: jest.fn(),
                        optimizeLength: jest.fn(),
                        expandResponse: jest.fn(),
                        estimateDuration: jest.fn(),
                        countWords: jest.fn(),
                    },
                },
                {
                    provide: ResponseCacheService,
                    useValue: {
                        getCachedResponses: jest.fn(),
                        cacheResponses: jest.fn(),
                        getCacheStats: jest.fn(),
                        clearCache: jest.fn(),
                    },
                },
                {
                    provide: OpenAIService,
                    useValue: {
                        generateResponses: jest.fn(),
                        generateCustomResponse: jest.fn(),
                    },
                },
            ],
        }).compile();

        responseGenerationService = module.get<ResponseGenerationService>(ResponseGenerationService);
        starStructureService = module.get<STARStructureService>(STARStructureService);
        personalizationService = module.get<ResponsePersonalizationService>(ResponsePersonalizationService);
        validationService = module.get<ResponseValidationService>(ResponseValidationService);
        cacheService = module.get<ResponseCacheService>(ResponseCacheService);
        openAIService = module.get<OpenAIService>(OpenAIService);
    });

    describe('Response Generation', () => {
        it('should generate multiple response options', async () => {
            const request: ResponseGenerationRequest = {
                question: 'Tell me about your experience with React',
                userId: 'user-123',
                context: {
                    userProfile: {
                        userId: 'user-123',
                        experience: [{
                            company: 'Tech Corp',
                            role: 'Frontend Developer',
                            duration: '2 years',
                            achievements: ['Built responsive web applications'],
                            technologies: ['React', 'JavaScript', 'TypeScript']
                        }],
                        skills: [
                            { name: 'React', level: 'advanced', category: 'technical' },
                            { name: 'JavaScript', level: 'expert', category: 'technical' }
                        ],
                        industries: ['technology'],
                        seniority: 'mid',
                        preferences: {
                            preferredResponseStyle: 'detailed',
                            focusAreas: ['frontend'],
                            communicationStyle: 'adaptive'
                        }
                    },
                    jobContext: {
                        title: 'Frontend Developer',
                        company: 'Example Corp',
                        description: 'Frontend development role',
                        requirements: ['React', 'JavaScript'],
                        companyValues: ['innovation'],
                        interviewType: 'technical',
                        seniority: 'mid',
                        industry: 'technology'
                    },
                    questionClassification: {
                        type: 'technical',
                        category: 'experience',
                        difficulty: 'mid',
                        requiresSTAR: false,
                        confidence: 0.9,
                        keywords: ['React', 'experience']
                    },
                    conversationHistory: [],
                    relevantExperiences: [],
                    matchingSkills: []
                }
            };

            const mockResponses: ResponseOption[] = [
                {
                    id: '1',
                    content: 'I have 3 years of experience with React...',
                    structure: 'direct',
                    estimatedDuration: 60,
                    confidence: 0.95,
                    tags: ['react', 'frontend'],
                    tone: 'balanced'
                },
                {
                    id: '2',
                    content: 'In my previous role, I worked extensively with React...',
                    structure: 'technical',
                    estimatedDuration: 75,
                    confidence: 0.92,
                    tags: ['react', 'experience'],
                    tone: 'detailed'
                },
            ];

            jest.spyOn(cacheService, 'getCachedResponses').mockResolvedValue(null);
            jest.spyOn(openAIService, 'generateResponses').mockResolvedValue(mockResponses);
            jest.spyOn(personalizationService, 'generateMultipleOptions').mockResolvedValue([]);
            jest.spyOn(validationService, 'validateResponse').mockResolvedValue({
                isValid: true,
                estimatedDurationSeconds: 60,
                wordCount: 150,
                issues: []
            });
            jest.spyOn(cacheService, 'cacheResponses').mockResolvedValue();

            const result = await responseGenerationService.generateResponses(request);

            expect(result.responses).toHaveLength(2);
            expect(result.responses[0].content).toContain('React');
            expect(result.responses[0].estimatedDuration).toBeLessThan(90);
            expect(result.fromCache).toBe(false);
            expect(openAIService.generateResponses).toHaveBeenCalledWith(
                request.question,
                request.context,
                {}
            );
        });

        it('should apply STAR structure for behavioral questions', async () => {
            const content = 'I solved a difficult problem by implementing a new solution';
            const experiences = [
                {
                    company: 'Tech Corp',
                    role: 'Developer',
                    duration: '2 years',
                    achievements: ['Reduced API response time by 50%'],
                    technologies: ['Node.js', 'Redis']
                },
            ];

            const starResponse = '**Situation:** At Tech Corp, our API was experiencing slow response times...\n\n**Task:** I was tasked with improving the performance...\n\n**Action:** I implemented caching and optimized database queries...\n\n**Result:** This reduced response time by 50% and improved user satisfaction.';

            jest.spyOn(starStructureService, 'applySTARStructure').mockResolvedValue(starResponse);

            const result = await responseGenerationService.applySTARStructure(
                content,
                experiences
            );

            expect(result).toContain('**Situation:**');
            expect(result).toContain('**Task:**');
            expect(result).toContain('**Action:**');
            expect(result).toContain('**Result:**');
            expect(starStructureService.applySTARStructure).toHaveBeenCalledWith(
                content,
                experiences,
                undefined
            );
        });

        it('should personalize responses based on user profile', async () => {
            const template = 'I have experience with JavaScript development';
            const context: PersonalizationContext = {
                userProfile: {
                    userId: 'user-123',
                    experience: [
                        {
                            company: 'Startup Inc',
                            role: 'Full Stack Developer',
                            duration: '3 years',
                            achievements: ['Built scalable applications'],
                            technologies: ['JavaScript', 'Node.js', 'React'],
                        },
                    ],
                    skills: [
                        { name: 'JavaScript', level: 'expert', category: 'technical' }
                    ],
                    industries: ['technology'],
                    seniority: 'mid',
                    preferences: {
                        preferredResponseStyle: 'detailed',
                        focusAreas: ['fullstack'],
                        communicationStyle: 'adaptive'
                    }
                },
                jobContext: {
                    title: 'Full Stack Developer',
                    company: 'Example Corp',
                    description: 'Full stack development role',
                    requirements: ['JavaScript'],
                    companyValues: ['innovation'],
                    interviewType: 'technical',
                    seniority: 'mid',
                    industry: 'technology'
                },
                questionClassification: {
                    type: 'technical',
                    category: 'experience',
                    difficulty: 'mid',
                    requiresSTAR: false,
                    confidence: 0.9,
                    keywords: ['JavaScript']
                },
                conversationHistory: [],
                relevantExperiences: [],
                matchingSkills: []
            };

            const personalizedResponse = 'In my role as Full Stack Developer at Startup Inc, I worked extensively with JavaScript, particularly with Node.js and React...';

            jest.spyOn(personalizationService, 'personalizeResponse').mockResolvedValue(personalizedResponse);

            const result = await responseGenerationService.personalizeResponse(template, context);

            expect(result).toContain('Startup Inc');
            expect(result).toContain('Full Stack Developer');
            expect(personalizationService.personalizeResponse).toHaveBeenCalledWith(template, context);
        });

        it('should validate response length and duration', async () => {
            const longResponse = 'This is a very long response that exceeds the recommended speaking time...'.repeat(50);
            const shortResponse = 'This is a concise response that fits within time limits.';

            const longValidationResult: ResponseValidationResult = {
                isValid: false,
                estimatedDurationSeconds: 120,
                wordCount: 500,
                issues: ['Response is too long'],
                optimizedResponse: 'Optimized shorter response'
            };

            const shortValidationResult: ResponseValidationResult = {
                isValid: true,
                estimatedDurationSeconds: 45,
                wordCount: 100,
                issues: []
            };

            jest.spyOn(validationService, 'validateResponse')
                .mockResolvedValueOnce(longValidationResult)
                .mockResolvedValueOnce(shortValidationResult);

            const longValidation = await responseGenerationService.validateResponse(longResponse);
            const shortValidation = await responseGenerationService.validateResponse(shortResponse);

            expect(longValidation.isValid).toBe(false);
            expect(longValidation.estimatedDurationSeconds).toBeGreaterThan(90);
            expect(shortValidation.isValid).toBe(true);
            expect(shortValidation.estimatedDurationSeconds).toBeLessThan(90);
        });

        it('should handle API failures gracefully', async () => {
            const request: ResponseGenerationRequest = {
                question: 'Tell me about yourself',
                userId: 'user-123',
                context: {
                    userProfile: {
                        userId: 'user-123',
                        experience: [],
                        skills: [],
                        industries: ['technology'],
                        seniority: 'mid',
                        preferences: {
                            preferredResponseStyle: 'concise',
                            focusAreas: [],
                            communicationStyle: 'formal'
                        }
                    },
                    jobContext: {
                        title: 'Developer',
                        company: 'Example Corp',
                        description: 'Development role',
                        requirements: [],
                        companyValues: [],
                        interviewType: 'mixed',
                        seniority: 'mid',
                        industry: 'technology'
                    },
                    questionClassification: {
                        type: 'behavioral',
                        category: 'general',
                        difficulty: 'mid',
                        requiresSTAR: false,
                        confidence: 0.8,
                        keywords: []
                    },
                    conversationHistory: [],
                    relevantExperiences: [],
                    matchingSkills: []
                }
            };

            jest.spyOn(cacheService, 'getCachedResponses').mockResolvedValue(null);
            jest.spyOn(openAIService, 'generateResponses').mockRejectedValue(new Error('API Error'));
            jest.spyOn(personalizationService, 'generateMultipleOptions').mockRejectedValue(new Error('API Error'));

            const result = await responseGenerationService.generateResponses(request);

            expect(result.responses).toHaveLength(1);
            expect(result.responses[0].tags).toContain('fallback');
            expect(result.responses[0].confidence).toBeLessThan(1);
            expect(result.fromCache).toBe(false);
        });
    });

    describe('Response Caching', () => {
        it('should return cached responses when available', async () => {
            const request: ResponseGenerationRequest = {
                question: 'Tell me about yourself',
                userId: 'user-123',
                context: {
                    userProfile: {
                        userId: 'user-123',
                        experience: [],
                        skills: [],
                        industries: ['technology'],
                        seniority: 'mid',
                        preferences: {
                            preferredResponseStyle: 'storytelling',
                            focusAreas: [],
                            communicationStyle: 'casual'
                        }
                    },
                    jobContext: {
                        title: 'Developer',
                        company: 'Example Corp',
                        description: 'Development role',
                        requirements: [],
                        companyValues: [],
                        interviewType: 'mixed',
                        seniority: 'mid',
                        industry: 'technology'
                    },
                    questionClassification: {
                        type: 'behavioral',
                        category: 'general',
                        difficulty: 'mid',
                        requiresSTAR: false,
                        confidence: 0.8,
                        keywords: []
                    },
                    conversationHistory: [],
                    relevantExperiences: [],
                    matchingSkills: []
                }
            };

            const cachedResponses: ResponseOption[] = [
                {
                    id: 'cached',
                    content: 'Cached response content',
                    structure: 'direct',
                    estimatedDuration: 60,
                    confidence: 0.95,
                    tags: ['cached'],
                    tone: 'balanced'
                }
            ];

            jest.spyOn(cacheService, 'getCachedResponses').mockResolvedValue(cachedResponses);

            const result = await responseGenerationService.generateResponses(request);

            expect(result.responses).toEqual(cachedResponses);
            expect(result.fromCache).toBe(true);
            expect(openAIService.generateResponses).not.toHaveBeenCalled();
        });

        it('should provide cache management functionality', async () => {
            const mockStats = {
                totalKeys: 100,
                memoryUsage: '2.5 MB',
                hitRate: 75.5,
                topQuestions: [
                    { question: 'Tell me about yourself', hits: 25 },
                    { question: 'What are your strengths', hits: 18 }
                ]
            };
            jest.spyOn(cacheService, 'getCacheStats').mockResolvedValue(mockStats);
            jest.spyOn(cacheService, 'clearCache').mockResolvedValue(50);

            const stats = await responseGenerationService.getCacheStats();
            const clearedCount = await responseGenerationService.clearCache('pattern*');

            expect(stats).toEqual(mockStats);
            expect(clearedCount).toBe(50);
            expect(cacheService.getCacheStats).toHaveBeenCalled();
            expect(cacheService.clearCache).toHaveBeenCalledWith('pattern*');
        });
    });

    describe('Custom Response Generation', () => {
        it('should generate custom responses for practice feedback', async () => {
            const prompt = 'Provide feedback on this interview response: "I am a good developer"';
            const expectedResponse = 'Your response could be improved by adding specific examples...';

            jest.spyOn(openAIService, 'generateCustomResponse').mockResolvedValue(expectedResponse);

            const result = await responseGenerationService.generateCustomResponse(prompt);

            expect(result).toBe(expectedResponse);
            expect(openAIService.generateCustomResponse).toHaveBeenCalledWith(prompt);
        });

        it('should handle custom response generation errors', async () => {
            const prompt = 'Test prompt';
            jest.spyOn(openAIService, 'generateCustomResponse').mockRejectedValue(new Error('API Error'));

            await expect(responseGenerationService.generateCustomResponse(prompt)).rejects.toThrow('API Error');
        });
    });
});