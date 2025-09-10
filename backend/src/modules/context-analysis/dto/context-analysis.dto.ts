import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ClassifyQuestionDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => JobContextDto)
  jobContext?: JobContextDto;
}

export class JobContextDto {
  @IsString()
  title: string;

  @IsString()
  company: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  requirements: string[];

  @IsArray()
  @IsString({ each: true })
  companyValues: string[];

  @IsEnum(['technical', 'behavioral', 'mixed'])
  interviewType: 'technical' | 'behavioral' | 'mixed';

  @IsString()
  seniority: string;

  @IsString()
  industry: string;

  @IsOptional()
  @IsString()
  location?: string;
}

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

  @IsOptional()
  @IsString()
  description?: string;
}

export class SkillDto {
  @IsString()
  name: string;

  @IsEnum(['beginner', 'intermediate', 'advanced', 'expert'])
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  @IsEnum(['technical', 'soft', 'language', 'certification'])
  category: 'technical' | 'soft' | 'language' | 'certification';

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;
}

export class UserPreferencesDto {
  @IsEnum(['concise', 'detailed', 'storytelling'])
  preferredResponseStyle: 'concise' | 'detailed' | 'storytelling';

  @IsArray()
  @IsString({ each: true })
  focusAreas: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidTopics?: string[];

  @IsEnum(['formal', 'casual', 'adaptive'])
  communicationStyle: 'formal' | 'casual' | 'adaptive';
}

export class UpdateConversationHistoryDto {
  @IsString()
  sessionId: string;

  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  response?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  feedback?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}

export class GetRelevantContextDto {
  @IsString()
  userId: string;

  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => JobContextDto)
  jobContext?: JobContextDto;
}

export class QuestionClassificationResponseDto {
  type: 'technical' | 'behavioral' | 'situational' | 'cultural';
  category: string;
  difficulty: 'junior' | 'mid' | 'senior';
  requiresSTAR: boolean;
  confidence: number;
  keywords: string[];
  subCategories?: string[];
}

export class ContextDataResponseDto {
  userProfile: any;
  jobContext: JobContextDto;
  conversationHistory: any[];
  relevantExperiences: ExperienceDto[];
  matchingSkills: SkillDto[];
  suggestedApproach: any;
}