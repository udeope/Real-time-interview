import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.config';
import { ConversationContext, QuestionClassification } from '../interfaces/context-analysis.interface';

@Injectable()
export class ConversationHistoryService {
  private readonly logger = new Logger(ConversationHistoryService.name);

  constructor(private readonly prisma: DatabaseService) {}

  async updateConversationHistory(
    sessionId: string,
    question: string,
    questionClassification: QuestionClassification,
    response?: string,
    feedback?: number,
    duration?: number
  ): Promise<void> {
    try {
      this.logger.debug(`Updating conversation history for session: ${sessionId}`);

      // Create or update interaction record
      await this.prisma.interaction.create({
        data: {
          sessionId,
          question,
          questionClassification: questionClassification as any,
          selectedResponse: response,
          userFeedback: feedback,
          timestamp: new Date()
        }
      });

      // Update session metrics if duration is provided
      if (duration !== undefined) {
        await this.updateSessionMetrics(sessionId, duration);
      }

      this.logger.debug(`Conversation history updated successfully for session: ${sessionId}`);

    } catch (error) {
      this.logger.error(`Error updating conversation history: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getConversationHistory(sessionId: string, limit: number = 50): Promise<ConversationContext[]> {
    try {
      this.logger.debug(`Retrieving conversation history for session: ${sessionId}`);

      const interactions = await this.prisma.interaction.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      const conversationHistory: ConversationContext[] = interactions.map(interaction => ({
        interactionId: interaction.id,
        timestamp: interaction.timestamp,
        question: interaction.question,
        questionClassification: interaction.questionClassification as any,
        response: interaction.selectedResponse || undefined,
        feedback: interaction.userFeedback || undefined,
        duration: undefined // Duration is not stored per interaction currently
      }));

      // Reverse to get chronological order (oldest first)
      conversationHistory.reverse();

      this.logger.debug(`Retrieved ${conversationHistory.length} conversation entries for session: ${sessionId}`);
      return conversationHistory;

    } catch (error) {
      this.logger.error(`Error retrieving conversation history: ${error.message}`, error.stack);
      return [];
    }
  }

  async getRecentQuestionTypes(sessionId: string, limit: number = 10): Promise<QuestionClassification[]> {
    try {
      this.logger.debug(`Getting recent question types for session: ${sessionId}`);

      const interactions = await this.prisma.interaction.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: { questionClassification: true }
      });

      const questionTypes: QuestionClassification[] = interactions
        .map(interaction => interaction.questionClassification as any)
        .filter(classification => classification !== null);

      this.logger.debug(`Retrieved ${questionTypes.length} recent question types for session: ${sessionId}`);
      return questionTypes;

    } catch (error) {
      this.logger.error(`Error getting recent question types: ${error.message}`, error.stack);
      return [];
    }
  }

  async getConversationStats(sessionId: string): Promise<{
    totalQuestions: number;
    questionTypeDistribution: Record<string, number>;
    averageFeedback: number;
    totalDuration: number;
  }> {
    try {
      this.logger.debug(`Getting conversation stats for session: ${sessionId}`);

      const interactions = await this.prisma.interaction.findMany({
        where: { sessionId },
        select: {
          questionClassification: true,
          userFeedback: true
        }
      });

      const totalQuestions = interactions.length;
      
      // Calculate question type distribution
      const questionTypeDistribution: Record<string, number> = {};
      let totalFeedback = 0;
      let feedbackCount = 0;

      for (const interaction of interactions) {
        const classification = interaction.questionClassification as any;
        if (classification?.type) {
          questionTypeDistribution[classification.type] = 
            (questionTypeDistribution[classification.type] || 0) + 1;
        }

        if (interaction.userFeedback) {
          totalFeedback += interaction.userFeedback;
          feedbackCount++;
        }
      }

      const averageFeedback = feedbackCount > 0 ? totalFeedback / feedbackCount : 0;

      // Get session duration from session metrics
      const sessionMetrics = await this.prisma.sessionMetrics.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      });

      const totalDuration = sessionMetrics?.totalLatencyMs || 0;

      const stats = {
        totalQuestions,
        questionTypeDistribution,
        averageFeedback,
        totalDuration
      };

      this.logger.debug(`Conversation stats calculated for session: ${sessionId}`, stats);
      return stats;

    } catch (error) {
      this.logger.error(`Error getting conversation stats: ${error.message}`, error.stack);
      return {
        totalQuestions: 0,
        questionTypeDistribution: {},
        averageFeedback: 0,
        totalDuration: 0
      };
    }
  }

  async getConversationContext(sessionId: string, currentQuestion: string): Promise<{
    recentQuestions: string[];
    questionFlow: string[];
    topicProgression: string[];
    interviewPhase: 'opening' | 'technical' | 'behavioral' | 'closing';
  }> {
    try {
      this.logger.debug(`Getting conversation context for session: ${sessionId}`);

      const interactions = await this.prisma.interaction.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
        select: {
          question: true,
          questionClassification: true,
          timestamp: true
        }
      });

      const recentQuestions = interactions
        .slice(-5)
        .map(interaction => interaction.question);

      const questionFlow = interactions.map(interaction => {
        const classification = interaction.questionClassification as any;
        return classification?.type || 'unknown';
      });

      const topicProgression = this.extractTopicProgression(interactions);
      const interviewPhase = this.determineInterviewPhase(interactions, currentQuestion);

      const context = {
        recentQuestions,
        questionFlow,
        topicProgression,
        interviewPhase
      };

      this.logger.debug(`Conversation context retrieved for session: ${sessionId}`, context);
      return context;

    } catch (error) {
      this.logger.error(`Error getting conversation context: ${error.message}`, error.stack);
      return {
        recentQuestions: [],
        questionFlow: [],
        topicProgression: [],
        interviewPhase: 'opening'
      };
    }
  }

  async findSimilarQuestions(
    question: string,
    userId: string,
    limit: number = 5
  ): Promise<ConversationContext[]> {
    try {
      this.logger.debug(`Finding similar questions for user: ${userId}`);

      // Get user's sessions
      const userSessions = await this.prisma.interviewSession.findMany({
        where: { userId },
        select: { id: true }
      });

      const sessionIds = userSessions.map(session => session.id);

      if (sessionIds.length === 0) {
        return [];
      }

      // Find interactions with similar questions
      const interactions = await this.prisma.interaction.findMany({
        where: {
          sessionId: { in: sessionIds }
        },
        orderBy: { timestamp: 'desc' },
        take: 100 // Get more to filter from
      });

      // Calculate similarity scores
      const questionWords = this.extractKeywords(question.toLowerCase());
      const similarQuestions: Array<{ interaction: any; similarity: number }> = [];

      for (const interaction of interactions) {
        const interactionWords = this.extractKeywords(interaction.question.toLowerCase());
        const similarity = this.calculateSimilarity(questionWords, interactionWords);
        
        if (similarity > 0.3) { // Threshold for similarity
          similarQuestions.push({ interaction, similarity });
        }
      }

      // Sort by similarity and take top results
      similarQuestions.sort((a, b) => b.similarity - a.similarity);
      
      const results: ConversationContext[] = similarQuestions
        .slice(0, limit)
        .map(({ interaction }) => ({
          interactionId: interaction.id,
          timestamp: interaction.timestamp,
          question: interaction.question,
          questionClassification: interaction.questionClassification as any,
          response: interaction.selectedResponse || undefined,
          feedback: interaction.userFeedback || undefined
        }));

      this.logger.debug(`Found ${results.length} similar questions for user: ${userId}`);
      return results;

    } catch (error) {
      this.logger.error(`Error finding similar questions: ${error.message}`, error.stack);
      return [];
    }
  }

  private async updateSessionMetrics(sessionId: string, duration: number): Promise<void> {
    try {
      // Get or create session metrics
      const existingMetrics = await this.prisma.sessionMetrics.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      });

      if (existingMetrics) {
        // Update existing metrics
        await this.prisma.sessionMetrics.update({
          where: { id: existingMetrics.id },
          data: {
            totalLatencyMs: (existingMetrics.totalLatencyMs || 0) + duration * 1000
          }
        });
      } else {
        // Create new metrics
        await this.prisma.sessionMetrics.create({
          data: {
            sessionId,
            totalLatencyMs: duration * 1000
          }
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to update session metrics: ${error.message}`);
    }
  }

  private extractTopicProgression(interactions: any[]): string[] {
    const topics: string[] = [];
    
    for (const interaction of interactions) {
      const classification = interaction.questionClassification as any;
      if (classification?.category) {
        topics.push(classification.category);
      }
    }

    // Remove consecutive duplicates
    return topics.filter((topic, index) => index === 0 || topic !== topics[index - 1]);
  }

  private determineInterviewPhase(
    interactions: any[],
    currentQuestion: string
  ): 'opening' | 'technical' | 'behavioral' | 'closing' {
    if (interactions.length === 0) return 'opening';

    const recentInteractions = interactions.slice(-3);
    const questionTypes = recentInteractions.map(interaction => {
      const classification = interaction.questionClassification as any;
      return classification?.type || 'unknown';
    });

    // Check for closing indicators
    const closingKeywords = ['questions for us', 'questions for me', 'anything else', 'final', 'wrap up'];
    if (closingKeywords.some(keyword => currentQuestion.toLowerCase().includes(keyword))) {
      return 'closing';
    }

    // Determine phase based on recent question types
    const technicalCount = questionTypes.filter(type => type === 'technical').length;
    const behavioralCount = questionTypes.filter(type => type === 'behavioral').length;

    if (technicalCount > behavioralCount) return 'technical';
    if (behavioralCount > 0) return 'behavioral';
    if (interactions.length < 3) return 'opening';

    return 'behavioral'; // Default to behavioral for mid-interview
  }

  private extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful keywords
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are',
      'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'what', 'when', 'where', 'why', 'how', 'who', 'which', 'that', 'this',
      'these', 'those', 'you', 'your', 'we', 'our', 'they', 'their', 'it', 'its'
    ]);

    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 10);
  }

  private calculateSimilarity(words1: string[], words2: string[]): number {
    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }
}