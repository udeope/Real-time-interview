import { PrismaClient } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

export let app: INestApplication;
export let moduleFixture: TestingModule;

// Performance test utilities
export class PerformanceMetrics {
  private startTime: number;
  private endTime: number;

  start() {
    this.startTime = performance.now();
  }

  end() {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  getDuration() {
    return this.endTime - this.startTime;
  }
}

export function expectLatencyUnder(actualMs: number, expectedMs: number) {
  expect(actualMs).toBeLessThan(expectedMs);
}

export function expectAccuracyAbove(actual: number, expected: number) {
  expect(actual).toBeGreaterThan(expected);
}

beforeAll(async () => {
  // Set up test database with performance data
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
  await prisma.$disconnect();
  await app.close();
});