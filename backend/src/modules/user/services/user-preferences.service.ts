import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../config/database.config';
import { UpdateUserPreferencesDto, UserPreferencesResponseDto } from '../dto/user-preferences.dto';
import { UserPreferences } from '@prisma/client';

@Injectable()
export class UserPreferencesService {
  constructor(private readonly prisma: DatabaseService) {}

  async getUserPreferences(userId: string): Promise<UserPreferencesResponseDto> {
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return this.mapToResponseDto(preferences);
  }

  async updateUserPreferences(
    userId: string,
    updateDto: UpdateUserPreferencesDto,
  ): Promise<UserPreferencesResponseDto> {
    // Ensure preferences exist
    await this.getUserPreferences(userId);

    const updatedPreferences = await this.prisma.userPreferences.update({
      where: { userId },
      data: updateDto,
    });

    return this.mapToResponseDto(updatedPreferences);
  }

  async resetUserPreferences(userId: string): Promise<UserPreferencesResponseDto> {
    // Delete existing preferences
    await this.prisma.userPreferences.deleteMany({
      where: { userId },
    });

    // Create new default preferences
    const preferences = await this.createDefaultPreferences(userId);
    return this.mapToResponseDto(preferences);
  }

  private async createDefaultPreferences(userId: string): Promise<UserPreferences> {
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

  private mapToResponseDto(preferences: UserPreferences): UserPreferencesResponseDto {
    return {
      id: preferences.id,
      userId: preferences.userId,
      language: preferences.language,
      timezone: preferences.timezone,
      emailNotifications: preferences.emailNotifications,
      pushNotifications: preferences.pushNotifications,
      interviewReminders: preferences.interviewReminders,
      practiceReminders: preferences.practiceReminders,
      weeklyReports: preferences.weeklyReports,
      theme: preferences.theme,
      audioQuality: preferences.audioQuality,
      autoSaveResponses: preferences.autoSaveResponses,
      showConfidenceScores: preferences.showConfidenceScores,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    };
  }
}