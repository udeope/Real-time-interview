import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/config/database.config';
import { JwtService } from '@nestjs/jwt';

describe('InterviewSessionController (e2e)', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let jwtService: JwtService;
  let authToken: string;
  let userId: string;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Clean up database
    await databaseService.sessionMetrics.deleteMany();
    await databaseService.interaction.deleteMany();
    await databaseService.interviewSession.deleteMany();
    await databaseService.userProfile.deleteMany();
    await databaseService.user.deleteMany();

    // Create test user
    const testUser = await databaseService.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
      },
    });

    userId = testUser.id;
    authToken = jwtService.sign({ sub: userId, email: testUser.email });
  });

  afterAll(async () => {
    // Clean up
    await databaseService.sessionMetrics.deleteMany();
    await databaseService.interaction.deleteMany();
    await databaseService.interviewSession.deleteMany();
    await databaseService.userProfile.deleteMany();
    await databaseService.user.deleteMany();

    await databaseService.$disconnect();
    await app.close();
  });

  describe('/interview-sessions (POST)', () => {
    it('should create a new interview session', () => {
      const createSessionDto = {
        jobContext: {
          title: 'Software Engineer',
          company: 'Tech Corp',
          description: 'Full-stack development role',
          requirements: ['JavaScript', 'React', 'Node.js'],
          interviewType: 'technical',
          seniority: 'mid',
        },
        settings: {
          transcriptionEnabled: true,
          responseGeneration: true,
          confidenceThreshold: 0.8,
        },
      };

      return request(app.getHttpServer())
        .post('/interview-sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createSessionDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.userId).toBe(userId);
          expect(res.body.status).toBe('active');
          expect(res.body.jobContext.title).toBe('Software Engineer');
          sessionId = res.body.id;
        });
    });

    it('should reject creation without authentication', () => {
      return request(app.getHttpServer())
        .post('/interview-sessions')
        .send({})
        .expect(401);
    });
  });

  describe('/interview-sessions (GET)', () => {
    it('should return user sessions', () => {
      return request(app.getHttpServer())
        .get('/interview-sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0].userId).toBe(userId);
        });
    });

    it('should return active sessions only', () => {
      return request(app.getHttpServer())
        .get('/interview-sessions/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((session: any) => {
            expect(session.status).toBe('active');
          });
        });
    });
  });

  describe('/interview-sessions/:id (GET)', () => {
    it('should return specific session', () => {
      return request(app.getHttpServer())
        .get(`/interview-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(sessionId);
          expect(res.body.userId).toBe(userId);
        });
    });

    it('should return session with details', () => {
      return request(app.getHttpServer())
        .get(`/interview-sessions/${sessionId}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(sessionId);
          expect(res.body).toHaveProperty('interactions');
          expect(res.body).toHaveProperty('metrics');
          expect(Array.isArray(res.body.interactions)).toBe(true);
          expect(Array.isArray(res.body.metrics)).toBe(true);
        });
    });

    it('should return 404 for non-existent session', () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      return request(app.getHttpServer())
        .get(`/interview-sessions/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/interview-sessions/:id (PUT)', () => {
    it('should update session status', () => {
      return request(app.getHttpServer())
        .put(`/interview-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'paused' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('paused');
        });
    });

    it('should pause session', () => {
      return request(app.getHttpServer())
        .put(`/interview-sessions/${sessionId}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('paused');
        });
    });

    it('should start session', () => {
      return request(app.getHttpServer())
        .put(`/interview-sessions/${sessionId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('active');
        });
    });

    it('should complete session', () => {
      return request(app.getHttpServer())
        .put(`/interview-sessions/${sessionId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('completed');
          expect(res.body.endedAt).toBeDefined();
        });
    });
  });

  describe('/interview-sessions/interactions (POST)', () => {
    let interactionId: string;

    beforeAll(async () => {
      // Create a new active session for interaction tests
      const newSession = await databaseService.interviewSession.create({
        data: {
          userId,
          status: 'active',
        },
      });
      sessionId = newSession.id;
    });

    it('should create interaction', () => {
      const createInteractionDto = {
        sessionId,
        question: 'Tell me about yourself',
        questionClassification: {
          type: 'behavioral',
          category: 'introduction',
          difficulty: 'junior',
          requiresSTAR: false,
        },
      };

      return request(app.getHttpServer())
        .post('/interview-sessions/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createInteractionDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.sessionId).toBe(sessionId);
          expect(res.body.question).toBe('Tell me about yourself');
          interactionId = res.body.id;
        });
    });

    it('should get session interactions', () => {
      return request(app.getHttpServer())
        .get(`/interview-sessions/${sessionId}/interactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0].sessionId).toBe(sessionId);
        });
    });

    it('should update interaction', () => {
      return request(app.getHttpServer())
        .put(`/interview-sessions/interactions/${interactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          selectedResponse: 'I am a passionate software developer...',
          userFeedback: 4,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.selectedResponse).toBe('I am a passionate software developer...');
          expect(res.body.userFeedback).toBe(4);
        });
    });
  });

  describe('/interview-sessions/metrics (POST)', () => {
    it('should record session metrics', () => {
      const createMetricsDto = {
        sessionId,
        transcriptionLatencyMs: 1200,
        responseGenerationMs: 800,
        totalLatencyMs: 2000,
        transcriptionAccuracy: 0.96,
        userSatisfaction: 5,
      };

      return request(app.getHttpServer())
        .post('/interview-sessions/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createMetricsDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.sessionId).toBe(sessionId);
          expect(res.body.transcriptionLatencyMs).toBe(1200);
          expect(res.body.transcriptionAccuracy).toBe(0.96);
        });
    });

    it('should get session metrics', () => {
      return request(app.getHttpServer())
        .get(`/interview-sessions/${sessionId}/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0].sessionId).toBe(sessionId);
        });
    });
  });

  describe('/interview-sessions/analytics (GET)', () => {
    it('should return user analytics', () => {
      return request(app.getHttpServer())
        .get('/interview-sessions/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalSessions');
          expect(res.body).toHaveProperty('averageSessionDuration');
          expect(res.body).toHaveProperty('averageLatency');
          expect(res.body).toHaveProperty('averageAccuracy');
          expect(res.body).toHaveProperty('averageSatisfaction');
          expect(res.body).toHaveProperty('mostCommonQuestionTypes');
          expect(res.body).toHaveProperty('performanceTrends');
          expect(Array.isArray(res.body.mostCommonQuestionTypes)).toBe(true);
          expect(Array.isArray(res.body.performanceTrends)).toBe(true);
        });
    });
  });

  describe('Authorization', () => {
    let otherUserId: string;
    let otherUserToken: string;

    beforeAll(async () => {
      // Create another user
      const otherUser = await databaseService.user.create({
        data: {
          email: 'other@example.com',
          name: 'Other User',
          password: 'hashedpassword',
        },
      });

      otherUserId = otherUser.id;
      otherUserToken = jwtService.sign({ sub: otherUserId, email: otherUser.email });
    });

    it('should not allow access to other user sessions', () => {
      return request(app.getHttpServer())
        .get(`/interview-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should not allow updating other user sessions', () => {
      return request(app.getHttpServer())
        .put(`/interview-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ status: 'paused' })
        .expect(403);
    });
  });
});