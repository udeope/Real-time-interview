import { Injectable, Logger } from '@nestjs/common';
import { QuestionClassificationService } from './services/question-classification.service';
import { UserProfileAnalysisService } from './services/user-profile-analysis.service';
import { JobDescriptionParsingService } from './services/job-description-parsing.service';
import { ConversationHistoryService } from './services/conversation-history.service';
import { ContextDataAggregationService } from './services/context-data-aggregation.service';
import {
  QuestionClassification,
  UserProfile,
  JobContext,
  ContextData,
  ConversationContext,
  RequirementMatch
} from './interfaces/context-analysis.interface';

@Injectable()
export class ContextAnalysisService {
  private readonly logger = new Logger(ContextAnalysisService.name);

  constructor(
    private readonly questionClassificationService: QuestionClassificationService,
    private readonly userProfileService: UserProfileAnalysisService,
    private readonly jobParsingService: JobDescriptionParsingService,
    private readonly conversationHistoryService: ConversationHistoryService,
    private readonly contextAggregationService: ContextDataAggregationService
  ) {}

  /**
   * Classify a question into type, category, and difficulty
   */
  async classifyQuestion(
    question: string,
    context?: string,
    jobContext?: JobContext
  ): Promise<QuestionClassification> {
    try {
      this.logger.debug(`Classifying question: ${question.substring(0, 100)}...`);
      
      return await this.questionClassificationService.classifyQuestion(
        question,
        context,
        jobContext
      );
    } catch (error) {
      this.logger.error(`Error in classifyQuestion: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyze user profile and extract skills from experience
   */
  async analyzeUserProfile(userId: string): Promise<UserProfile> {
    try {
      this.logger.debug(`Analyzing user profile for user: ${userId}`);
      
      return await this.userProfileService.analyzeUserProfile(userId);
    } catch (error) {
      this.logger.error(`Error in analyzeUserProfile: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extract job context from job description
   */
  async extractJobContext(jobDescription: string): Promise<JobContext> {
    try {
      this.logger.debug(`Extracting job context from description: ${jobDescription.substring(0, 100)}...`);
      
      return await this.jobParsingService.extractJobContext(jobDescription);
    } catch (error) {
      this.logger.error(`Error in extractJobContext: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Match job requirements with user skills and experience
   */
  async matchRequirements(
    jobContext: JobContext,
    userId: string
  ): Promise<RequirementMatch[]> {
    try {
      this.logger.debug(`Matching requirements for user: ${userId}, job: ${jobContext.title}`);
      
      const userProfile = await this.userProfileService.analyzeUserProfile(userId);
      
      return await this.jobParsingService.matchRequirements(
        jobContext,
        userProfile.skills,
        userProfile.experience
      );
    } catch (error) {
      this.logger.error(`Error in matchRequirements: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update conversation history with new interaction
   */
  async updateConversationHistory(
    sessionId: string,
    question: string,
    response?: string,
    feedback?: number,
    duration?: number
  ): Promise<void> {
    try {
      this.logger.debug(`Updating conversation history for session: ${sessionId}`);
      
      // First classify the question
      const questionClassification = await this.questionClassificationService.classifyQuestion(question);
      
      await this.conversationHistoryService.updateConversationHistory(
        sessionId,
        question,
        questionClassification,
        response,
        feedback,
        duration
      );
    } catch (error) {
      this.logger.error(`Error in updateConversationHistory: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string, limit?: number): Promise<ConversationContext[]> {
    try {
      this.logger.debug(`Getting conversation history for session: ${sessionId}`);
      
      return await this.conversationHistoryService.getConversationHistory(sessionId, limit);
    } catch (error) {
      this.logger.error(`Error in getConversationHistory: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get comprehensive context data for intelligent response generation
   */
  async getRelevantContext(
    userId: string,
    question: string,
    sessionId?: string,
    jobContext?: JobContext
  ): Promise<ContextData> {
    try {
      this.logger.debug(`Getting relevant context for user: ${userId}, question: ${question.substring(0, 50)}...`);
      
      return await this.contextAggregationService.getRelevantContext(
        userId,
        question,
        sessionId,
        jobContext
      );
    } catch (error) {
      this.logger.error(`Error in getRelevantContext: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyze question in context of user profile and conversation history
   */
  async analyzeQuestionContext(
    question: string,
    userId: string,
    sessionId?: string,
    jobContext?: JobContext
  ): Promise<{
    classification: QuestionClassification;
    contextualFactors: string[];
    recommendedApproach: any;
    relevantExperiences: any[];
    keyPoints: string[];
  }> {
    try {
      this.logger.debug(`Analyzing question context for user: ${userId}`);
      
      const userProfile = await this.userProfileService.analyzeUserProfile(userId);
      const conversationHistory = sessionId 
        ? await this.conversationHistoryService.getConversationHistory(sessionId, 10)
        : [];

      return await this.contextAggregationService.analyzeQuestionContext(
        question,
        userProfile,
        jobContext,
        conversationHistory
      );
    } catch (error) {
      this.logger.error(`Error in analyzeQuestionContext: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get conversation statistics and insights
   */
  async getConversationStats(sessionId: string): Promise<{
    totalQuestions: number;
    questionTypeDistribution: Record<string, number>;
    averageFeedback: number;
    totalDuration: number;
  }> {
    try {
      this.logger.debug(`Getting conversation stats for session: ${sessionId}`);
      
      return await this.conversationHistoryService.getConversationStats(sessionId);
    } catch (error) {
      this.logger.error(`Error in getConversationStats: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get conversation context including recent questions and interview phase
   */
  async getConversationContext(sessionId: string, currentQuestion: string): Promise<{
    recentQuestions: string[];
    questionFlow: string[];
    topicProgression: string[];
    interviewPhase: 'opening' | 'technical' | 'behavioral' | 'closing';
  }> {
    try {
      this.logger.debug(`Getting conversation context for session: ${sessionId}`);
      
      return await this.conversationHistoryService.getConversationContext(sessionId, currentQuestion);
    } catch (error) {
      this.logger.error(`Error in getConversationContext: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find similar questions from user's history
   */
  async findSimilarQuestions(
    question: string,
    userId: string,
    limit?: number
  ): Promise<ConversationContext[]> {
    try {
      this.logger.debug(`Finding similar questions for user: ${userId}`);
      
      return await this.conversationHistoryService.findSimilarQuestions(question, userId, limit);
    } catch (error) {
      this.logger.error(`Error in findSimilarQuestions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extract skills from experience data
   */
  async extractSkillsFromExperience(experiences: any[]): Promise<any> {
    try {
      this.logger.debug(`Extracting skills from ${experiences.length} experiences`);
      
      return await this.userProfileService.extractSkillsFromExperience(experiences);
    } catch (error) {
      this.logger.error(`Error in extractSkillsFromExperience: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get recent question types for pattern analysis
   */
  async getRecentQuestionTypes(sessionId: string, limit?: number): Promise<QuestionClassification[]> {
    try {
      this.logger.debug(`Getting recent question types for session: ${sessionId}`);
      
      return await this.conversationHistoryService.getRecentQuestionTypes(sessionId, limit);
    } catch (error) {
      this.logger.error(`Error in getRecentQuestionTypes: ${error.message}`, error.stack);
      throw error;
    }
  }
}