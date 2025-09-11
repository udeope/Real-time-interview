import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('Interview Scenarios E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = new PrismaClient();
    jwtService = app.get<JwtService>(JwtService);

    // Create test user and get auth token
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'pro',
      },
    });

    testUserId = testUser.id;
    authToken = jwtService.sign({ sub: testUserId, email: testUser.email });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.sessionMetrics.deleteMany();
    await prisma.interaction.deleteMany();
    await prisma.interviewSession.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  describe('Complete Interview Flow', () => {
    it('should handle a complete technical interview scenario', async () => {
      // 1. Create user profile
      const profileResponse = await request(app.getHttpServer())
        .post('/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          experience: [
            {
              company: 'Tech Corp',
              role: 'Senior Developer',
              duration: '3 years',
              achievements: ['Led team of 5', 'Reduced API latency by 40%'],
              technologies: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
            },
          ],
          skills: [
            { name: 'JavaScript', level: 'expert' },
            { name: 'React', level: 'advanced' },
            { name: 'Node.js', level: 'advanced' },
          ],
          industries: ['technology', 'fintech'],
          seniority: 'senior',
        })
        .expect(201);

      expect(profileResponse.body.id).toBeDefined();

      // 2. Create interview session
      const sessionResponse = await request(app.getHttpServer())
        .post('/interview-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobContext: {
            title: 'Senior Full Stack Developer',
            company: 'Innovation Inc',
            description: 'Looking for experienced developer with React and Node.js',
            requirements: ['5+ years experience', 'React', 'Node.js', 'PostgreSQL'],
            companyValues: ['Innovation', 'Collaboration', 'Excellence'],
            interviewType: 'technical',
            seniority: 'senior',
          },
          settings: {
            transcriptionProvider: 'google',
            responseStyle: 'professional',
            maxResponseLength: 90,
          },
        })
        .expect(201);

      const sessionId = sessionResponse.body.id;
      expect(sessionId).toBeDefined();

      // 3. Simulate technical questions and responses
      const technicalQuestions = [
        {
          question: 'Can you explain how React hooks work and give an example?',
          expectedType: 'technical',
          expectedResponseKeywords: ['hooks', 'useState', 'useEffect', 'functional components'],
        },
        {
          question: 'How would you optimize a slow database query?',
          expectedType: 'technical',
          expectedResponseKeywords: ['indexing', 'query optimization', 'performance'],
        },
        {
          question: 'Describe your experience with microservices architecture',
          expectedType: 'technical',
          expectedResponseKeywords: ['microservices', 'API', 'scalability'],
        },
      ];

      for (const testQuestion of technicalQuestions) {
        // Simulate transcription
        const transcriptionResponse = await request(app.getHttpServer())
          .post(`/transcription/process`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId,
            audioData: 'mock-audio-data',
            text: testQuestion.question,
          })
          .expect(201);

        expect(transcriptionResponse.body.text).toBe(testQuestion.question);
        expect(transcriptionResponse.body.confidence).toBeGreaterThan(0.9);

        // Get context analysis
        const contextResponse = await request(app.getHttpServer())
          .post('/context-analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId,
            question: testQuestion.question,
          })
          .expect(201);

        expect(contextResponse.body.questionType).toBe(testQuestion.expectedType);

        // Generate responses
        const responseResponse = await request(app.getHttpServer())
          .post('/response-generation/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId,
            question: testQuestion.question,
            context: contextResponse.body,
          })
          .expect(201);

        expect(responseResponse.body.responses).toHaveLength.greaterThan(0);
        
        const response = responseResponse.body.responses[0];
        expect(response.content).toBeDefined();
        expect(response.estimatedDuration).toBeLessThan(90);
        
        // Check if response contains expected keywords
        const responseText = response.content.toLowerCase();
        const hasExpectedKeywords = testQuestion.expectedResponseKeywords.some(keyword =>
          responseText.includes(keyword.toLowerCase())
        );
        expect(hasExpectedKeywords).toBe(true);

        // Record interaction
        await request(app.getHttpServer())
          .post('/interview-session/interaction')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId,
            question: testQuestion.question,
            questionType: contextResponse.body.questionType,
            responses: responseResponse.body.responses,
            selectedResponse: response.content,
            userFeedback: 5,
          })
          .expect(201);
      }

      // 4. Complete session and get metrics
      const completionResponse = await request(app.getHttpServer())
        .patch(`/interview-session/${sessionId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(completionResponse.body.status).toBe('completed');
      expect(completionResponse.body.metrics).toBeDefined();
      expect(completionResponse.body.metrics.totalQuestions).toBe(3);
      expect(completionResponse.body.metrics.averageResponseTime).toBeLessThan(2000);
    });

    it('should handle a behavioral interview scenario with STAR responses', async () => {
      // Create session for behavioral interview
      const sessionResponse = await request(app.getHttpServer())
        .post('/interview-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobContext: {
            title: 'Team Lead',
            company: 'Leadership Corp',
            interviewType: 'behavioral',
            seniority: 'senior',
          },
        })
        .expect(201);

      const sessionId = sessionResponse.body.id;

      const behavioralQuestions = [
        {
          question: 'Tell me about a time when you had to deal with a difficult team member',
          expectedSTAR: true,
        },
        {
          question: 'Describe a situation where you had to meet a tight deadline',
          expectedSTAR: true,
        },
        {
          question: 'Give me an example of when you had to learn a new technology quickly',
          expectedSTAR: true,
        },
      ];

      for (const testQuestion of behavioralQuestions) {
        // Process question
        const contextResponse = await request(app.getHttpServer())
          .post('/context-analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId,
            question: testQuestion.question,
          })
          .expect(201);

        expect(contextResponse.body.questionType).toBe('behavioral');
        expect(contextResponse.body.requiresSTAR).toBe(true);

        // Generate STAR-structured response
        const responseResponse = await request(app.getHttpServer())
          .post('/response-generation/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId,
            question: testQuestion.question,
            context: contextResponse.body,
          })
          .expect(201);

        const starResponse = responseResponse.body.responses.find(r => r.structure === 'STAR');
        expect(starResponse).toBeDefined();
        expect(starResponse.content).toContain('situation');
        expect(starResponse.content).toContain('task');
        expect(starResponse.content).toContain('action');
        expect(starResponse.content).toContain('result');
      }
    });

    it('should handle mixed interview with different question types', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/interview-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobContext: {
            title: 'Senior Software Engineer',
            company: 'Mixed Corp',
            interviewType: 'mixed',
            seniority: 'senior',
          },
        })
        .expect(201);

      const sessionId = sessionResponse.body.id;

      const mixedQuestions = [
        { question: 'Tell me about yourself', expectedType: 'general' },
        { question: 'What is your experience with React?', expectedType: 'technical' },
        { question: 'Describe a challenging project you worked on', expectedType: 'behavioral' },
        { question: 'How would you handle a disagreement with a colleague?', expectedType: 'situational' },
        { question: 'Why do you want to work for our company?', expectedType: 'cultural' },
      ];

      const questionTypes = [];

      for (const testQuestion of mixedQuestions) {
        const contextResponse = await request(app.getHttpServer())
          .post('/context-analysis/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId,
            question: testQuestion.question,
          })
          .expect(201);

        questionTypes.push(contextResponse.body.questionType);

        const responseResponse = await request(app.getHttpServer())
          .post('/response-generation/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId,
            question: testQuestion.question,
            context: contextResponse.body,
          })
          .expect(201);

        expect(responseResponse.body.responses).toHaveLength.greaterThan(0);
      }

      // Verify we got different question types
      const uniqueTypes = [...new Set(questionTypes)];
      expect(uniqueTypes.length).toBeGreaterThan(2);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle transcription failures gracefully', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/interview-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobContext: { title: 'Test Position' },
        })
        .expect(201);

      // Simulate transcription failure
      const transcriptionResponse = await request(app.getHttpServer())
        .post('/transcription/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionResponse.body.id,
          audioData: 'corrupted-audio-data',
        })
        .expect(400);

      expect(transcriptionResponse.body.error).toBeDefined();
      expect(transcriptionResponse.body.fallbackOptions).toBeDefined();
    });

    it('should handle response generation failures', async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/interview-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobContext: { title: 'Test Position' },
        })
        .expect(201);

      // Try to generate response with invalid context
      const responseResponse = await request(app.getHttpServer())
        .post('/response-generation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionResponse.body.id,
          question: '', // Empty question
          context: null,
        })
        .expect(400);

      expect(responseResponse.body.error).toBeDefined();
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle concurrent interview sessions', async () => {
      const concurrentSessions = 5;
      const sessionPromises = [];

      for (let i = 0; i < concurrentSessions; i++) {
        const promise = request(app.getHttpServer())
          .post('/interview-session')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            jobContext: {
              title: `Concurrent Position ${i}`,
              company: 'Concurrent Corp',
            },
          });
        sessionPromises.push(promise);
      }

      const sessions = await Promise.all(sessionPromises);
      
      sessions.forEach(session => {
        expect(session.status).toBe(201);
        expect(session.body.id).toBeDefined();
      });

      // Process questions concurrently
      const questionPromises = sessions.map(session =>
        request(app.getHttpServer())
          .post('/response-generation/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId: session.body.id,
            question: 'Tell me about your experience',
            context: { questionType: 'general' },
          })
      );

      const responses = await Promise.all(questionPromises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.responses).toBeDefined();
      });
    });
  });
});