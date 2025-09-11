import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PracticeRepository } from './practice.repository';
import { QuestionBankService } from './services/question-bank.service';
import { FeedbackService } from './services/feedback.service';
import { PracticeAnalyticsService } from './services/practice-analytics.service';
import {
  CreatePracticeSessionDto,
  SubmitPracticeResponseDto,
  PracticeQuestionDto,
  PracticeFeedbackDto,
  PracticeSessionSummaryDto,
  QuestionType,
} from './dto/practice.dto';

@Injectable()
export class PracticeService {
  private readonly logger = new Logger(PracticeService.name);

  constructor(
    private practiceRepository: PracticeRepository,
    private questionBankService: QuestionBankService,
    private feedbackService: FeedbackService,
    private analyticsService: PracticeAnalyticsService,
  ) {}

  async createPracticeSession(userId: string, dto: CreatePracticeSessionDto): Promise<any> {
    this.logger.log(`Creating practice session for user ${userId}`);

    try {
      // Create the practice session
      const session = await this.practiceRepository.createPracticeSession(userId, dto);

      // Generate questions for the session
      const questions = await this.questionBankService.generateQuestionsForSession(
        dto.jobTitle,
        dto.industry,
        dto.difficulty,
        dto.questionTypes,
        dto.questionCount,
      );

      // Create practice questions in the database
      const practiceQuestions = [];
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        // For generated questions, we need to create them in the question bank first
        let questionBankId = question.id;
        if (question.id.startsWith('generated-')) {
          // This would be a more complex implementation in a real system
          // For now, we'll use a placeholder approach
          questionBankId = 'placeholder-id';
        }

        const practiceQuestion = await this.practiceRepository.createPracticeQuestion(
          session.id,
          questionBankId,
          i + 1,
        );
        practiceQuestions.push(practiceQuestion);
      }

      return {
        sessionId: session.id,
        questions: questions,
        status: 'created',
        createdAt: session.createdAt,
      };
    } catch (error) {
      this.logger.error('Error creating practice session:', error);
      throw new BadRequestException('Failed to create practice session');
    }
  }

  async getPracticeSession(sessionId: string): Promise<any> {
    const session = await this.practiceRepository.findPracticeSession(sessionId);
    
    if (!session) {
      throw new NotFoundException('Practice session not found');
    }

    const questions = session.questions.map(q => ({
      id: q.id,
      question: q.questionBank?.question || 'Question not found',
      type: q.questionBank?.type || 'unknown',
      category: q.questionBank?.category || 'General',
      difficulty: q.questionBank?.difficulty || 'mid',
      expectedStructure: q.questionBank?.expectedStructure,
      keyPoints: q.questionBank?.keyPoints as string[],
      timeLimit: q.questionBank?.timeLimit,
      order: q.questionOrder,
      answered: !!q.response,
      response: q.response,
    }));

    return {
      id: session.id,
      jobTitle: session.jobTitle,
      industry: session.industry,
      difficulty: session.difficulty,
      questionTypes: session.questionTypes,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      questions,
      progress: {
        total: questions.length,
        answered: questions.filter(q => q.answered).length,
        remaining: questions.filter(q => !q.answered).length,
      },
    };
  }

  async getNextQuestion(sessionId: string): Promise<PracticeQuestionDto | null> {
    const session = await this.getPracticeSession(sessionId);
    
    const nextQuestion = session.questions.find((q: any) => !q.answered);
    
    if (!nextQuestion) {
      return null; // All questions answered
    }

    return {
      id: nextQuestion.id,
      question: nextQuestion.question,
      type: nextQuestion.type as QuestionType,
      category: nextQuestion.category,
      difficulty: nextQuestion.difficulty,
      expectedStructure: nextQuestion.expectedStructure,
      keyPoints: nextQuestion.keyPoints,
      timeLimit: nextQuestion.timeLimit,
    };
  }

  async submitResponse(dto: SubmitPracticeResponseDto): Promise<PracticeFeedbackDto> {
    this.logger.log(`Submitting response for session ${dto.sessionId}, question ${dto.questionId}`);

    try {
      // Get the session and question details
      const session = await this.practiceRepository.findPracticeSession(dto.sessionId);
      if (!session) {
        throw new NotFoundException('Practice session not found');
      }

      const question = session.questions.find(q => q.id === dto.questionId);
      if (!question) {
        throw new NotFoundException('Question not found in session');
      }

      // Create the response record
      const response = await this.practiceRepository.createPracticeResponse({
        sessionId: dto.sessionId,
        questionId: dto.questionId,
        response: dto.response,
        duration: dto.duration,
        usedAISuggestions: dto.usedAISuggestions,
      });

      // Generate feedback
      const feedback = await this.feedbackService.generateFeedback(
        question.questionBank?.question || '',
        dto.response,
        question.questionBank?.type as QuestionType,
        dto.duration,
        question.questionBank?.expectedStructure,
        question.questionBank?.keyPoints as string[],
      );

      // Update the response with feedback
      await this.practiceRepository.updatePracticeResponse(response.id, {
        overallScore: feedback.overallScore,
        contentScore: feedback.contentScore,
        structureScore: feedback.structureScore,
        clarityScore: feedback.clarityScore,
        feedback: feedback.feedback,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        suggestions: feedback.suggestions,
      });

      return feedback;
    } catch (error) {
      this.logger.error('Error submitting practice response:', error);
      throw new BadRequestException('Failed to submit response');
    }
  }

  async completePracticeSession(sessionId: string): Promise<PracticeSessionSummaryDto> {
    this.logger.log(`Completing practice session ${sessionId}`);

    try {
      const session = await this.practiceRepository.findPracticeSession(sessionId);
      if (!session) {
        throw new NotFoundException('Practice session not found');
      }

      // Update session status
      const completedSession = await this.practiceRepository.updatePracticeSession(sessionId, {
        status: 'completed',
        completedAt: new Date(),
        duration: Math.round((Date.now() - session.startedAt.getTime()) / 60000), // Duration in minutes
      });

      // Generate analytics
      const analytics = await this.analyticsService.generateSessionAnalytics(sessionId);

      // Update session with average score
      await this.practiceRepository.updatePracticeSession(sessionId, {
        averageScore: analytics.averageScore,
      });

      return {
        id: sessionId,
        jobTitle: session.jobTitle,
        industry: session.industry,
        questionsAnswered: analytics.questionsAnswered,
        averageScore: analytics.averageScore,
        duration: completedSession.duration || 0,
        completedAt: completedSession.completedAt || new Date(),
        achievements: analytics.progressMetrics?.achievements || [],
        improvementAreas: analytics.improvementAreas,
      };
    } catch (error) {
      this.logger.error('Error completing practice session:', error);
      throw new BadRequestException('Failed to complete session');
    }
  }

  async getUserPracticeSessions(userId: string, limit = 10): Promise<PracticeSessionSummaryDto[]> {
    const sessions = await this.practiceRepository.findUserPracticeSessions(userId, limit);

    return sessions.map(session => ({
      id: session.id,
      jobTitle: session.jobTitle,
      industry: session.industry,
      questionsAnswered: session.analytics?.[0]?.questionsAnswered || 0,
      averageScore: session.averageScore?.toNumber() || 0,
      duration: session.duration || 0,
      completedAt: session.completedAt || session.createdAt,
      achievements: [],
      improvementAreas: session.analytics?.[0]?.improvementAreas as string[] || [],
    }));
  }

  async getUserAnalytics(userId: string): Promise<any> {
    return this.analyticsService.getOverallUserStats(userId);
  }

  async getSessionAnalytics(sessionId: string): Promise<any> {
    return this.analyticsService.generateSessionAnalytics(sessionId);
  }

  async initializeQuestionBank(): Promise<void> {
    this.logger.log('Initializing question bank with seed data');
    await this.practiceRepository.seedQuestionBank();
  }

  async getQuestionsByCategory(category: string, limit = 10): Promise<PracticeQuestionDto[]> {
    const questions = await this.questionBankService.getQuestionsByCategory(category, limit);
    
    return questions.map(q => ({
      id: q.id,
      question: q.question,
      type: q.type as QuestionType,
      category: q.category,
      difficulty: q.difficulty as any,
      expectedStructure: q.expectedStructure,
      keyPoints: q.keyPoints as string[],
      timeLimit: q.timeLimit,
    }));
  }

  async pausePracticeSession(sessionId: string): Promise<void> {
    await this.practiceRepository.updatePracticeSession(sessionId, {
      status: 'paused',
    });
  }

  async resumePracticeSession(sessionId: string): Promise<void> {
    await this.practiceRepository.updatePracticeSession(sessionId, {
      status: 'active',
    });
  }

  async abandonPracticeSession(sessionId: string): Promise<void> {
    await this.practiceRepository.updatePracticeSession(sessionId, {
      status: 'abandoned',
      completedAt: new Date(),
    });
  }
}