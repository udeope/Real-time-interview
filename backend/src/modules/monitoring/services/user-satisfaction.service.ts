import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.config';
import { UserSatisfactionMetrics } from '../interfaces/monitoring.interface';

@Injectable()
export class UserSatisfactionService {
  private readonly logger = new Logger(UserSatisfactionService.name);

  constructor(private prisma: DatabaseService) {}

  async recordFeedback(
    sessionId: string,
    userId: string,
    rating: number,
    featureUsed: string,
    feedback?: string
  ): Promise<void> {
    const satisfactionMetrics: UserSatisfactionMetrics = {
      sessionId,
      userId,
      rating,
      feedback,
      featureUsed,
      timestamp: new Date(),
    };

    try {
      await this.prisma.userSatisfactionMetrics.create({
        data: satisfactionMetrics,
      });

      // Log low satisfaction scores for immediate attention
      if (rating <= 2) {
        this.logger.warn(`Low satisfaction score: ${rating}/5 for feature ${featureUsed} by user ${userId}`);
      }
    } catch (error) {
      this.logger.error('Failed to record user satisfaction', error);
    }
  }

  async getSatisfactionMetrics(timeRange: { start: Date; end: Date }) {
    const metrics = await this.prisma.userSatisfactionMetrics.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
    });

    if (metrics.length === 0) {
      return {
        averageRating: 0,
        totalResponses: 0,
        ratingDistribution: {},
        featureSatisfaction: {},
      };
    }

    const averageRating = metrics.reduce((sum, m) => sum + m.rating, 0) / metrics.length;

    const ratingDistribution = metrics.reduce((acc, m) => {
      acc[m.rating] = (acc[m.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const featureSatisfaction = metrics.reduce((acc, m) => {
      if (!acc[m.featureUsed]) {
        acc[m.featureUsed] = { total: 0, count: 0 };
      }
      acc[m.featureUsed].total += m.rating;
      acc[m.featureUsed].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    // Calculate average for each feature
    const featureAverages = Object.keys(featureSatisfaction).reduce((acc, feature) => {
      const data = featureSatisfaction[feature];
      acc[feature] = data.total / data.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      averageRating,
      totalResponses: metrics.length,
      ratingDistribution,
      featureSatisfaction: featureAverages,
    };
  }

  async getFeedbackByFeature(feature: string, timeRange: { start: Date; end: Date }) {
    return this.prisma.userSatisfactionMetrics.findMany({
      where: {
        featureUsed: feature,
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
        feedback: {
          not: null,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async getLowSatisfactionAlerts(threshold = 2, timeRange: { start: Date; end: Date }) {
    const lowRatings = await this.prisma.userSatisfactionMetrics.findMany({
      where: {
        rating: {
          lte: threshold,
        },
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return lowRatings.map(rating => ({
      userId: rating.userId,
      userEmail: rating.user?.email,
      userName: rating.user?.name,
      sessionId: rating.sessionId,
      rating: rating.rating,
      feature: rating.featureUsed,
      feedback: rating.feedback,
      timestamp: rating.timestamp,
    }));
  }

  async getNPSScore(timeRange: { start: Date; end: Date }): Promise<number> {
    const ratings = await this.prisma.userSatisfactionMetrics.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      select: {
        rating: true,
      },
    });

    if (ratings.length === 0) return 0;

    // Convert 1-5 scale to 0-10 scale for NPS calculation
    const npsRatings = ratings.map(r => (r.rating - 1) * 2.5);

    const promoters = npsRatings.filter(r => r >= 9).length;
    const detractors = npsRatings.filter(r => r <= 6).length;

    return ((promoters - detractors) / ratings.length) * 100;
  }

  async getSatisfactionTrends(days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyMetrics = await this.prisma.userSatisfactionMetrics.groupBy({
      by: ['timestamp'],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    // Group by day
    const trendData = dailyMetrics.reduce((acc, metric) => {
      const day = metric.timestamp.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = { totalRating: 0, count: 0 };
      }
      acc[day].totalRating += (metric._avg.rating || 0) * metric._count.rating;
      acc[day].count += metric._count.rating;
      return acc;
    }, {} as Record<string, { totalRating: number; count: number }>);

    return Object.keys(trendData).map(day => ({
      date: day,
      averageRating: trendData[day].count > 0 ? trendData[day].totalRating / trendData[day].count : 0,
      responseCount: trendData[day].count,
    }));
  }
}