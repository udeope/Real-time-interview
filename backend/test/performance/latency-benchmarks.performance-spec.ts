import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { TranscriptionService } from '../../src/modules/transcription/transcription.service';
import { ResponseGenerationService } from '../../src/modules/response-generation/response-generation.service';
import { ContextAnalysisService } from '../../src/modules/context-analysis/context-analysis.service';
import { PerformanceMetrics, expectLatencyUnder, expectAccuracyAbove } from '../setup-performance';

describe('Performance Benchmarks', () => {
  let app: INestApplication;
  let transcriptionService: TranscriptionService;
  let responseGenerationService: ResponseGenerationService;
  let contextAnalysisService: ContextAnalysisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    transcriptionService = app.get<TranscriptionService>(TranscriptionService);
    responseGenerationService = app.get<ResponseGenerationService>(ResponseGenerationService);
    contextAnalysisService = app.get<ContextAnalysisService>(ContextAnalysisService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Transcription Performance', () => {
    it('should transcribe audio within 500ms for short clips', async () => {
      const shortAudioBuffer = Buffer.alloc(16000 * 2); // 1 second of 16kHz audio
      const metrics = new PerformanceMetrics();

      metrics.start();
      const result = await transcriptionService.transcribeAudio(shortAudioBuffer);
      const latency = metrics.end();

      expect(result).toBeDefined();
      expectLatencyUnder(latency, 500);
    });

    it('should maintain accuracy above 95% under load', async () => {
      const testAudioBuffer = Buffer.alloc(16000 * 10); // 10 seconds of audio
      const concurrentRequests = 5;
      
      const promises = Array(concurrentRequests).fill(null).map(async () => {
        const metrics = new PerformanceMetrics();
        metrics.start();
        
        const result = await transcriptionService.transcribeAudio(testAudioBuffer);
        const latency = metrics.end();
        
        return { result, latency };
      });

      const results = await Promise.all(promises);

      results.forEach(({ result, latency }) => {
        expect(result).toBeDefined();
        expectAccuracyAbove(result.confidence, 0.95);
        expectLatencyUnder(latency, 2000);
      });
    });

    it('should handle streaming transcription with minimal latency', async () => {
      const audioChunks = Array(10).fill(null).map(() => Buffer.alloc(1600)); // 100ms chunks
      const latencies = [];

      for (const chunk of audioChunks) {
        const metrics = new PerformanceMetrics();
        metrics.start();
        
        const result = await transcriptionService.transcribeStreamChunk(chunk);
        const latency = metrics.end();
        
        latencies.push(latency);
        expect(result).toBeDefined();
      }

      const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      expectLatencyUnder(averageLatency, 200); // Average under 200ms per chunk
    });
  });

  describe('Context Analysis Performance', () => {
    it('should classify questions within 100ms', async () => {
      const testQuestions = [
        'Tell me about your experience with React',
        'Describe a time when you faced a difficult challenge',
        'How would you handle a disagreement with a team member?',
        'What is your understanding of microservices architecture?',
      ];

      for (const question of testQuestions) {
        const metrics = new PerformanceMetrics();
        metrics.start();
        
        const classification = await contextAnalysisService.classifyQuestion(question);
        const latency = metrics.end();
        
        expect(classification.type).toBeDefined();
        expectLatencyUnder(latency, 100);
      }
    });

    it('should analyze user profiles efficiently', async () => {
      const complexProfile = {
        userId: 'test-user',
        experience: Array(10).fill(null).map((_, i) => ({
          company: `Company ${i}`,
          role: `Role ${i}`,
          duration: `${i + 1} years`,
          achievements: Array(5).fill(null).map((_, j) => `Achievement ${j}`),
          technologies: Array(8).fill(null).map((_, k) => `Tech ${k}`),
        })),
        skills: Array(20).fill(null).map((_, i) => ({
          name: `Skill ${i}`,
          level: 'advanced',
        })),
        seniority: 'senior',
      };

      const metrics = new PerformanceMetrics();
      metrics.start();
      
      const analysis = await contextAnalysisService.analyzeUserProfile(complexProfile);
      const latency = metrics.end();
      
      expect(analysis).toBeDefined();
      expectLatencyUnder(latency, 300);
    });
  });

  describe('Response Generation Performance', () => {
    it('should generate responses within 1.5 seconds', async () => {
      const question = 'Tell me about your experience with full-stack development';
      const context = {
        questionType: 'technical',
        jobTitle: 'Full Stack Developer',
        userSkills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
      };
      const userProfile = {
        experience: [
          {
            company: 'Tech Corp',
            role: 'Senior Developer',
            technologies: ['JavaScript', 'React', 'Node.js'],
          },
        ],
        seniority: 'senior',
      };

      const metrics = new PerformanceMetrics();
      metrics.start();
      
      const responses = await responseGenerationService.generateResponses(question, context, userProfile);
      const latency = metrics.end();
      
      expect(responses).toHaveLength.greaterThan(0);
      expect(responses[0].content).toBeDefined();
      expectLatencyUnder(latency, 1500);
    });

    it('should handle concurrent response generation', async () => {
      const questions = [
        'What is your experience with React?',
        'Tell me about a challenging project',
        'How do you handle code reviews?',
        'Describe your testing approach',
      ];

      const concurrentRequests = questions.map(async (question) => {
        const metrics = new PerformanceMetrics();
        metrics.start();
        
        const responses = await responseGenerationService.generateResponses(
          question,
          { questionType: 'technical' },
          {},
        );
        const latency = metrics.end();
        
        return { responses, latency };
      });

      const results = await Promise.all(concurrentRequests);

      results.forEach(({ responses, latency }) => {
        expect(responses).toHaveLength.greaterThan(0);
        expectLatencyUnder(latency, 2000);
      });
    });

    it('should cache frequently requested responses', async () => {
      const commonQuestion = 'Tell me about yourself';
      const context = { questionType: 'general' };

      // First request (should be slower)
      const firstMetrics = new PerformanceMetrics();
      firstMetrics.start();
      const firstResponse = await responseGenerationService.generateResponses(commonQuestion, context, {});
      const firstLatency = firstMetrics.end();

      // Second request (should be faster due to caching)
      const secondMetrics = new PerformanceMetrics();
      secondMetrics.start();
      const secondResponse = await responseGenerationService.generateResponses(commonQuestion, context, {});
      const secondLatency = secondMetrics.end();

      expect(firstResponse).toBeDefined();
      expect(secondResponse).toBeDefined();
      expect(secondLatency).toBeLessThan(firstLatency * 0.5); // At least 50% faster
    });
  });

  describe('End-to-End Performance', () => {
    it('should complete full pipeline within 2 seconds', async () => {
      const mockAudioBuffer = Buffer.alloc(16000 * 5); // 5 seconds of audio
      const userProfile = {
        experience: [{ technologies: ['JavaScript', 'React'] }],
        seniority: 'mid',
      };

      const metrics = new PerformanceMetrics();
      metrics.start();

      // Complete pipeline
      const transcription = await transcriptionService.transcribeAudio(mockAudioBuffer);
      const classification = await contextAnalysisService.classifyQuestion(transcription.text);
      const responses = await responseGenerationService.generateResponses(
        transcription.text,
        { questionType: classification.type },
        userProfile,
      );

      const totalLatency = metrics.end();

      expect(transcription).toBeDefined();
      expect(classification).toBeDefined();
      expect(responses).toHaveLength.greaterThan(0);
      expectLatencyUnder(totalLatency, 2000);
    });

    it('should maintain performance under sustained load', async () => {
      const iterations = 20;
      const latencies = [];

      for (let i = 0; i < iterations; i++) {
        const metrics = new PerformanceMetrics();
        metrics.start();

        const mockAudio = Buffer.alloc(16000 * 3);
        const transcription = await transcriptionService.transcribeAudio(mockAudio);
        const responses = await responseGenerationService.generateResponses(
          transcription.text || 'test question',
          { questionType: 'technical' },
          {},
        );

        const latency = metrics.end();
        latencies.push(latency);

        expect(responses).toBeDefined();
      }

      const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      expectLatencyUnder(averageLatency, 2000);
      expectLatencyUnder(maxLatency, 3000); // No single request should exceed 3s
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during extended operation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 50; i++) {
        const mockAudio = Buffer.alloc(16000 * 2);
        await transcriptionService.transcribeAudio(mockAudio);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle large audio files efficiently', async () => {
      const largeAudioBuffer = Buffer.alloc(16000 * 60); // 1 minute of audio
      
      const metrics = new PerformanceMetrics();
      metrics.start();
      
      const result = await transcriptionService.transcribeAudio(largeAudioBuffer);
      const latency = metrics.end();
      
      expect(result).toBeDefined();
      expectLatencyUnder(latency, 10000); // Should complete within 10 seconds
    });
  });
});