export interface ResponseGenerationConfig {
  maxResponseLength: number;
  maxDurationSeconds: number;
  defaultResponseCount: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface STARComponent {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface ResponseTemplate {
  id: string;
  name: string;
  structure: ResponseStructure;
  template: string;
  applicableQuestionTypes: QuestionType[];
  minSeniorityLevel: SeniorityLevel;
}

export interface PersonalizationContext {
  userProfile: UserProfile;
  jobContext: JobContext;
  questionClassification: QuestionClassification;
  conversationHistory: ConversationInteraction[];
  relevantExperiences: Experience[];
  matchingSkills: Skill[];
}

export interface ResponseGenerationRequest {
  question: string;
  userId: string;
  sessionId?: string;
  context: PersonalizationContext;
  options?: ResponseGenerationOptions;
}

export interface ResponseGenerationOptions {
  responseCount?: number;
  maxDuration?: number;
  preferredTones?: ResponseTone[];
  excludeStructures?: ResponseStructure[];
  includeReasoning?: boolean;
}

export interface ResponseOption {
  id: string;
  content: string;
  structure: ResponseStructure;
  estimatedDuration: number;
  confidence: number;
  tags: string[];
  tone: ResponseTone;
  reasoning?: string;
  starComponents?: STARComponent;
}

export interface ResponseValidationResult {
  isValid: boolean;
  estimatedDurationSeconds: number;
  wordCount: number;
  issues: string[];
  optimizedResponse?: string;
}

export interface CacheEntry {
  key: string;
  responses: ResponseOption[];
  timestamp: Date;
  expiresAt: Date;
  hitCount: number;
}

export type ResponseStructure = 'STAR' | 'direct' | 'technical' | 'storytelling';
export type ResponseTone = 'concise' | 'detailed' | 'balanced';
export type QuestionType = 'technical' | 'behavioral' | 'situational' | 'cultural';
export type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'lead';

export interface UserProfile {
  userId: string;
  experience: Experience[];
  skills: Skill[];
  industries: string[];
  seniority: SeniorityLevel;
  preferences: UserPreferences;
}

export interface Experience {
  company: string;
  role: string;
  duration: string;
  achievements: string[];
  technologies: string[];
  description?: string;
}

export interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: 'technical' | 'soft' | 'language' | 'certification';
  yearsOfExperience?: number;
}

export interface UserPreferences {
  preferredResponseStyle: 'concise' | 'detailed' | 'storytelling';
  focusAreas: string[];
  avoidTopics?: string[];
  communicationStyle: 'formal' | 'casual' | 'adaptive';
}

export interface JobContext {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  companyValues: string[];
  interviewType: 'technical' | 'behavioral' | 'mixed';
  seniority: string;
  industry: string;
  location?: string;
}

export interface QuestionClassification {
  type: QuestionType;
  category: string;
  difficulty: 'junior' | 'mid' | 'senior';
  requiresSTAR: boolean;
  confidence: number;
  keywords: string[];
  subCategories?: string[];
}

export interface ConversationInteraction {
  question: string;
  response?: string;
  feedback?: number;
  duration?: number;
  timestamp: string;
}