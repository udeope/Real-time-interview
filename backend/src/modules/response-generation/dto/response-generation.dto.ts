import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { JobContextDto, ExperienceDto, SkillDto, UserPreferencesDto } from '../../context-analysis/dto/context-analysis.dto';

export class GenerateResponsesDto {
  @IsString()
  question: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContextDataDto)
  context?: ContextDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuestionClassificationDto)
  questionClassification?: QuestionClassificationDto;
}

export class ContextDataDto {
  @ValidateNested()
  @Type(() => UserProfileDto)
  userProfile: UserProfileDto;

  @ValidateNested()
  @Type(() => JobContextDto)
  jobContext: JobContextDto;

  @IsArray()
  conversationHistory: ConversationInteractionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  relevantExperiences: ExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  matchingSkills: SkillDto[];

  @IsOptional()
  suggestedApproach?: any;
}

export class UserProfileDto {
  @IsString()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience: ExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills: SkillDto[];

  @IsArray()
  @IsString({ each: true })
  industries: string[];

  @IsEnum(['junior', 'mid', 'senior', 'lead'])
  seniority: 'junior' | 'mid' | 'senior' | 'lead';

  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences: UserPreferencesDto;
}

export class QuestionClassificationDto {
  @IsEnum(['technical', 'behavioral', 'situational', 'cultural'])
  type: 'technical' | 'behavioral' | 'situational' | 'cultural';

  @IsString()
  category: string;

  @IsEnum(['junior', 'mid', 'senior'])
  difficulty: 'junior' | 'mid' | 'senior';

  @IsBoolean()
  requiresSTAR: boolean;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subCategories?: string[];
}

export class ConversationInteractionDto {
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

  @IsString()
  timestamp: string;
}

export class ResponseOptionDto {
  @IsString()
  id: string;

  @IsString()
  content: string;

  @IsEnum(['STAR', 'direct', 'technical', 'storytelling'])
  structure: 'STAR' | 'direct' | 'technical' | 'storytelling';

  @IsNumber()
  @Min(0)
  estimatedDuration: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsEnum(['concise', 'detailed', 'balanced'])
  tone: 'concise' | 'detailed' | 'balanced';

  @IsOptional()
  @IsString()
  reasoning?: string;
}

export class GenerateResponsesResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponseOptionDto)
  responses: ResponseOptionDto[];

  @IsNumber()
  @Min(0)
  processingTimeMs: number;

  @IsBoolean()
  fromCache: boolean;

  @IsOptional()
  @IsString()
  cacheKey?: string;
}

export class ValidateResponseDto {
  @IsString()
  response: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDurationSeconds?: number = 90;
}

export class ResponseValidationResultDto {
  @IsBoolean()
  isValid: boolean;

  @IsNumber()
  @Min(0)
  estimatedDurationSeconds: number;

  @IsNumber()
  @Min(0)
  wordCount: number;

  @IsArray()
  @IsString({ each: true })
  issues: string[];

  @IsOptional()
  @IsString()
  optimizedResponse?: string;
}