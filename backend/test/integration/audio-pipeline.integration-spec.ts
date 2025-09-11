import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { TranscriptionService } from '../../src/modules/transcription/transcription.service';
import { ContextAnalysisService } from '../../src/modules/context-analysis/context-analysis.service';
import { ResponseGenerationService } from '../../src/modules/response-generation/response-generation.service';
import { PerformanceMetrics } from '../setup-performance';
import * as fs from 'fs';
import * as path from 'path';

describe('Audio-to-Response Pipeline Integration Tests', () => {
  let app: INestApplication;
  let transcriptionService: TranscriptionService;
  let contextAnalysisService: ContextAnalysisService;
  let responseGenerationService: ResponseGenerationService;
  let performanceMetrics: PerformanceMetrics;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    transcriptionService = app.get<TranscriptionService>(TranscriptionService);
    contextAnalysisService = app.get<ContextAnalysisService>(ContextAnalysisService);
    responseGenerationService = app.get<ResponseGenerationService>(ResponseGenerationService);
    performanceMetrics = new PerformanceMetrics();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Pipeline Tests', () => {
    it('should process audio to response within 2 seconds', async () => {
      // Load test audio file
      const testAudioPath = path.join(__dirname, '../fixtures/test-audio.wav');
      const audioBuffer = fs.readFileSync(testAudioPath);

      const mockUserProfile = {
        userId: 'test-user',
        experience: [
          {
            company: 'Tech Corp',
            role: 'Senior Developer',
            technologies: ['JavaScript', 'React', 'Node.js'],
          },
        ],
        skills: [{ name: 'JavaScript', level: 'expert' }],
        seniority: 'senior',
      };

      const mockJobContext = {
        title: 'Senior Frontend Developer',
        company: 'Innovation Inc',
        requirements: ['React', 'JavaScript', 'TypeScript'],
      };

      performanceMetrics.start();

      // Step 1: Transcription
      const transcriptionResult = await transcriptionService.transcribeAudio(audioBuffer);
      expect(transcriptionResult.text).toBeDefined();
      expect(transcriptionResult.confidence).toBeGreaterThan(0.8);

      // Step 2: Context Analysis
      const questionClassification = await contextAnalysisService.classifyQuestion(transcriptionResult.text);
      expect(questionClassification.type).toBeDefined();

      // Step 3: Response Generation
      const responses = await responseGenerationService.generateResponses(
        transcriptionResult.text,
        {
          jobContext: mockJobContext,
          userProfile: mockUserProfile,
          questionType: questionClassification.type,
        },
        mockUserProfile,
      );

      const totalLatency = performanceMetrics.end();

      expect(responses).toHaveLength.greaterThan(0);
      expect(responses[0].content).toBeDefined();
      expect(totalLatency).toBeLessThan(2000); // Less than 2 seconds
    }, 10000);

    it('should maintain transcription accuracy above 95%', async () => {
      const testCases = [
        {
          audioFile: 'clear-speech.wav',
          expectedText: 'Tell me about your experience with React development',
          expectedAccuracy: 0.98,
        },
        {
          audioFile: 'technical-question.wav',
          expectedText: 'How would you implement a REST API using Node.js',
          expectedAccuracy: 0.96,
        },
        {
          audioFile: 'behavioral-question.wav',
          expectedText: 'Describe a time when you had to work under pressure',
          expectedAccuracy: 0.95,
        },
      ];

      const accuracyResults = [];

      for (const testCase of testCases) {
        const audioPath = path.join(__dirname, '../fixtures', testCase.audioFile);
        
        // Skip if test file doesn't exist (would be provided in real implementation)
        if (!fs.existsSync(audioPath)) {
          console.warn(`Test audio file ${testCase.audioFile} not found, skipping`);
          continue;
        }

        const audioBuffer = fs.readFileSync(audioPath);
        const result = await transcriptionService.transcribeAudio(audioBuffer);

        const accuracy = calculateWordErrorRate(testCase.expectedText, result.text);
        accuracyResults.push(accuracy);

        expect(accuracy).toBeGreaterThan(0.95);
      }

      if (accuracyResults.length > 0) {
        const averageAccuracy = accuracyResults.reduce((sum, acc) => sum + acc, 0) / accuracyResults.length;
        expect(averageAccuracy).toBeGreaterThan(0.95);
      }
    });

    it('should handle different question types appropriately', async () => {
      const questionTypes = [
        {
          question: 'Can you explain how closures work in JavaScript?',
          expectedType: 'technical',
          expectedSTAR: false,
        },
        {
          question: 'Tell me about a time you disagreed with your manager',
          expectedType: 'behavioral',
          expectedSTAR: true,
        },
        {
          question: 'How would you handle a tight deadline?',
          expectedType: 'situational',
          expectedSTAR: false,
        },
      ];

      for (const testCase of questionTypes) {
        const classification = await contextAnalysisService.classifyQuestion(testCase.question);
        
        expect(classification.type).toBe(testCase.expectedType);
        expect(classification.requiresSTAR).toBe(testCase.expectedSTAR);

        const responses = await responseGenerationService.generateResponses(
          testCase.question,
          { questionType: classification.type },
          {},
        );

        expect(responses).toHaveLength.greaterThan(0);
        
        if (testCase.expectedSTAR) {
          expect(responses.some(r => r.structure === 'STAR')).toBe(true);
        }
      }
    });

    it('should generate contextually appropriate responses', async () => {
      const question = 'What is your experience with React?';
      
      const frontendProfile = {
        experience: [{ technologies: ['React', 'JavaScript', 'CSS'] }],
        seniority: 'mid',
      };

      const backendProfile = {
        experience: [{ technologies: ['Node.js', 'Python', 'PostgreSQL'] }],
        seniority: 'senior',
      };

      const frontendResponses = await responseGenerationService.generateResponses(
        question,
        { questionType: 'technical' },
        frontendProfile,
      );

      const backendResponses = await responseGenerationService.generateResponses(
        question,
        { questionType: 'technical' },
        backendProfile,
      );

      // Frontend profile should generate more detailed React responses
      expect(frontendResponses[0].content.toLowerCase()).toContain('react');
      expect(frontendResponses[0].confidence).toBeGreaterThan(backendResponses[0].confidence);
    });

    it('should handle pipeline failures gracefully', async () => {
      // Test with corrupted audio
      const corruptedAudio = Buffer.from('invalid-audio-data');

      try {
        const result = await transcriptionService.transcribeAudio(corruptedAudio);
        
        // Should either succeed with low confidence or fail gracefully
        if (result) {
          expect(result.confidence).toBeLessThan(0.8);
        }
      } catch (error) {
        expect(error).toBeDefined();
        // Should have fallback mechanism
      }

      // Test with empty question
      const emptyQuestion = '';
      const responses = await responseGenerationService.generateResponses(
        emptyQuestion,
        { questionType: 'unknown' },
        {},
      );

      expect(responses).toHaveLength.greaterThan(0);
      expect(responses[0].content).toContain('clarification');
    });
  });

  describe('Real-time Streaming Tests', () => {
    it('should handle streaming audio transcription', async () => {
      const audioChunks = [
        Buffer.from('chunk1'),
        Buffer.from('chunk2'),
        Buffer.from('chunk3'),
      ];

      const transcriptionResults = [];

      for (const chunk of audioChunks) {
        const result = await transcriptionService.transcribeStreamChunk(chunk);
        transcriptionResults.push(result);
      }

      expect(transcriptionResults).toHaveLength(3);
      expect(transcriptionResults.some(r => r.isFinal)).toBe(true);
    });

    it('should provide incremental response updates', async () => {
      const partialQuestion = 'Tell me about your';
      const completeQuestion = 'Tell me about your experience with React';

      const partialResponses = await responseGenerationService.generateResponses(
        partialQuestion,
        { questionType: 'partial' },
        {},
      );

      const completeResponses = await responseGenerationService.generateResponses(
        completeQuestion,
        { questionType: 'technical' },
        {},
      );

      expect(partialResponses[0].confidence).toBeLessThan(completeResponses[0].confidence);
      expect(completeResponses[0].content.length).toBeGreaterThan(partialResponses[0].content.length);
    });
  });
});

// Utility function to calculate Word Error Rate
function calculateWordErrorRate(expected: string, actual: string): number {
  const expectedWords = expected.toLowerCase().split(/\s+/);
  const actualWords = actual.toLowerCase().split(/\s+/);
  
  // Simple Levenshtein distance calculation for WER
  const matrix = Array(expectedWords.length + 1).fill(null).map(() => Array(actualWords.length + 1).fill(null));
  
  for (let i = 0; i <= expectedWords.length; i++) {
    matrix[i][0] = i;
  }
  
  for (let j = 0; j <= actualWords.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= expectedWords.length; i++) {
    for (let j = 1; j <= actualWords.length; j++) {
      const cost = expectedWords[i - 1] === actualWords[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const errors = matrix[expectedWords.length][actualWords.length];
  const wer = errors / expectedWords.length;
  return 1 - wer; // Return accuracy (1 - error rate)
}