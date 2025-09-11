import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../config/database.config';
import { SubscriptionTier, SubscriptionStatus, User, Subscription } from '@prisma/client';

interface AdminUserDto {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  createdAt: Date;
  updatedAt: Date;
  subscription?: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodEnd?: Date;
  };
  stats?: {
    totalSessions: number;
    totalPracticeSessions: number;
    lastActivity?: Date;
  };
}

interface AdminSubscriptionDto {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  user: {
    email: string;
    name: string;
  };
}

interface AdminStatsDto {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  subscriptionBreakdown: Record<SubscriptionTier, number>;
  recentActivity: {
    newUsers: number;
    newSubscriptions: number;
    canceledSubscriptions: number;
  };
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: DatabaseService) {}

  async verifyAdminAccess(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has admin privileges (you can implement your own logic here)
    // For now, we'll check if the user has an ENTERPRISE subscription and specific email domain
    const isAdmin = user.subscription?.tier === SubscriptionTier.ENTERPRISE && 
                   user.email.endsWith('@yourdomain.com'); // Replace with your admin domain

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  async getAllUsers(
    page: number = 1,
    limit: number = 50,
    search?: string,
    subscriptionTier?: SubscriptionTier,
  ): Promise<{ users: AdminUserDto[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (subscriptionTier) {
      where.subscription = {
        tier: subscriptionTier,
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          subscription: true,
          sessions: {
            select: { id: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          practiceSessions: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const adminUsers: AdminUserDto[] = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      subscription: user.subscription ? {
        tier: user.subscription.tier,
        status: user.subscription.status,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
      } : undefined,
      stats: {
        totalSessions: user.sessions.length,
        totalPracticeSessions: user.practiceSessions.length,
        lastActivity: user.sessions[0]?.createdAt,
      },
    }));

    return { users: adminUsers, total, page, limit };
  }

  async getUserDetails(userId: string): Promise<AdminUserDto & { 
    recentSessions: any[];
    usageStats: any;
    billingHistory: any[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        sessions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            interactions: {
              select: { id: true },
            },
          },
        },
        practiceSessions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        billingHistory: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        usageTracking: {
          where: {
            periodStart: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const usageStats = user.usageTracking.reduce((acc, usage) => {
      acc[usage.feature] = {
        usage: usage.usageCount,
        limit: usage.usageLimit,
        percentage: usage.usageLimit === -1 ? 0 : (usage.usageCount / usage.usageLimit) * 100,
      };
      return acc;
    }, {} as Record<string, any>);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      subscription: user.subscription ? {
        tier: user.subscription.tier,
        status: user.subscription.status,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
      } : undefined,
      stats: {
        totalSessions: user.sessions.length,
        totalPracticeSessions: user.practiceSessions.length,
        lastActivity: user.sessions[0]?.createdAt,
      },
      recentSessions: user.sessions.map(session => ({
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        interactionCount: session.interactions.length,
      })),
      usageStats,
      billingHistory: user.billingHistory.map(bill => ({
        id: bill.id,
        amount: Number(bill.amount),
        currency: bill.currency,
        status: bill.status,
        description: bill.description,
        paidAt: bill.paidAt,
        createdAt: bill.createdAt,
      })),
    };
  }

  async getAllSubscriptions(
    page: number = 1,
    limit: number = 50,
    status?: SubscriptionStatus,
    tier?: SubscriptionTier,
  ): Promise<{ subscriptions: AdminSubscriptionDto[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    if (tier) {
      where.tier = tier;
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    const adminSubscriptions: AdminSubscriptionDto[] = subscriptions.map(sub => ({
      id: sub.id,
      userId: sub.userId,
      tier: sub.tier,
      status: sub.status,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      createdAt: sub.createdAt,
      user: sub.user,
    }));

    return { subscriptions: adminSubscriptions, total, page, limit };
  }

  async getAdminStats(): Promise<AdminStatsDto> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeSubscriptions,
      subscriptionBreakdown,
      recentUsers,
      recentSubscriptions,
      canceledSubscriptions,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.subscription.groupBy({
        by: ['tier'],
        _count: { tier: true },
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.subscription.count({
        where: { 
          createdAt: { gte: thirtyDaysAgo },
          status: SubscriptionStatus.ACTIVE,
        },
      }),
      this.prisma.subscription.count({
        where: { 
          canceledAt: { gte: thirtyDaysAgo },
          status: SubscriptionStatus.CANCELED,
        },
      }),
      this.prisma.billingHistory.aggregate({
        _sum: { amount: true },
        where: { 
          status: 'SUCCEEDED',
          createdAt: { gte: new Date(now.getFullYear(), 0, 1) }, // This year
        },
      }),
    ]);

    const tierBreakdown = subscriptionBreakdown.reduce((acc, item) => {
      acc[item.tier] = item._count.tier;
      return acc;
    }, {} as Record<SubscriptionTier, number>);

    // Ensure all tiers are represented
    Object.values(SubscriptionTier).forEach(tier => {
      if (!(tier in tierBreakdown)) {
        tierBreakdown[tier] = 0;
      }
    });

    return {
      totalUsers,
      activeSubscriptions,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      subscriptionBreakdown: tierBreakdown,
      recentActivity: {
        newUsers: recentUsers,
        newSubscriptions: recentSubscriptions,
        canceledSubscriptions,
      },
    };
  }

  async updateUserSubscription(
    userId: string,
    tier: SubscriptionTier,
    status?: SubscriptionStatus,
  ): Promise<AdminSubscriptionDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let subscription: Subscription;

    if (user.subscription) {
      subscription = await this.prisma.subscription.update({
        where: { userId },
        data: {
          tier,
          status: status || user.subscription.status,
        },
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
      });
    } else {
      subscription = await this.prisma.subscription.create({
        data: {
          userId,
          tier,
          status: status || SubscriptionStatus.ACTIVE,
        },
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
      });
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      tier: subscription.tier,
      status: subscription.status,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      createdAt: subscription.createdAt,
      user: (subscription as any).user,
    };
  }

  async suspendUser(userId: string): Promise<{ success: boolean }> {
    await this.prisma.subscription.updateMany({
      where: { userId },
      data: { status: SubscriptionStatus.CANCELED },
    });

    return { success: true };
  }

  async reactivateUser(userId: string): Promise<{ success: boolean }> {
    await this.prisma.subscription.updateMany({
      where: { userId },
      data: { status: SubscriptionStatus.ACTIVE },
    });

    return { success: true };
  }
}