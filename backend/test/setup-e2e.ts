import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean up database before tests
  await prisma.sessionMetrics.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.interviewSession.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  // Clean up database after tests
  await prisma.sessionMetrics.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.interviewSession.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();
  
  await prisma.$disconnect();
});