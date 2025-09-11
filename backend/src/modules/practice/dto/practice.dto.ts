import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsBoolean, Min, Max } from 'class-validator';

export enum QuestionType {
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
  SITUATIONAL = 'situational',
  CULTURAL = 'cultural',
}

export enum DifficultyLevel {
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
}

export class CreatePracticeSessionDto {
  @IsString()
  jobTitle: string;

  @IsString()
  industry: string;

  @IsEnum(DifficultyLevel)
  difficulty: DifficultyLevel;

  @IsArray()
  @IsEnum(QuestionType, { each: true })
  questionTypes: QuestionType[];

  @IsNumber()
  @Min(1)
  @Max(20)
  questionCount: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  duration?: number;
}

export class SubmitPracticeResponseDto {
  @IsString()
  sessionId: string;

  @IsString()
  questionId: string;

  @IsString()
  response: string;

  @IsNumber()
  @Min(0)
  duration: number;

  @IsOptional()
  @IsBoolean()
  usedAISuggestions?: boolean;
}

export class PracticeQuestionDto {
  id: string;
  question: string;
  type: QuestionType;
  category: string;
  difficulty: DifficultyLevel;
  expectedStructure?: string;
  keyPoints?: string[];
  timeLimit?: number;
}

export class PracticeFeedbackDto {
  @IsNumber()
  @Min(1)
  @Max(10)
  overallScore: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  contentScore: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  structureScore: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  clarityScore: number;

  @IsString()
  feedback: string;

  @IsArray()
  @IsString({ each: true })
  strengths: string[];

  @IsArray()
  @IsString({ each: true })
  improvements: string[];

  @IsArray()
  @IsString({ each: true })
  suggestions: string[];
}

export class PracticeSessionSummaryDto {
  id: string;
  jobTitle: string;
  industry: string;
  questionsAnswered: number;
  averageScore: number;
  duration: number;
  completedAt: Date;
  achievements: string[];
  improvementAreas: string[];
}