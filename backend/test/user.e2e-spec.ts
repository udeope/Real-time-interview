import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('User Management (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same configuration as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    
    await app.init();

    // Register a test user and get access token
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'usertest@example.com',
        name: 'User Test',
        password: 'password123',
      });

    accessToken = registerResponse.body.access_token;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/users/me (GET)', () => {
    it('should get current user info', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('usertest@example.com');
      expect(response.body.name).toBe('User Test');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);
    });
  });

  describe('/api/users/me (PUT)', () => {
    it('should update user info', async () => {
      const updateDto = {
        name: 'Updated User Name',
      };

      const response = await request(app.getHttpServer())
        .put('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
      expect(response.body.id).toBe(userId);
    });
  });

  describe('/api/users/me/profile (PUT)', () => {
    it('should create/update user profile', async () => {
      const profileDto = {
        seniority: 'mid',
        industries: ['technology', 'finance'],
        skills: [
          { name: 'JavaScript', level: 'advanced', category: 'programming' },
          { name: 'React', level: 'intermediate', category: 'frontend' },
        ],
        experience: [
          {
            company: 'Tech Corp',
            role: 'Software Developer',
            duration: '2 years',
            achievements: ['Built scalable APIs', 'Led team of 3'],
            technologies: ['Node.js', 'PostgreSQL'],
          },
        ],
        preferences: {
          preferredLanguage: 'en',
          timezone: 'UTC',
          notificationSettings: ['email', 'push'],
        },
      };

      const response = await request(app.getHttpServer())
        .put('/api/users/me/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(profileDto)
        .expect(200);

      expect(response.body.seniority).toBe(profileDto.seniority);
      expect(response.body.industries).toEqual(profileDto.industries);
      expect(response.body.skills).toEqual(profileDto.skills);
      expect(response.body.experience).toEqual(profileDto.experience);
      expect(response.body.preferences).toEqual(profileDto.preferences);
    });
  });

  describe('/api/users/me/profile (GET)', () => {
    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.seniority).toBe('mid');
      expect(response.body.industries).toEqual(['technology', 'finance']);
      expect(response.body.userId).toBe(userId);
    });
  });

  describe('/api/users/me/complete (GET)', () => {
    it('should get user with profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.profile).toBeDefined();
      expect(response.body.profile.seniority).toBe('mid');
    });
  });
});