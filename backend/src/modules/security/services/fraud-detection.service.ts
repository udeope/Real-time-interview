import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';
import { AuditService, AuditAction } from './audit.service';

export interface UsagePatternData {
  sessionCount?: number;
  audioMinutes?: number;
  apiCalls?: number;
  timeWindow?: string;
  ipAddresses?: string[];
  userAgents?: string[];
  locations?: string[];
  [key: string]: any;
}

export interface FraudAlert {
  userId: string;
  patternType: string;
  riskScore: number;
  reason: string;
  data: UsagePatternData;
  timestamp: Date;
}

export enum PatternType {
  SESSION_FREQUENCY = 'session_frequency',
  AUDIO_VOLUME = 'audio_volume',
  API_USAGE = 'api_usage',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  LOCATION_ANOMALY = 'location_anomaly',
  DEVICE_ANOMALY = 'device_anomaly',
  TIME_ANOMALY = 'time_anomaly',
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  
  // Risk score thresholds
  private readonly riskThresholds = {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80,
    CRITICAL: 95,
  };

  // Usage limits for different subscription tiers
  private readonly usageLimits = {
    free: {
      sessionsPerDay: 5,
      audioMinutesPerDay: 60,
      apiCallsPerHour: 100,
    },
    pro: {
      sessionsPerDay: 50,
      audioMinutesPerDay: 600,
      apiCallsPerHour: 1000,
    },
    enterprise: {
      sessionsPerDay: 500,
      audioMinutesPerDay: 6000,
      apiCallsPerHour: 10000,
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Analyze user usage patterns and detect potential fraud
   */
  async analyzeUserActivity(userId: string): Promise<FraudAlert[]> {
    const alerts: FraudAlert[] = [];

    try {
      // Get user subscription tier
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      });

      if (!user) {
        return alerts;
      }

      // Analyze different pattern types
      const sessionFrequencyAlert = await this.analyzeSessionFrequency(userId, user.subscriptionTier);
      if (sessionFrequencyAlert) alerts.push(sessionFrequencyAlert);

      const audioVolumeAlert = await this.analyzeAudioVolume(userId, user.subscriptionTier);
      if (audioVolumeAlert) alerts.push(audioVolumeAlert);

      const apiUsageAlert = await this.analyzeApiUsage(userId, user.subscriptionTier);
      if (apiUsageAlert) alerts.push(apiUsageAlert);

      const locationAlert = await this.analyzeLocationAnomaly(userId);
      if (locationAlert) alerts.push(locationAlert);

      const deviceAlert = await this.analyzeDeviceAnomaly(userId);
      if (deviceAlert) alerts.push(deviceAlert);

      const timeAlert = await this.analyzeTimeAnomaly(userId);
      if (timeAlert) alerts.push(timeAlert);

      // Store patterns and alerts
      for (const alert of alerts) {
        await this.storeUsagePattern(alert);
      }

      return alerts;
    } catch (error) {
      this.logger.error(`Failed to analyze user activity: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze session frequency patterns
   */
  private async analyzeSessionFrequency(userId: string, subscriptionTier: string): Promise<FraudAlert | null> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const sessionCount = await this.prisma.interviewSession.count({
      where: {
        userId,
        createdAt: {
          gte: oneDayAgo,
        },
      },
    });

    const limit = this.usageLimits[subscriptionTier]?.sessionsPerDay || this.usageLimits.free.sessionsPerDay;
    const riskScore = Math.min(100, (sessionCount / limit) * 100);

    if (riskScore > this.riskThresholds.MEDIUM) {
      return {
        userId,
        patternType: PatternType.SESSION_FREQUENCY,
        riskScore,
        reason: `Excessive session creation: ${sessionCount} sessions in 24h (limit: ${limit})`,
        data: {
          sessionCount,
          timeWindow: '24h',
        },
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Analyze audio volume patterns
   */
  private async analyzeAudioVolume(userId: string, subscriptionTier: string): Promise<FraudAlert | null> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Calculate total audio minutes from sessions
    const sessions = await this.prisma.interviewSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: oneDayAgo,
        },
        endedAt: {
          not: null,
        },
      },
      select: {
        startedAt: true,
        endedAt: true,
      },
    });

    const totalMinutes = sessions.reduce((total, session) => {
      if (session.endedAt) {
        const duration = (session.endedAt.getTime() - session.startedAt.getTime()) / (1000 * 60);
        return total + duration;
      }
      return total;
    }, 0);

    const limit = this.usageLimits[subscriptionTier]?.audioMinutesPerDay || this.usageLimits.free.audioMinutesPerDay;
    const riskScore = Math.min(100, (totalMinutes / limit) * 100);

    if (riskScore > this.riskThresholds.MEDIUM) {
      return {
        userId,
        patternType: PatternType.AUDIO_VOLUME,
        riskScore,
        reason: `Excessive audio usage: ${Math.round(totalMinutes)} minutes in 24h (limit: ${limit})`,
        data: {
          audioMinutes: Math.round(totalMinutes),
          timeWindow: '24h',
        },
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Analyze API usage patterns
   */
  private async analyzeApiUsage(userId: string, subscriptionTier: string): Promise<FraudAlert | null> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Count API calls from audit logs
    const apiCalls = await this.prisma.auditLog.count({
      where: {
        userId,
        createdAt: {
          gte: oneHourAgo,
        },
        action: {
          in: ['transcription_start', 'response_generation', 'audio_upload'],
        },
      },
    });

    const limit = this.usageLimits[subscriptionTier]?.apiCallsPerHour || this.usageLimits.free.apiCallsPerHour;
    const riskScore = Math.min(100, (apiCalls / limit) * 100);

    if (riskScore > this.riskThresholds.HIGH) {
      return {
        userId,
        patternType: PatternType.API_USAGE,
        riskScore,
        reason: `Excessive API usage: ${apiCalls} calls in 1h (limit: ${limit})`,
        data: {
          apiCalls,
          timeWindow: '1h',
        },
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Analyze location anomalies
   */
  private async analyzeLocationAnomaly(userId: string): Promise<FraudAlert | null> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get recent IP addresses from audit logs
    const recentLogs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo,
        },
        ipAddress: {
          not: null,
        },
      },
      select: {
        ipAddress: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const uniqueIPs = [...new Set(recentLogs.map(log => log.ipAddress))];
    
    // Flag if user is accessing from many different IPs
    if (uniqueIPs.length > 10) {
      return {
        userId,
        patternType: PatternType.LOCATION_ANOMALY,
        riskScore: Math.min(100, uniqueIPs.length * 8),
        reason: `Multiple IP addresses detected: ${uniqueIPs.length} unique IPs in 7 days`,
        data: {
          ipAddresses: uniqueIPs,
          timeWindow: '7d',
        },
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Analyze device anomalies
   */
  private async analyzeDeviceAnomaly(userId: string): Promise<FraudAlert | null> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get recent user agents from audit logs
    const recentLogs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo,
        },
        userAgent: {
          not: null,
        },
      },
      select: {
        userAgent: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const uniqueUserAgents = [...new Set(recentLogs.map(log => log.userAgent))];
    
    // Flag if user is accessing from many different devices/browsers
    if (uniqueUserAgents.length > 5) {
      return {
        userId,
        patternType: PatternType.DEVICE_ANOMALY,
        riskScore: Math.min(100, uniqueUserAgents.length * 15),
        reason: `Multiple devices detected: ${uniqueUserAgents.length} unique user agents in 7 days`,
        data: {
          userAgents: uniqueUserAgents,
          timeWindow: '7d',
        },
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Analyze time-based anomalies
   */
  private async analyzeTimeAnomaly(userId: string): Promise<FraudAlert | null> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get recent activity times
    const recentLogs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Analyze activity patterns (24/7 activity might be suspicious)
    const hourlyActivity = new Array(24).fill(0);
    recentLogs.forEach(log => {
      const hour = log.createdAt.getHours();
      hourlyActivity[hour]++;
    });

    const activeHours = hourlyActivity.filter(count => count > 0).length;
    
    // Flag if user is active during unusual hours (e.g., 20+ hours per day)
    if (activeHours > 20 && recentLogs.length > 50) {
      return {
        userId,
        patternType: PatternType.TIME_ANOMALY,
        riskScore: Math.min(100, (activeHours / 24) * 100),
        reason: `Unusual activity pattern: active ${activeHours}/24 hours with ${recentLogs.length} actions`,
        data: {
          activeHours,
          totalActions: recentLogs.length,
          timeWindow: '7d',
        },
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Store usage pattern in database
   */
  private async storeUsagePattern(alert: FraudAlert): Promise<void> {
    try {
      await this.prisma.usagePattern.create({
        data: {
          userId: alert.userId,
          patternType: alert.patternType,
          patternData: alert.data,
          riskScore: alert.riskScore,
          flagged: alert.riskScore > this.riskThresholds.HIGH,
          flaggedReason: alert.reason,
        },
      });

      // Log security event if high risk
      if (alert.riskScore > this.riskThresholds.HIGH) {
        await this.auditService.logSecurity(
          AuditAction.SUSPICIOUS_ACTIVITY,
          alert.userId,
          {
            patternType: alert.patternType,
            riskScore: alert.riskScore,
            reason: alert.reason,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to store usage pattern: ${error.message}`);
    }
  }

  /**
   * Get flagged users for review
   */
  async getFlaggedUsers(limit = 50): Promise<any[]> {
    return this.prisma.usagePattern.findMany({
      where: {
        flagged: true,
        reviewed: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            subscriptionTier: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        riskScore: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Mark pattern as reviewed
   */
  async markAsReviewed(patternId: string, reviewedBy: string, notes?: string): Promise<void> {
    await this.prisma.usagePattern.update({
      where: { id: patternId },
      data: {
        reviewed: true,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Get user risk score
   */
  async getUserRiskScore(userId: string): Promise<number> {
    const recentPatterns = await this.prisma.usagePattern.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: {
        riskScore: true,
      },
    });

    if (recentPatterns.length === 0) {
      return 0;
    }

    // Calculate weighted average risk score
    const totalScore = recentPatterns.reduce((sum, pattern) => sum + pattern.riskScore.toNumber(), 0);
    return Math.round(totalScore / recentPatterns.length);
  }

  /**
   * Check if user should be blocked
   */
  async shouldBlockUser(userId: string): Promise<boolean> {
    const riskScore = await this.getUserRiskScore(userId);
    return riskScore > this.riskThresholds.CRITICAL;
  }
}