import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.config';
import { SubscriptionTier } from '@prisma/client';

interface UsageLimits {
  monthly_sessions: number;
  session_duration_minutes: number;
  ai_responses_per_session: number;
  practice_sessions: number;
  export_requests: number;
  integrations: number;
}

@Injectable()
export class UsageTrackingService {
  private readonly defaultLimits: Record<SubscriptionTier, UsageLimits> = {
    [SubscriptionTier.FREE]: {
      monthly_sessions: 5,
      session_duration_minutes: 30,
      ai_responses_per_session: 10,
      practice_sessions: 3,
      export_requests: 1,
      integrations: 0,
    },
    [SubscriptionTier.PRO]: {
      monthly_sessions: 50,
      session_duration_minutes: 120,
      ai_responses_per_session: -1, // Unlimited
      practice_sessions: 25,
      export_requests: 10,
      integrations: 3,
    },
    [SubscriptionTier.ENTERPRISE]: {
      monthly_sessions: -1, // Unlimited
      session_duration_minutes: -1, // Unlimited
      ai_responses_per_session: -1, // Unlimited
      practice_sessions: -1, // Unlimited
      export_requests: -1, // Unlimited
      integrations: -1, // Unlimited
    },
  };

  constructor(private readonly prisma: DatabaseService) {}

  async initializeUsageTracking(subscriptionId: string, userId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const limits = this.defaultLimits[subscription.tier];
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Create usage tracking records for each feature
    const features = Object.keys(limits);
    
    for (const feature of features) {
      await this.prisma.usageTracking.upsert({
        where: {
          userId_feature_periodStart: {
            userId,
            feature,
            periodStart,
          },
        },
        update: {
          usageLimit: limits[feature as keyof UsageLimits],
          periodEnd,
        },
        create: {
          userId,
          subscriptionId,
          feature,
          usageCount: 0,
          usageLimit: limits[feature as keyof UsageLimits],
          periodStart,
          periodEnd,
        },
      });
    }
  }

  async trackUsage(userId: string, feature: string, increment: number = 1): Promise<void> {
    const currentPeriod = this.getCurrentPeriod();
    
    await this.prisma.usageTracking.upsert({
      where: {
        userId_feature_periodStart: {
          userId,
          feature,
          periodStart: currentPeriod.start,
        },
      },
      update: {
        usageCount: {
          increment,
        },
      },
      create: {
        userId,
        subscriptionId: await this.getSubscriptionId(userId),
        feature,
        usageCount: increment,
        usageLimit: await this.getFeatureLimit(userId, feature),
        periodStart: currentPeriod.start,
        periodEnd: currentPeriod.end,
      },
    });
  }

  async checkUsageLimit(userId: string, feature: string): Promise<{ allowed: boolean; usage: number; limit: number }> {
    const currentPeriod = this.getCurrentPeriod();
    
    const usageRecord = await this.prisma.usageTracking.findUnique({
      where: {
        userId_feature_periodStart: {
          userId,
          feature,
          periodStart: currentPeriod.start,
        },
      },
    });

    if (!usageRecord) {
      // Initialize usage tracking if not exists
      const limit = await this.getFeatureLimit(userId, feature);
      await this.trackUsage(userId, feature, 0);
      return { allowed: true, usage: 0, limit };
    }

    const limit = usageRecord.usageLimit || 0;
    const usage = usageRecord.usageCount;
    
    // -1 means unlimited
    const allowed = limit === -1 || usage < limit;

    return { allowed, usage, limit };
  }

  async getUsageStats(userId: string): Promise<Record<string, { usage: number; limit: number; percentage: number }>> {
    const currentPeriod = this.getCurrentPeriod();
    
    const usageRecords = await this.prisma.usageTracking.findMany({
      where: {
        userId,
        periodStart: currentPeriod.start,
      },
    });

    const stats: Record<string, { usage: number; limit: number; percentage: number }> = {};

    for (const record of usageRecords) {
      const usage = record.usageCount;
      const limit = record.usageLimit || 0;
      const percentage = limit === -1 ? 0 : (usage / limit) * 100;

      stats[record.feature] = {
        usage,
        limit,
        percentage: Math.min(percentage, 100),
      };
    }

    return stats;
  }

  async updateUsageLimits(subscriptionId: string, newTier: SubscriptionTier): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newLimits = this.defaultLimits[newTier];
    const currentPeriod = this.getCurrentPeriod();

    // Update all usage tracking records for the current period
    for (const [feature, limit] of Object.entries(newLimits)) {
      await this.prisma.usageTracking.updateMany({
        where: {
          userId: subscription.userId,
          feature,
          periodStart: currentPeriod.start,
        },
        data: {
          usageLimit: limit,
        },
      });
    }
  }

  async resetMonthlyUsage(): Promise<void> {
    // This method should be called by a cron job at the beginning of each month
    const previousPeriod = this.getPreviousPeriod();
    const currentPeriod = this.getCurrentPeriod();

    // Get all active subscriptions
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
      },
    });

    for (const subscription of subscriptions) {
      const limits = this.defaultLimits[subscription.tier];
      
      // Create new usage tracking records for the current period
      for (const [feature, limit] of Object.entries(limits)) {
        await this.prisma.usageTracking.create({
          data: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            feature,
            usageCount: 0,
            usageLimit: limit,
            periodStart: currentPeriod.start,
            periodEnd: currentPeriod.end,
          },
        });
      }
    }

    // Clean up old usage records (older than 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    await this.prisma.usageTracking.deleteMany({
      where: {
        periodStart: {
          lt: twelveMonthsAgo,
        },
      },
    });
  }

  private getCurrentPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    return { start, end };
  }

  private getPreviousPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return { start, end };
  }

  private async getSubscriptionId(userId: string): Promise<string> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return subscription.id;
  }

  private async getFeatureLimit(userId: string, feature: string): Promise<number> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return this.defaultLimits[SubscriptionTier.FREE][feature as keyof UsageLimits] || 0;
    }

    return this.defaultLimits[subscription.tier][feature as keyof UsageLimits] || 0;
  }
}