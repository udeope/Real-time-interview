import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.config';
import { BusinessIntelligenceData, UsageAnalytics } from '../interfaces/monitoring.interface';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: DatabaseService) {}

  async trackFeatureUsage(
    userId: string,
    sessionId: string,
    feature: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const analytics: UsageAnalytics = {
      userId,
      sessionId,
      feature,
      action,
      metadata,
      timestamp: new Date(),
    };

    try {
      await this.prisma.usageAnalytics.create({
        data: analytics,
      });
    } catch (error) {
      this.logger.error('Failed to track feature usage', error);
    }
  }

  async trackSessionDuration(
    sessionId: string,
    userId: string,
    duration: number
  ): Promise<void> {
    await this.trackFeatureUsage(
      userId,
      sessionId,
      'session',
      'duration',
      { duration }
    );
  }

  async getFeatureAdoptionMetrics(timeRange: { start: Date; end: Date }) {
    const featureUsage = await this.prisma.usageAnalytics.groupBy({
      by: ['feature'],
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _count: {
        feature: true,
      },
    });

    const totalUsers = await this.prisma.usageAnalytics.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      distinct: ['userId'],
      select: { userId: true },
    });

    const adoption = featureUsage.reduce((acc, item) => {
      acc[item.feature] = {
        usage: item._count.feature,
        adoptionRate: (item._count.feature / totalUsers.length) * 100,
      };
      return acc;
    }, {} as Record<string, { usage: number; adoptionRate: number }>);

    return adoption;
  }

  async getUserEngagementMetrics(timeRange: { start: Date; end: Date }) {
    // Daily Active Users
    const dailyActiveUsers = await this.prisma.usageAnalytics.groupBy({
      by: ['userId'],
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _count: {
        userId: true,
      },
    });

    // Session metrics
    const sessionMetrics = await this.prisma.interviewSession.aggregate({
      where: {
        createdAt: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _count: {
        id: true,
      },
    });

    return {
      dailyActiveUsers: dailyActiveUsers.length,
      totalSessions: sessionMetrics._count.id,
      averageSessionDuration: 0, // Would calculate from session start/end times
    };
  }

  async getConversionMetrics(timeRange: { start: Date; end: Date }) {
    // Users who registered
    const registeredUsers = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
    });

    // Users who completed their first session
    const activeUsers = await this.prisma.interviewSession.findMany({
      where: {
        createdAt: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      distinct: ['userId'],
      select: { userId: true },
    });

    const conversionRate = registeredUsers > 0 ? (activeUsers.length / registeredUsers) * 100 : 0;

    return {
      registeredUsers,
      activeUsers: activeUsers.length,
      conversionRate,
    };
  }

  async generateBusinessIntelligenceReport(timeRange: { start: Date; end: Date }): Promise<BusinessIntelligenceData> {
    try {
      const [
        totalUsers,
        engagementMetrics,
        conversionMetrics,
        featureAdoption,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.getUserEngagementMetrics(timeRange),
        this.getConversionMetrics(timeRange),
        this.getFeatureAdoptionMetrics(timeRange),
      ]);

      // Calculate churn rate (simplified - users who haven't been active in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentlyActiveUsers = await this.prisma.usageAnalytics.findMany({
        where: {
          timestamp: {
            gte: thirtyDaysAgo,
          },
        },
        distinct: ['userId'],
        select: { userId: true },
      });

      const churnRate = totalUsers > 0 ? ((totalUsers - recentlyActiveUsers.length) / totalUsers) * 100 : 0;

      const featureAdoptionSimplified = Object.keys(featureAdoption).reduce((acc, key) => {
        acc[key] = featureAdoption[key].adoptionRate;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalUsers,
        activeUsers: engagementMetrics.dailyActiveUsers,
        sessionsToday: engagementMetrics.totalSessions,
        averageSessionDuration: engagementMetrics.averageSessionDuration,
        featureAdoption: featureAdoptionSimplified,
        conversionRate: conversionMetrics.conversionRate,
        churnRate,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to generate BI report', error);
      throw error;
    }
  }

  async getTopFeatures(timeRange: { start: Date; end: Date }, limit = 10) {
    return this.prisma.usageAnalytics.groupBy({
      by: ['feature', 'action'],
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _count: {
        feature: true,
      },
      orderBy: {
        _count: {
          feature: 'desc',
        },
      },
      take: limit,
    });
  }

  async getUserJourney(userId: string, timeRange: { start: Date; end: Date }) {
    return this.prisma.usageAnalytics.findMany({
      where: {
        userId,
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }
}