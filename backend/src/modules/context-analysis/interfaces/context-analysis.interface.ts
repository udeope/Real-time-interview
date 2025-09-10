export interface QuestionClassification {
  type: 'technical' | 'behavioral' | 'situational' | 'cultural';
  category: string;
  difficulty: 'junior' | 'mid' | 'senior';
  requiresSTAR: boolean;
  confidence: number;
  keywords: string[];
  subCategories?: string[];
}

export interface UserProfile {
  userId: string;
  experience: Experience[];
  skills: Skill[];
  industries: string[];
  seniority: 'junior' | 'mid' | 'senior' | 'lead';
  preferences: UserPreferences;
}

export interface Experience {
  company: string;
  role: string;
  duration: string;
  achievements: string[];
  technologies: string[];
  startDate?: Date;
  endDate?: Date;
  description?: string;
}

export interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: 'technical' | 'soft' | 'language' | 'certification';
  yearsOfExperience?: number;
  lastUsed?: Date;
}

export interface UserPreferences {
  preferredResponseStyle: 'concise' | 'detailed' | 'storytelling';
  focusAreas: string[];
  avoidTopics: string[];
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
  salary?: string;
  benefits?: string[];
}

export interface ContextData {
  userProfile: UserProfile;
  jobContext: JobContext;
  conversationHistory: ConversationContext[];
  relevantExperiences: Experience[];
  matchingSkills: Skill[];
  suggestedApproach: ResponseApproach;
}

export interface ConversationContext {
  interactionId: string;
  timestamp: Date;
  question: string;
  questionClassification: QuestionClassification;
  response?: string;
  feedback?: number;
  duration?: number;
}

export interface ResponseApproach {
  structure: 'STAR' | 'direct' | 'technical' | 'problem-solving';
  tone: 'professional' | 'enthusiastic' | 'confident' | 'analytical';
  focusPoints: string[];
  examplesNeeded: boolean;
  estimatedDuration: number;
}

export interface SkillExtraction {
  extractedSkills: Skill[];
  confidence: number;
  source: 'experience' | 'education' | 'projects' | 'certifications';
}

export interface RequirementMatch {
  requirement: string;
  matchingSkills: Skill[];
  matchingExperiences: Experience[];
  matchScore: number;
  gaps: string[];
}