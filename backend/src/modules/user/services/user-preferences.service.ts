import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../config/prisma.service';

export interface UserPreferencesDto {
  language?: string;
  timezone?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  interviewReminders?: boolean;
  practiceReminders?: boolean;
  weeklyReports?: boolean;
  theme?: string;
  audioQuality?: string;
  autoSaveResponses?: boolean;
  showConfidenceScores?: boolean;
}

export interface UserPreferencesResponse {
  id: string;
  userId: string;
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  interviewReminders: boolean;
  practiceReminders: boolean;
  weeklyReports: boolean;
  theme: string;
  audioQuality: string;
  autoSaveResponses: boolean;
  showConfidenceScores: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPreferences(userId: string): Promise<UserPreferencesResponse> {
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  async updateUserPreferences(
    userId: string,
    updates: UserPreferencesDto,
  ): Promise<UserPreferencesResponse> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate enum values
    if (updates.theme && !['light', 'dark', 'system'].includes(updates.theme)) {
      throw new Error('Invalid theme value');
    }

    if (updates.audioQuality && !['high', 'medium', 'low'].includes(updates.audioQuality)) {
      throw new Error('Invalid audio quality value');
    }

    // Check if preferences exist
    const existingPreferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (existingPreferences) {
      // Update existing preferences
      return this.prisma.userPreferences.update({
        where: { userId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new preferences with updates
      return this.prisma.userPreferences.create({
        data: {
          userId,
          ...updates,
        },
      });
    }
  }

  async resetUserPreferences(userId: string): Promise<UserPreferencesResponse> {
    // Delete existing preferences
    await this.prisma.userPreferences.deleteMany({
      where: { userId },
    });

    // Create new default preferences
    return this.createDefaultPreferences(userId);
  }

  async deleteUserPreferences(userId: string): Promise<void> {
    await this.prisma.userPreferences.deleteMany({
      where: { userId },
    });
  }

  private async createDefaultPreferences(userId: string): Promise<UserPreferencesResponse> {
    return this.prisma.userPreferences.create({
      data: {
        userId,
        language: 'en',
        timezone: 'UTC',
        emailNotifications: true,
        pushNotifications: true,
        interviewReminders: true,
        practiceReminders: true,
        weeklyReports: true,
        theme: 'light',
        audioQuality: 'high',
        autoSaveResponses: true,
        showConfidenceScores: true,
      },
    });
  }

  // Bulk operations for admin or migration purposes
  async getAllUserPreferences(limit = 100, offset = 0) {
    return this.prisma.userPreferences.findMany({
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async getUserPreferencesByLanguage(language: string) {
    return this.prisma.userPreferences.findMany({
      where: { language },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async getUserPreferencesByTimezone(timezone: string) {
    return this.prisma.userPreferences.findMany({
      where: { timezone },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  // Analytics methods
  async getPreferencesStats() {
    const [
      totalUsers,
      languageStats,
      timezoneStats,
      themeStats,
      notificationStats,
    ] = await Promise.all([
      this.prisma.userPreferences.count(),
      this.prisma.userPreferences.groupBy({
        by: ['language'],
        _count: { language: true },
      }),
      this.prisma.userPreferences.groupBy({
        by: ['timezone'],
        _count: { timezone: true },
      }),
      this.prisma.userPreferences.groupBy({
        by: ['theme'],
        _count: { theme: true },
      }),
      this.prisma.userPreferences.aggregate({
        _count: {
          emailNotifications: true,
          pushNotifications: true,
          interviewReminders: true,
          practiceReminders: true,
          weeklyReports: true,
        },
        _avg: {
          emailNotifications: true,
          pushNotifications: true,
          interviewReminders: true,
          practiceReminders: true,
          weeklyReports: true,
        },
      }),
    ]);

    return {
      totalUsers,
      languageDistribution: languageStats,
      timezoneDistribution: timezoneStats,
      themeDistribution: themeStats,
      notificationStats,
    };
  }
}