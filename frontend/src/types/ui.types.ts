export interface TranscriptionData {
  id: string;
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
  speakerId?: string;
}

export interface ResponseOption {
  id: string;
  content: string;
  structure: 'STAR' | 'direct' | 'technical';
  estimatedDuration: number;
  confidence: number;
  tags: string[];
}

export interface JobContext {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  companyValues: string[];
  interviewType: 'technical' | 'behavioral' | 'mixed';
  seniority: string;
}

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  experience: Experience[];
  skills: Skill[];
  industries: string[];
  seniority: 'junior' | 'mid' | 'senior' | 'lead';
}

export interface Experience {
  company: string;
  role: string;
  duration: string;
  achievements: string[];
  technologies: string[];
}

export interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
}

export interface ProcessingStatus {
  isListening: boolean;
  isTranscribing: boolean;
  isGeneratingResponse: boolean;
  lastUpdate: Date;
}

export type NavigationItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current?: boolean;
};