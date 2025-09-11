import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('External Integrations (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Mock authentication - in real tests, you'd authenticate properly
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('LinkedIn Integration', () => {
    it('/integrations/linkedin/auth-url (GET)', () => {
      return request(app.getHttpServer())
        .get('/integrations/linkedin/auth-url')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('authUrl');
          expect(res.body).toHaveProperty('state');
          expect(res.body.authUrl).toContain('linkedin.com');
        });
    });

    it('/integrations/linkedin/callback (POST)', () => {
      return request(app.getHttpServer())
        .post('/integrations/linkedin/callback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'mock-auth-code',
          state: 'mock-state',
        })
        .expect(400); // Expected to fail without proper LinkedIn setup
    });
  });

  describe('Calendar Integration', () => {
    it('/integrations/calendar/google/auth-url (GET)', () => {
      return request(app.getHttpServer())
        .get('/integrations/calendar/google/auth-url')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('authUrl');
          expect(res.body).toHaveProperty('state');
          expect(res.body.authUrl).toContain('accounts.google.com');
        });
    });

    it('/integrations/calendar/outlook/auth-url (GET)', () => {
      return request(app.getHttpServer())
        .get('/integrations/calendar/outlook/auth-url')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('authUrl');
          expect(res.body).toHaveProperty('state');
          expect(res.body.authUrl).toContain('login.microsoftonline.com');
        });
    });

    it('/integrations/calendar/events (GET)', () => {
      return request(app.getHttpServer())
        .get('/integrations/calendar/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('events');
          expect(res.body).toHaveProperty('providers');
          expect(Array.isArray(res.body.events)).toBe(true);
        });
    });
  });

  describe('Video Conferencing Integration', () => {
    it('/integrations/video-conferencing/zoom/auth-url (GET)', () => {
      return request(app.getHttpServer())
        .get('/integrations/video-conferencing/zoom/auth-url')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('authUrl');
          expect(res.body).toHaveProperty('state');
          expect(res.body.authUrl).toContain('zoom.us');
        });
    });

    it('/integrations/video-conferencing/teams/auth-url (GET)', () => {
      return request(app.getHttpServer())
        .get('/integrations/video-conferencing/teams/auth-url')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('authUrl');
          expect(res.body).toHaveProperty('state');
          expect(res.body.authUrl).toContain('login.microsoftonline.com');
        });
    });

    it('/integrations/video-conferencing/meetings (GET)', () => {
      return request(app.getHttpServer())
        .get('/integrations/video-conferencing/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('meetings');
          expect(res.body).toHaveProperty('count');
          expect(Array.isArray(res.body.meetings)).toBe(true);
        });
    });
  });

  describe('Data Export', () => {
    it('/integrations/data-export/formats (GET)', () => {
      return request(app.getHttpServer())
        .get('/integrations/data-export/formats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('formats');
          expect(res.body).toHaveProperty('dataTypes');
          expect(Array.isArray(res.body.formats)).toBe(true);
          expect(Array.isArray(res.body.dataTypes)).toBe(true);
        });
    });

    it('/integrations/data-export/create (POST)', () => {
      return request(app.getHttpServer())
        .post('/integrations/data-export/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'json',
          dataTypes: ['profile', 'sessions'],
          includeTranscriptions: true,
          includeResponses: false,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('export');
          expect(res.body.export).toHaveProperty('exportId');
        });
    });

    it('/integrations/data-export/quick-export (POST)', () => {
      return request(app.getHttpServer())
        .post('/integrations/data-export/quick-export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'profile-only',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('export');
        });
    });

    it('/integrations/data-export/gdpr-export (POST)', () => {
      return request(app.getHttpServer())
        .post('/integrations/data-export/gdpr-export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('export');
          expect(res.body).toHaveProperty('notice');
          expect(res.body.notice).toContain('GDPR');
        });
    });
  });

  describe('Webhooks', () => {
    it('/integrations/webhooks/events/available (GET)', () => {
      return request(app.getHttpServer())
        .get('/integrations/webhooks/events/available')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('events');
          expect(res.body).toHaveProperty('count');
          expect(Array.isArray(res.body.events)).toBe(true);
          expect(res.body.events.length).toBeGreaterThan(0);
        });
    });

    it('/integrations/webhooks (POST)', () => {
      return request(app.getHttpServer())
        .post('/integrations/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com/webhook',
          events: ['session.started', 'session.completed'],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('webhook');
          expect(res.body.webhook).toHaveProperty('id');
          expect(res.body.webhook).toHaveProperty('secret');
        });
    });

    it('/integrations/webhooks (GET)', () => {
      return request(app.getHttpServer())
        .get('/integrations/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('webhooks');
          expect(res.body).toHaveProperty('count');
          expect(Array.isArray(res.body.webhooks)).toBe(true);
        });
    });

    it('/integrations/webhooks/documentation/integration (GET)', () => {
      return request(app.getHttpServer())
        .get('/integrations/webhooks/documentation/integration')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('documentation');
          expect(res.body.documentation).toHaveProperty('overview');
          expect(res.body.documentation).toHaveProperty('setup');
          expect(res.body.documentation).toHaveProperty('security');
        });
    });
  });

  describe('Integration Error Handling', () => {
    it('should handle invalid webhook URL', () => {
      return request(app.getHttpServer())
        .post('/integrations/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'invalid-url',
          events: ['session.started'],
        })
        .expect(400);
    });

    it('should handle missing export data types', () => {
      return request(app.getHttpServer())
        .post('/integrations/data-export/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'json',
          dataTypes: [],
        })
        .expect(400);
    });

    it('should handle invalid quick export type', () => {
      return request(app.getHttpServer())
        .post('/integrations/data-export/quick-export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid-type',
        })
        .expect(400);
    });
  });
});