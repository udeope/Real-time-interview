import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  password: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
}

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Profile DTOs
export class ExperienceDto {
  @IsString()
  company: string;

  @IsString()
  role: string;

  @IsString()
  duration: string;

  @IsArray()
  @IsString({ each: true })
  achievements: string[];

  @IsArray()
  @IsString({ each: true })
  technologies: string[];
}

export class SkillDto {
  @IsString()
  name: string;

  @IsString()
  level: string; // 'beginner', 'intermediate', 'advanced', 'expert'

  @IsOptional()
  @IsString()
  category?: string;
}

export class UserPreferencesDto {
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationSettings?: string[];
}

export class CreateUserProfileDto {
  @IsOptional()
  @IsEnum(['junior', 'mid', 'senior', 'lead'])
  seniority?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills?: SkillDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience?: ExperienceDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences?: UserPreferencesDto;
}

export class UpdateUserProfileDto extends CreateUserProfileDto {}

export class UserProfileResponseDto {
  id: string;
  userId: string;
  seniority?: string;
  industries?: string[];
  skills?: SkillDto[];
  experience?: ExperienceDto[];
  preferences?: UserPreferencesDto;
  createdAt: Date;
  updatedAt: Date;
}