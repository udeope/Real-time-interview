import { PrismaClient } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

export let app: INestApplication;
export let moduleFixture: TestingModule;

beforeAll(async () => {
  // Set up test database
  await prisma.sessionMetrics.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.interviewSession.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();

  // Create test application
  moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();
});

afterAll(async () => {
  // Clean up
  await prisma.sessionMetrics.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.interviewSession.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();
  
  await prisma.$disconnect();
  await app.close();
});

beforeEach(async () => {
  // Clean up between tests
  await prisma.interaction.deleteMany();
  await prisma.sessionMetrics.deleteMany();
});