import { IsOptional, IsBoolean, IsString, IsIn } from 'class-validator';

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'])
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
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsString()
  @IsIn(['high', 'medium', 'low'])
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

export class AccountDeletionRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class ScheduleDeletionDto {
  @IsString()
  deletionDate: string;
}