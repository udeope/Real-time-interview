import { Test, TestingModule } from '@nestjs/testing';
import { ContextAnalysisService } from '../../src/modules/context-analysis/context-analysis.service';
import { QuestionClassificationService } from '../../src/modules/context-analysis/services/question-classification.service';
import { UserProfileAnalysisService } from '../../src/modules/context-analysis/services/user-profile-analysis.service';
import { JobDescriptionParsingService } from '../../src/modules/context-analysis/services/job-description-parsing.service';

describe('Context Analysis Unit Tests', () => {
  let contextAnalysisService: ContextAnalysisService;
  let questionClassificationService: QuestionClassificationService;
  let userProfileService: UserProfileAnalysisService;
  let jobParsingService: JobDescriptionParsingService;

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
            analyzeProfile: jest.fn(),
            extractSkills: jest.fn(),
          },
        },
        {
          provide: JobDescriptionParsingService,
          useValue: {
            parseJobDescription: jest.fn(),
            extractRequirements: jest.fn(),
          },
        },
      ],
    }).compile();

    contextAnalysisService = module.get<ContextAnalysisService>(ContextAnalysisService);
    questionClassificationService = module.get<QuestionClassificationService>(QuestionClassificationService);
    userProfileService = module.get<UserProfileAnalysisService>(UserProfileAnalysisService);
    jobParsingService = module.get<JobDescriptionParsingService>(JobDescriptionParsingService);
  });

  describe('Question Classification', () => {
    it('should classify technical questions correctly', async () => {
      const technicalQuestion = 'Can you explain how you would implement a REST API?';
      const expectedClassification = {
        type: 'technical',
        category: 'backend-development',
        difficulty: 'mid',
        requiresSTAR: false,
      };

      jest.spyOn(questionClassificationService, 'classifyQuestion').mockResolvedValue(expectedClassification);

      const result = await contextAnalysisService.classifyQuestion(technicalQuestion);

      expect(result.type).toBe('technical');
      expect(result.requiresSTAR).toBe(false);
      expect(questionClassificationService.classifyQuestion).toHaveBeenCalledWith(technicalQuestion);
    });

    it('should classify behavioral questions correctly', async () => {
      const behavioralQuestion = 'Tell me about a time when you had to work with a difficult team member';
      const expectedClassification = {
        type: 'behavioral',
        category: 'teamwork',
        difficulty: 'mid',
        requiresSTAR: true,
      };

      jest.spyOn(questionClassificationService, 'classifyQuestion').mockResolvedValue(expectedClassification);

      const result = await contextAnalysisService.classifyQuestion(behavioralQuestion);

      expect(result.type).toBe('behavioral');
      expect(result.requiresSTAR).toBe(true);
      expect(questionClassificationService.classifyQuestion).toHaveBeenCalledWith(behavioralQuestion);
    });

    it('should classify situational questions correctly', async () => {
      const situationalQuestion = 'How would you handle a situation where you disagree with your manager?';
      const expectedClassification = {
        type: 'situational',
        category: 'conflict-resolution',
        difficulty: 'senior',
        requiresSTAR: false,
      };

      jest.spyOn(questionClassificationService, 'classifyQuestion').mockResolvedValue(expectedClassification);

      const result = await contextAnalysisService.classifyQuestion(situationalQuestion);

      expect(result.type).toBe('situational');
      expect(result.difficulty).toBe('senior');
    });
  });

  describe('User Profile Analysis', () => {
    it('should extract relevant skills from user profile', async () => {
      const mockProfile = {
        userId: 'user-123',
        experience: [
          {
            company: 'Tech Corp',
            role: 'Senior Developer',
            duration: '3 years',
            achievements: ['Led team of 5 developers', 'Implemented microservices architecture'],
            technologies: ['Node.js', 'React', 'PostgreSQL'],
          },
        ],
        skills: [
          { name: 'JavaScript', level: 'expert' },
          { name: 'TypeScript', level: 'advanced' },
        ],
        industries: ['technology', 'fintech'],
        seniority: 'senior',
      };

      const expectedSkills = ['Node.js', 'React', 'PostgreSQL', 'JavaScript', 'TypeScript'];

      jest.spyOn(userProfileService, 'extractSkills').mockResolvedValue(expectedSkills);

      const skills = await contextAnalysisService.extractUserSkills(mockProfile);

      expect(skills).toContain('Node.js');
      expect(skills).toContain('JavaScript');
      expect(skills).toHaveLength(5);
    });

    it('should analyze user seniority level', async () => {
      const mockProfile = {
        userId: 'user-123',
        experience: [
          { duration: '5 years', role: 'Senior Developer' },
          { duration: '2 years', role: 'Lead Developer' },
        ],
        seniority: 'senior',
      };

      jest.spyOn(userProfileService, 'analyzeProfile').mockResolvedValue({
        seniorityLevel: 'senior',
        totalExperience: 7,
        leadershipExperience: true,
      });

      const analysis = await contextAnalysisService.analyzeUserProfile(mockProfile);

      expect(analysis.seniorityLevel).toBe('senior');
      expect(analysis.totalExperience).toBe(7);
      expect(analysis.leadershipExperience).toBe(true);
    });
  });

  describe('Job Description Parsing', () => {
    it('should extract requirements from job description', async () => {
      const jobDescription = `
        We are looking for a Senior Full Stack Developer with 5+ years of experience.
        Required skills: JavaScript, TypeScript, React, Node.js, PostgreSQL.
        Experience with microservices and cloud platforms preferred.
      `;

      const expectedRequirements = [
        '5+ years of experience',
        'JavaScript',
        'TypeScript',
        'React',
        'Node.js',
        'PostgreSQL',
        'microservices',
        'cloud platforms',
      ];

      jest.spyOn(jobParsingService, 'extractRequirements').mockResolvedValue(expectedRequirements);

      const requirements = await contextAnalysisService.parseJobRequirements(jobDescription);

      expect(requirements).toContain('JavaScript');
      expect(requirements).toContain('5+ years of experience');
      expect(requirements).toHaveLength(8);
    });

    it('should identify job seniority level', async () => {
      const seniorJobDescription = 'Senior Full Stack Developer position requiring 5+ years experience';
      const juniorJobDescription = 'Junior Developer position, entry level';

      jest.spyOn(jobParsingService, 'parseJobDescription')
        .mockResolvedValueOnce({ seniority: 'senior', title: 'Senior Full Stack Developer' })
        .mockResolvedValueOnce({ seniority: 'junior', title: 'Junior Developer' });

      const seniorJob = await contextAnalysisService.parseJobDescription(seniorJobDescription);
      const juniorJob = await contextAnalysisService.parseJobDescription(juniorJobDescription);

      expect(seniorJob.seniority).toBe('senior');
      expect(juniorJob.seniority).toBe('junior');
    });
  });
});