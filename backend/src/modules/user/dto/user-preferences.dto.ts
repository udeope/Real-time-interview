import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  interviewReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  practiceReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyReports?: boolean;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  audioQuality?: string;

  @IsOptional()
  @IsBoolean()
  autoSaveResponses?: boolean;

  @IsOptional()
  @IsBoolean()
  showConfidenceScores?: boolean;
}

export class UserPreferencesResponseDto {
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