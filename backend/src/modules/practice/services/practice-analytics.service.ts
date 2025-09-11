import { Injectable, Logger } from '@nestjs/common';
import { PracticeRepository } from '../practice.repository';

@Injectable()
export class PracticeAnalyticsService {
  private readonly logger = new Logger(PracticeAnalyticsService.name);

  constructor(private practiceRepository: PracticeRepository) {}

  async generateSessionAnalytics(sessionId: string): Promise<any> {
    this.logger.log(`Generating analytics for session ${sessionId}`);

    const session = await this.practiceRepository.findPracticeSession(sessionId);
    if (!session) {
      throw new Error('Practice session not found');
    }

    const responses = session.questions
      .map(q => q.response)
      .filter(r => r !== null);

    if (responses.length === 0) {
      return this.createEmptyAnalytics(session);
    }

    const analytics = {
      totalQuestions: session.questions.length,
      questionsAnswered: responses.length,
      averageResponseTime: this.calculateAverageResponseTime(responses),
      averageScore: this.calculateAverageScore(responses),
      strongestAreas: this.identifyStrongestAreas(responses, session.questions),
      improvementAreas: this.identifyImprovementAreas(responses, session.questions),
      progressMetrics: this.calculateProgressMetrics(responses, session.questions),
      performanceByType: this.analyzePerformanceByType(responses, session.questions),
      timeManagement: this.analyzeTimeManagement(responses, session.questions),
      consistencyScore: this.calculateConsistencyScore(responses),
    };

    // Save analytics to database
    await this.practiceRepository.createPracticeAnalytics({
      sessionId,
      userId: session.userId,
      totalQuestions: analytics.totalQuestions,
      questionsAnswered: analytics.questionsAnswered,
      averageResponseTime: analytics.averageResponseTime,
      averageScore: analytics.averageScore,
      strongestAreas: analytics.strongestAreas,
      improvementAreas: analytics.improvementAreas,
      progressMetrics: analytics.progressMetrics,
    });

    return analytics;
  }

  private createEmptyAnalytics(session: any): any {
    return {
      totalQuestions: session.questions.length,
      questionsAnswered: 0,
      averageResponseTime: 0,
      averageScore: 0,
      strongestAreas: [],
      improvementAreas: ['Complete practice questions to get insights'],
      progressMetrics: {
        completionRate: 0,
        engagementScore: 0,
      },
      performanceByType: {},
      timeManagement: {
        withinTimeLimit: 0,
        averageOvertime: 0,
      },
      consistencyScore: 0,
    };
  }

  private calculateAverageResponseTime(responses: any[]): number {
    if (responses.length === 0) return 0;
    
    const totalTime = responses.reduce((sum, response) => sum + response.duration, 0);
    return Math.round(totalTime / responses.length);
  }

  private calculateAverageScore(responses: any[]): number {
    if (responses.length === 0) return 0;
    
    const totalScore = responses.reduce((sum, response) => sum + (response.overallScore || 0), 0);
    return Math.round((totalScore / responses.length) * 100) / 100;
  }

  private identifyStrongestAreas(responses: any[], questions: any[]): string[] {
    const areaScores: Record<string, { total: number; count: number }> = {};

    responses.forEach((response, index) => {
      const question = questions[index];
      if (question && question.questionBank) {
        const category = question.questionBank.category;
        const score = response.overallScore || 0;

        if (!areaScores[category]) {
          areaScores[category] = { total: 0, count: 0 };
        }
        areaScores[category].total += score;
        areaScores[category].count += 1;
      }
    });

    return Object.entries(areaScores)
      .map(([area, data]) => ({
        area,
        average: data.total / data.count,
      }))
      .filter(item => item.average >= 7)
      .sort((a, b) => b.average - a.average)
      .slice(0, 3)
      .map(item => item.area);
  }

  private identifyImprovementAreas(responses: any[], questions: any[]): string[] {
    const areaScores: Record<string, { total: number; count: number }> = {};

    responses.forEach((response, index) => {
      const question = questions[index];
      if (question && question.questionBank) {
        const category = question.questionBank.category;
        const score = response.overallScore || 0;

        if (!areaScores[category]) {
          areaScores[category] = { total: 0, count: 0 };
        }
        areaScores[category].total += score;
        areaScores[category].count += 1;
      }
    });

    return Object.entries(areaScores)
      .map(([area, data]) => ({
        area,
        average: data.total / data.count,
      }))
      .filter(item => item.average < 7)
      .sort((a, b) => a.average - b.average)
      .slice(0, 3)
      .map(item => item.area);
  }

  private calculateProgressMetrics(responses: any[], questions: any[]): any {
    const completionRate = (responses.length / questions.length) * 100;
    
    // Calculate engagement score based on response quality and completion
    let engagementScore = 0;
    if (responses.length > 0) {
      const avgResponseLength = responses.reduce((sum, r) => sum + (r.response?.length || 0), 0) / responses.length;
      const avgScore = this.calculateAverageScore(responses);
      
      engagementScore = Math.min(100, (avgResponseLength / 100) * 30 + avgScore * 7);
    }

    return {
      completionRate: Math.round(completionRate),
      engagementScore: Math.round(engagementScore),
      improvementTrend: this.calculateImprovementTrend(responses),
      consistencyRating: this.calculateConsistencyRating(responses),
    };
  }

  private calculateImprovementTrend(responses: any[]): string {
    if (responses.length < 3) return 'insufficient_data';

    const firstHalf = responses.slice(0, Math.floor(responses.length / 2));
    const secondHalf = responses.slice(Math.floor(responses.length / 2));

    const firstHalfAvg = this.calculateAverageScore(firstHalf);
    const secondHalfAvg = this.calculateAverageScore(secondHalf);

    const improvement = secondHalfAvg - firstHalfAvg;

    if (improvement > 0.5) return 'improving';
    if (improvement < -0.5) return 'declining';
    return 'stable';
  }

  private calculateConsistencyRating(responses: any[]): string {
    if (responses.length < 2) return 'insufficient_data';

    const scores = responses.map(r => r.overallScore || 0);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    if (standardDeviation < 1) return 'very_consistent';
    if (standardDeviation < 2) return 'consistent';
    if (standardDeviation < 3) return 'somewhat_consistent';
    return 'inconsistent';
  }

  private analyzePerformanceByType(responses: any[], questions: any[]): any {
    const typePerformance: Record<string, { scores: number[]; count: number }> = {};

    responses.forEach((response, index) => {
      const question = questions[index];
      if (question && question.questionBank) {
        const type = question.questionBank.type;
        const score = response.overallScore || 0;

        if (!typePerformance[type]) {
          typePerformance[type] = { scores: [], count: 0 };
        }
        typePerformance[type].scores.push(score);
        typePerformance[type].count += 1;
      }
    });

    const result: Record<string, any> = {};
    Object.entries(typePerformance).forEach(([type, data]) => {
      const average = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      result[type] = {
        averageScore: Math.round(average * 100) / 100,
        questionsAnswered: data.count,
        performance: average >= 8 ? 'excellent' : average >= 7 ? 'good' : average >= 6 ? 'fair' : 'needs_improvement',
      };
    });

    return result;
  }

  private analyzeTimeManagement(responses: any[], questions: any[]): any {
    let withinTimeLimit = 0;
    let totalOvertime = 0;
    let overtimeCount = 0;

    responses.forEach((response, index) => {
      const question = questions[index];
      if (question && question.questionBank && question.questionBank.timeLimit) {
        const timeLimit = question.questionBank.timeLimit;
        const actualTime = response.duration;

        if (actualTime <= timeLimit) {
          withinTimeLimit += 1;
        } else {
          totalOvertime += (actualTime - timeLimit);
          overtimeCount += 1;
        }
      }
    });

    return {
      withinTimeLimit,
      totalQuestions: responses.length,
      timeComplianceRate: responses.length > 0 ? Math.round((withinTimeLimit / responses.length) * 100) : 0,
      averageOvertime: overtimeCount > 0 ? Math.round(totalOvertime / overtimeCount) : 0,
    };
  }

  private calculateConsistencyScore(responses: any[]): number {
    if (responses.length < 2) return 0;

    const scores = responses.map(r => r.overallScore || 0);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert standard deviation to a consistency score (0-100)
    // Lower standard deviation = higher consistency
    const maxStdDev = 3; // Assuming max reasonable std dev is 3
    const consistencyScore = Math.max(0, 100 - (standardDeviation / maxStdDev) * 100);

    return Math.round(consistencyScore);
  }

  async getUserProgressHistory(userId: string, limit = 10): Promise<any> {
    const sessions = await this.practiceRepository.findUserPracticeSessions(userId, limit);
    
    return sessions.map(session => ({
      sessionId: session.id,
      date: session.createdAt,
      jobTitle: session.jobTitle,
      industry: session.industry,
      questionsAnswered: session.analytics?.[0]?.questionsAnswered || 0,
      averageScore: session.analytics?.[0]?.averageScore || 0,
      duration: session.duration,
      status: session.status,
    }));
  }

  async getOverallUserStats(userId: string): Promise<any> {
    const sessions = await this.practiceRepository.findUserPracticeSessions(userId, 100);
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalQuestions: 0,
        averageScore: 0,
        totalPracticeTime: 0,
        improvementTrend: 'no_data',
        strongestSkills: [],
        areasForImprovement: [],
      };
    }

    const totalSessions = sessions.length;
    const totalQuestions = sessions.reduce((sum, s) => sum + (s.analytics?.[0]?.questionsAnswered || 0), 0);
    const totalPracticeTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    
    const scoresWithData = sessions
      .map(s => s.analytics?.[0]?.averageScore)
      .filter(score => score !== undefined && score !== null)
      .map(score => typeof score === 'object' && score.toNumber ? score.toNumber() : Number(score));
    
    const averageScore = scoresWithData.length > 0 
      ? scoresWithData.reduce((sum, score) => sum + score, 0) / scoresWithData.length 
      : 0;

    // Calculate improvement trend over time
    const recentSessions = sessions.slice(0, 5);
    const olderSessions = sessions.slice(5, 10);
    
    let improvementTrend = 'stable';
    if (recentSessions.length > 0 && olderSessions.length > 0) {
      const recentAvg = recentSessions.reduce((sum, s) => {
        const score = s.analytics?.[0]?.averageScore || 0;
        return sum + (typeof score === 'object' && score.toNumber ? score.toNumber() : Number(score));
      }, 0) / recentSessions.length;
      const olderAvg = olderSessions.reduce((sum, s) => {
        const score = s.analytics?.[0]?.averageScore || 0;
        return sum + (typeof score === 'object' && score.toNumber ? score.toNumber() : Number(score));
      }, 0) / olderSessions.length;
      
      if (recentAvg > olderAvg + 0.5) improvementTrend = 'improving';
      else if (recentAvg < olderAvg - 0.5) improvementTrend = 'declining';
    }

    return {
      totalSessions,
      totalQuestions,
      averageScore: Math.round(averageScore * 100) / 100,
      totalPracticeTime,
      improvementTrend,
      strongestSkills: this.aggregateStrongestSkills(sessions),
      areasForImprovement: this.aggregateImprovementAreas(sessions),
    };
  }

  private aggregateStrongestSkills(sessions: any[]): string[] {
    const skillCounts: Record<string, number> = {};
    
    sessions.forEach(session => {
      const strongestAreas = session.analytics?.[0]?.strongestAreas || [];
      strongestAreas.forEach((area: string) => {
        skillCounts[area] = (skillCounts[area] || 0) + 1;
      });
    });

    return Object.entries(skillCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([skill]) => skill);
  }

  private aggregateImprovementAreas(sessions: any[]): string[] {
    const areaCounts: Record<string, number> = {};
    
    sessions.forEach(session => {
      const improvementAreas = session.analytics?.[0]?.improvementAreas || [];
      improvementAreas.forEach((area: string) => {
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      });
    });

    return Object.entries(areaCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([area]) => area);
  }
}