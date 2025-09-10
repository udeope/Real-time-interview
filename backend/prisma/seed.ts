import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      name: 'John Doe',
      subscriptionTier: 'pro',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      subscriptionTier: 'free',
    },
  });

  console.log('✅ Created users:', { user1: user1.id, user2: user2.id });

  // Create user profiles
  const profile1 = await prisma.userProfile.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      seniority: 'senior',
      industries: ['technology', 'fintech'],
      skills: [
        { name: 'JavaScript', level: 'expert' },
        { name: 'TypeScript', level: 'expert' },
        { name: 'React', level: 'expert' },
        { name: 'Node.js', level: 'expert' },
        { name: 'System Design', level: 'advanced' },
      ],
      experience: [
        {
          company: 'Tech Corp',
          role: 'Senior Software Engineer',
          duration: '2020-2023',
          achievements: [
            'Led development of microservices architecture',
            'Improved system performance by 40%',
            'Mentored 5 junior developers',
          ],
          technologies: ['React', 'Node.js', 'AWS', 'Docker'],
        },
        {
          company: 'StartupXYZ',
          role: 'Full Stack Developer',
          duration: '2018-2020',
          achievements: [
            'Built MVP from scratch',
            'Implemented CI/CD pipeline',
            'Reduced deployment time by 60%',
          ],
          technologies: ['Vue.js', 'Express', 'MongoDB', 'Kubernetes'],
        },
      ],
      preferences: {
        interviewTypes: ['technical', 'behavioral'],
        focusAreas: ['system design', 'coding', 'leadership'],
        responseStyle: 'detailed',
      },
    },
  });

  const profile2 = await prisma.userProfile.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      seniority: 'mid',
      industries: ['healthcare', 'technology'],
      skills: [
        { name: 'Python', level: 'advanced' },
        { name: 'Django', level: 'advanced' },
        { name: 'PostgreSQL', level: 'intermediate' },
        { name: 'Machine Learning', level: 'beginner' },
      ],
      experience: [
        {
          company: 'HealthTech Inc',
          role: 'Backend Developer',
          duration: '2021-2023',
          achievements: [
            'Developed patient management system',
            'Implemented HIPAA compliance',
            'Optimized database queries',
          ],
          technologies: ['Python', 'Django', 'PostgreSQL', 'Redis'],
        },
      ],
      preferences: {
        interviewTypes: ['technical', 'situational'],
        focusAreas: ['backend development', 'databases'],
        responseStyle: 'concise',
      },
    },
  });

  console.log('✅ Created user profiles:', { profile1: profile1.id, profile2: profile2.id });

  // Create sample interview sessions
  const session1 = await prisma.interviewSession.create({
    data: {
      userId: user1.id,
      jobContext: {
        title: 'Senior Full Stack Engineer',
        company: 'TechGiant Corp',
        description: 'Looking for a senior engineer to lead frontend initiatives',
        requirements: [
          '5+ years of React experience',
          'Strong system design skills',
          'Leadership experience',
        ],
        companyValues: ['innovation', 'collaboration', 'excellence'],
        interviewType: 'technical',
        seniority: 'senior',
      },
      status: 'completed',
      settings: {
        transcriptionEnabled: true,
        responseGeneration: true,
        confidenceThreshold: 0.8,
      },
      endedAt: new Date(),
    },
  });

  const session2 = await prisma.interviewSession.create({
    data: {
      userId: user2.id,
      jobContext: {
        title: 'Backend Developer',
        company: 'HealthStartup',
        description: 'Backend developer for healthcare applications',
        requirements: [
          '3+ years Python experience',
          'Database optimization skills',
          'Healthcare domain knowledge preferred',
        ],
        companyValues: ['patient care', 'security', 'reliability'],
        interviewType: 'mixed',
        seniority: 'mid',
      },
      status: 'active',
      settings: {
        transcriptionEnabled: true,
        responseGeneration: true,
        confidenceThreshold: 0.85,
      },
    },
  });

  console.log('✅ Created interview sessions:', { session1: session1.id, session2: session2.id });

  // Create sample interactions
  const interaction1 = await prisma.interaction.create({
    data: {
      sessionId: session1.id,
      question: 'Can you tell me about a time when you had to lead a challenging project?',
      questionClassification: {
        type: 'behavioral',
        category: 'leadership',
        difficulty: 'senior',
        requiresSTAR: true,
      },
      generatedResponses: [
        {
          id: '1',
          content: 'At Tech Corp, I led the migration of our monolithic architecture to microservices...',
          structure: 'STAR',
          estimatedDuration: 75,
          confidence: 0.92,
          tags: ['leadership', 'technical', 'architecture'],
        },
        {
          id: '2',
          content: 'I can share an experience where I guided my team through a critical system redesign...',
          structure: 'STAR',
          estimatedDuration: 80,
          confidence: 0.88,
          tags: ['leadership', 'teamwork', 'problem-solving'],
        },
      ],
      selectedResponse: 'At Tech Corp, I led the migration of our monolithic architecture to microservices...',
      userFeedback: 5,
    },
  });

  const interaction2 = await prisma.interaction.create({
    data: {
      sessionId: session2.id,
      question: 'How would you optimize a slow database query?',
      questionClassification: {
        type: 'technical',
        category: 'database',
        difficulty: 'mid',
        requiresSTAR: false,
      },
      generatedResponses: [
        {
          id: '1',
          content: 'I would start by analyzing the query execution plan to identify bottlenecks...',
          structure: 'technical',
          estimatedDuration: 60,
          confidence: 0.95,
          tags: ['database', 'optimization', 'performance'],
        },
      ],
    },
  });

  console.log('✅ Created interactions:', { interaction1: interaction1.id, interaction2: interaction2.id });

  // Create sample metrics
  await prisma.sessionMetrics.create({
    data: {
      sessionId: session1.id,
      transcriptionLatencyMs: 1200,
      responseGenerationMs: 800,
      totalLatencyMs: 2000,
      transcriptionAccuracy: 0.96,
      userSatisfaction: 5,
    },
  });

  await prisma.sessionMetrics.create({
    data: {
      sessionId: session2.id,
      transcriptionLatencyMs: 1100,
      responseGenerationMs: 750,
      totalLatencyMs: 1850,
      transcriptionAccuracy: 0.94,
      userSatisfaction: 4,
    },
  });

  console.log('✅ Created session metrics');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });