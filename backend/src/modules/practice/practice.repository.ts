import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../config/database.config';
import { CreatePracticeSessionDto, QuestionType, DifficultyLevel } from './dto/practice.dto';

@Injectable()
export class PracticeRepository {
  constructor(private prisma: DatabaseService) {}

  async createPracticeSession(userId: string, dto: CreatePracticeSessionDto) {
    return this.prisma.practiceSession.create({
      data: {
        userId,
        jobTitle: dto.jobTitle,
        industry: dto.industry,
        difficulty: dto.difficulty,
        questionTypes: dto.questionTypes,
        questionCount: dto.questionCount,
        duration: dto.duration,
      },
    });
  }

  async findPracticeSession(sessionId: string) {
    return this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          include: {
            questionBank: true,
            response: true,
          },
          orderBy: { questionOrder: 'asc' },
        },
        analytics: true,
      },
    });
  }

  async findUserPracticeSessions(userId: string, limit = 10) {
    return this.prisma.practiceSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        analytics: true,
      },
    });
  }

  async updatePracticeSession(sessionId: string, data: any) {
    return this.prisma.practiceSession.update({
      where: { id: sessionId },
      data,
    });
  }

  async getQuestionsByFilters(
    type: QuestionType[],
    industry: string,
    difficulty: DifficultyLevel,
    limit: number,
  ) {
    return this.prisma.questionBank.findMany({
      where: {
        type: { in: type },
        industry,
        difficulty,
        isActive: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPracticeQuestion(sessionId: string, questionBankId: string, order: number) {
    return this.prisma.practiceQuestion.create({
      data: {
        sessionId,
        questionBankId,
        questionOrder: order,
      },
      include: {
        questionBank: true,
      },
    });
  }

  async createPracticeResponse(data: {
    sessionId: string;
    questionId: string;
    response: string;
    duration: number;
    usedAISuggestions?: boolean;
  }) {
    return this.prisma.practiceResponse.create({
      data,
    });
  }

  async updatePracticeResponse(responseId: string, feedback: any) {
    return this.prisma.practiceResponse.update({
      where: { id: responseId },
      data: feedback,
    });
  }

  async createPracticeAnalytics(data: {
    sessionId: string;
    userId: string;
    totalQuestions: number;
    questionsAnswered: number;
    averageResponseTime?: number;
    averageScore?: number;
    strongestAreas?: string[];
    improvementAreas?: string[];
    progressMetrics?: any;
  }) {
    return this.prisma.practiceAnalytics.create({
      data,
    });
  }

  async seedQuestionBank() {
    const questions = [
      // Technical Questions
      {
        question: "Explain the difference between REST and GraphQL APIs.",
        type: "technical",
        category: "API Design",
        industry: "Software Engineering",
        difficulty: "mid",
        expectedStructure: "Definition, comparison, use cases",
        keyPoints: ["REST principles", "GraphQL benefits", "When to use each"],
        timeLimit: 180,
        tags: ["API", "REST", "GraphQL", "Backend"],
      },
      {
        question: "How would you optimize a slow database query?",
        type: "technical",
        category: "Database",
        industry: "Software Engineering",
        difficulty: "senior",
        expectedStructure: "Analysis approach, optimization techniques",
        keyPoints: ["Query analysis", "Indexing", "Query rewriting", "Performance monitoring"],
        timeLimit: 240,
        tags: ["Database", "Performance", "SQL", "Optimization"],
      },
      // Behavioral Questions
      {
        question: "Tell me about a time when you had to work with a difficult team member.",
        type: "behavioral",
        category: "Teamwork",
        industry: "General",
        difficulty: "mid",
        expectedStructure: "STAR method",
        keyPoints: ["Situation description", "Actions taken", "Communication", "Result"],
        timeLimit: 120,
        tags: ["Teamwork", "Conflict Resolution", "Communication"],
      },
      {
        question: "Describe a project where you had to learn a new technology quickly.",
        type: "behavioral",
        category: "Learning",
        industry: "Technology",
        difficulty: "junior",
        expectedStructure: "STAR method",
        keyPoints: ["Learning approach", "Resources used", "Timeline", "Application"],
        timeLimit: 150,
        tags: ["Learning", "Adaptability", "Technology"],
      },
      // Situational Questions
      {
        question: "How would you handle a situation where a project deadline is at risk?",
        type: "situational",
        category: "Project Management",
        industry: "General",
        difficulty: "mid",
        expectedStructure: "Problem analysis, action plan",
        keyPoints: ["Risk assessment", "Stakeholder communication", "Mitigation strategies"],
        timeLimit: 180,
        tags: ["Project Management", "Problem Solving", "Communication"],
      },
    ];

    for (const question of questions) {
      // Check if question already exists
      const existing = await this.prisma.questionBank.findFirst({
        where: { 
          question: question.question,
          type: question.type,
          industry: question.industry,
        }
      });

      if (!existing) {
        await this.prisma.questionBank.create({
          data: question,
        });
      }
    }
  }
}