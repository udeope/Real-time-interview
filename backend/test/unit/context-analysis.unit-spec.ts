import { Test, TestingModule } from '@nestjs/testing';
import { ContextAnalysisService } from '../../src/modules/context-analysis/context-analysis.service';
import { QuestionClassificationService } from '../../src/modules/context-analysis/services/question-classification.service';
import { UserProfileAnalysisService } from '../../src/modules/context-analysis/services/user-profile-analysis.service';
import { JobDescriptionParsingService } from '../../src/modules/context-analysis/services/job-description-parsing.service';
import { ConversationHistoryService } from '../../src/modules/context-analysis/services/conversation-history.service';
import { ContextDataAggregationService } from '../../src/modules/context-analysis/services/context-data-aggregation.service';

describe('Context Analysis Unit Tests', () => {
    let contextAnalysisService: ContextAnalysisService;
    let questionClassificationService: QuestionClassificationService;
    let userProfileService: UserProfileAnalysisService;
    let jobParsingService: JobDescriptionParsingService;
    let conversationHistoryService: ConversationHistoryService;
    let contextAggregationService: ContextDataAggregationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContextAnalysisService,
                {
                    provide: QuestionClassificationService,
                    useValue: {
                        classifyQuestion: jest.fn(),
                        getQuestionType: jest.fn(),
                    },
                },
                {
                    provide: UserProfileAnalysisService,
                    useValue: {
                        analyzeUserProfile: jest.fn(),
                        extractSkillsFromExperience: jest.fn(),
                    },
                },
                {
                    provide: JobDescriptionParsingService,
                    useValue: {
                        extractJobContext: jest.fn(),
                        matchRequirements: jest.fn(),
                    },
                },
                {
                    provide: ConversationHistoryService,
                    useValue: {
                        updateConversationHistory: jest.fn(),
                        getConversationHistory: jest.fn(),
                        getConversationStats: jest.fn(),
                        getConversationContext: jest.fn(),
                        findSimilarQuestions: jest.fn(),
                        getRecentQuestionTypes: jest.fn(),
                    },
                },
                {
                    provide: ContextDataAggregationService,
                    useValue: {
                        getRelevantContext: jest.fn(),
                        analyzeQuestionContext: jest.fn(),
                    },
                },
            ],
        }).compile();

        contextAnalysisService = module.get<ContextAnalysisService>(ContextAnalysisService);
        questionClassificationService = module.get<QuestionClassificationService>(QuestionClassificationService);
        userProfileService = module.get<UserProfileAnalysisService>(UserProfileAnalysisService);
        jobParsingService = module.get<JobDescriptionParsingService>(JobDescriptionParsingService);
        conversationHistoryService = module.get<ConversationHistoryService>(ConversationHistoryService);
        contextAggregationService = module.get<ContextDataAggregationService>(ContextDataAggregationService);
    });

    describe('Question Classification', () => {
        it('should classify technical questions correctly', async () => {
            const technicalQuestion = 'Can you explain how you would implement a REST API?';
            const expectedClassification = {
                type: 'technical' as const,
                category: 'backend-development',
                difficulty: 'mid' as const,
                requiresSTAR: false,
                confidence: 0.95,
                keywords: ['REST', 'API', 'implement', 'backend']
            };

            jest.spyOn(questionClassificationService, 'classifyQuestion').mockResolvedValue(expectedClassification);

            const result = await contextAnalysisService.classifyQuestion(technicalQuestion);

            expect(result.type).toBe('technical');
            expect(result.requiresSTAR).toBe(false);
            expect(result.confidence).toBe(0.95);
            expect(questionClassificationService.classifyQuestion).toHaveBeenCalledWith(technicalQuestion);
        });

        it('should classify behavioral questions correctly', async () => {
            const behavioralQuestion = 'Tell me about a time when you had to work with a difficult team member';
            const expectedClassification = {
                type: 'behavioral' as const,
                category: 'teamwork',
                difficulty: 'mid' as const,
                requiresSTAR: true,
                confidence: 0.92,
                keywords: ['time', 'difficult', 'team member', 'work']
            };

            jest.spyOn(questionClassificationService, 'classifyQuestion').mockResolvedValue(expectedClassification);

            const result = await contextAnalysisService.classifyQuestion(behavioralQuestion);

            expect(result.type).toBe('behavioral');
            expect(result.requiresSTAR).toBe(true);
            expect(result.confidence).toBe(0.92);
            expect(questionClassificationService.classifyQuestion).toHaveBeenCalledWith(behavioralQuestion);
        });

        it('should classify situational questions correctly', async () => {
            const situationalQuestion = 'How would you handle a situation where you disagree with your manager?';
            const expectedClassification = {
                type: 'situational' as const,
                category: 'conflict-resolution',
                difficulty: 'senior' as const,
                requiresSTAR: false,
                confidence: 0.88,
                keywords: ['handle', 'situation', 'disagree', 'manager']
            };

            jest.spyOn(questionClassificationService, 'classifyQuestion').mockResolvedValue(expectedClassification);

            const result = await contextAnalysisService.classifyQuestion(situationalQuestion);

            expect(result.type).toBe('situational');
            expect(result.difficulty).toBe('senior');
            expect(result.confidence).toBe(0.88);
        });
    });

    describe('User Profile Analysis', () => {
        it('should analyze user profile', async () => {
            const userId = 'user-123';
            const expectedProfile = {
                userId: 'user-123',
                experience: [
                    {
                        company: 'Tech Corp',
                        role: 'Senior Developer',
                        duration: '3 years',
                        achievements: ['Led team of 5 developers', 'Implemented microservices architecture'],
                        technologies: ['Node.js', 'React', 'PostgreSQL'],
                        description: 'Senior developer role'
                    },
                ],
                skills: [
                    { name: 'JavaScript', level: 'expert' as const, category: 'technical' as const },
                    { name: 'TypeScript', level: 'advanced' as const, category: 'technical' as const },
                ],
                industries: ['technology', 'fintech'],
                seniority: 'senior' as const,
                preferences: {
                    preferredResponseStyle: 'detailed' as const,
                    focusAreas: ['backend development', 'system design'],
                    avoidTopics: ['salary negotiation'],
                    communicationStyle: 'formal' as const
                }
            };

            jest.spyOn(userProfileService, 'analyzeUserProfile').mockResolvedValue(expectedProfile);

            const profile = await contextAnalysisService.analyzeUserProfile(userId);

            expect(profile.userId).toBe('user-123');
            expect(profile.skills).toHaveLength(2);
            expect(profile.seniority).toBe('senior');
            expect(profile.preferences.preferredResponseStyle).toBe('detailed');
            expect(profile.preferences.communicationStyle).toBe('formal');
        });

        it('should extract skills from experience data', async () => {
            const experiences = [
                {
                    company: 'Tech Corp',
                    role: 'Senior Developer',
                    duration: '3 years',
                    achievements: ['Led team of 5 developers', 'Implemented microservices architecture'],
                    technologies: ['Node.js', 'React', 'PostgreSQL'],
                },
            ];

            const expectedSkills = {
                extractedSkills: [
                    { name: 'Node.js', level: 'advanced' as const, category: 'technical' as const },
                    { name: 'React', level: 'advanced' as const, category: 'technical' as const },
                    { name: 'PostgreSQL', level: 'intermediate' as const, category: 'technical' as const },
                    { name: 'Leadership', level: 'advanced' as const, category: 'soft' as const },
                    { name: 'Microservices', level: 'intermediate' as const, category: 'technical' as const }
                ],
                confidence: 0.85,
                source: 'experience' as const
            };

            jest.spyOn(userProfileService, 'extractSkillsFromExperience').mockResolvedValue(expectedSkills);

            const skills = await contextAnalysisService.extractSkillsFromExperience(experiences);

            expect(skills.extractedSkills).toHaveLength(5);
            expect(skills.extractedSkills[0].name).toBe('Node.js');
            expect(skills.extractedSkills[0].level).toBe('advanced');
            expect(skills.confidence).toBe(0.85);
            expect(skills.source).toBe('experience');
        });
    });

    describe('Job Description Parsing', () => {
        it('should extract job context from job description', async () => {
            const jobDescription = `
        We are looking for a Senior Full Stack Developer with 5+ years of experience.
        Required skills: JavaScript, TypeScript, React, Node.js, PostgreSQL.
        Experience with microservices and cloud platforms preferred.
      `;

            const expectedJobContext = {
                title: 'Senior Full Stack Developer',
                company: 'Company',
                description: jobDescription,
                requirements: [
                    '5+ years of experience',
                    'JavaScript',
                    'TypeScript',
                    'React',
                    'Node.js',
                    'PostgreSQL',
                    'microservices',
                    'cloud platforms',
                ],
                seniority: 'Senior',
                industry: 'Technology',
                interviewType: 'mixed' as const,
                companyValues: [],
                location: undefined,
                salary: undefined,
                benefits: []
            };

            jest.spyOn(jobParsingService, 'extractJobContext').mockResolvedValue(expectedJobContext);

            const jobContext = await contextAnalysisService.extractJobContext(jobDescription);

            expect(jobContext.title).toBe('Senior Full Stack Developer');
            expect(jobContext.requirements).toContain('JavaScript');
            expect(jobContext.seniority).toBe('Senior');
        });

        it('should match job requirements with user profile', async () => {
            const jobContext = {
                title: 'Senior Full Stack Developer',
                company: 'Company',
                description: 'Job description',
                requirements: ['JavaScript', 'React', 'Node.js'],
                seniority: 'Senior',
                industry: 'Technology',
                interviewType: 'mixed' as const,
                companyValues: [],
                location: undefined,
                salary: undefined,
                benefits: []
            };

            const userId = 'user-123';
            const expectedMatches = [
                {
                    requirement: 'JavaScript',
                    matchingSkills: [{
                        name: 'JavaScript',
                        level: 'expert' as const,
                        category: 'technical' as const
                    }],
                    matchingExperiences: [],
                    matchScore: 1.0,
                    gaps: []
                }
            ];

            jest.spyOn(jobParsingService, 'matchRequirements').mockResolvedValue(expectedMatches);

            const matches = await contextAnalysisService.matchRequirements(jobContext, userId);

            expect(matches).toHaveLength(1);
            expect(matches[0].requirement).toBe('JavaScript');
            expect(matches[0].matchScore).toBe(1.0);
        });
    });
});