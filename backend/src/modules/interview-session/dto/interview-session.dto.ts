import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsObject, 
  IsDateString, 
  IsUUID,
  ValidateNested,
  IsArray,
  IsNumber,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';

// Job Context DTOs
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companyValues?: string[];

  @IsEnum(['technical', 'behavioral', 'mixed'])
  interviewType: 'technical' | 'behavioral' | 'mixed';

  @IsString()
  seniority: string;
}

// Session Settings DTOs
export class SessionSettingsDto {
  @IsOptional()
  transcriptionEnabled?: boolean;

  @IsOptional()
  responseGeneration?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledFeatures?: string[];
}

// Create Session DTO
export class CreateInterviewSessionDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => JobContextDto)
  jobContext?: JobContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SessionSettingsDto)
  settings?: SessionSettingsDto;
}

// Update Session DTO
export class UpdateInterviewSessionDto {
  @IsOptional()
  @IsEnum(['active', 'paused', 'completed'])
  status?: 'active' | 'paused' | 'completed';

  @IsOptional()
  @ValidateNested()
  @Type(() => JobContextDto)
  jobContext?: JobContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SessionSettingsDto)
  settings?: SessionSettingsDto;

  @IsOptional()
  @IsDateString()
  endedAt?: string;
}

// Response DTOs
export class InterviewSessionResponseDto {
  id: string;
  userId: string;
  jobContext?: JobContextDto;
  status: string;
  settings?: SessionSettingsDto;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
}

export class InterviewSessionWithDetailsDto extends InterviewSessionResponseDto {
  interactions: InteractionResponseDto[];
  metrics: SessionMetricsResponseDto[];
}

// Question Classification DTO
export class QuestionClassificationDto {
  @IsEnum(['technical', 'behavioral', 'situational', 'cultural'])
  type: 'technical' | 'behavioral' | 'situational' | 'cultural';

  @IsString()
  category: string;

  @IsEnum(['junior', 'mid', 'senior'])
  difficulty: 'junior' | 'mid' | 'senior';

  @IsOptional()
  requiresSTAR?: boolean;
}

// Response Option DTO
export class ResponseOptionDto {
  @IsString()
  id: string;

  @IsString()
  content: string;

  @IsEnum(['STAR', 'direct', 'technical'])
  structure: 'STAR' | 'direct' | 'technical';

  @IsNumber()
  estimatedDuration: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

// Interaction DTOs
export class CreateInteractionDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  question: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuestionClassificationDto)
  questionClassification?: QuestionClassificationDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponseOptionDto)
  generatedResponses?: ResponseOptionDto[];

  @IsOptional()
  @IsString()
  selectedResponse?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  userFeedback?: number;
}

export class UpdateInteractionDto {
  @IsOptional()
  @IsString()
  selectedResponse?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  userFeedback?: number;
}

export class InteractionResponseDto {
  id: string;
  sessionId: string;
  question: string;
  questionClassification?: QuestionClassificationDto;
  generatedResponses?: ResponseOptionDto[];
  selectedResponse?: string;
  userFeedback?: number;
  timestamp: Date;
}

// Session Metrics DTOs
export class CreateSessionMetricsDto {
  @IsUUID()
  sessionId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transcriptionLatencyMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  responseGenerationMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalLatencyMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  transcriptionAccuracy?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  userSatisfaction?: number;
}

export class SessionMetricsResponseDto {
  id: string;
  sessionId: string;
  transcriptionLatencyMs?: number;
  responseGenerationMs?: number;
  totalLatencyMs?: number;
  transcriptionAccuracy?: number;
  userSatisfaction?: number;
  createdAt: Date;
}

// Session Analytics DTO
export class SessionAnalyticsDto {
  totalSessions: number;
  averageSessionDuration: number;
  averageLatency: number;
  averageAccuracy: number;
  averageSatisfaction: number;
  mostCommonQuestionTypes: { type: string; count: number }[];
  performanceTrends: { date: string; metrics: any }[];
}