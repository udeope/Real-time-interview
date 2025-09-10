import { User, UserProfile, InterviewSession, Interaction, SessionMetrics } from '@prisma/client';

// Extended types with relations
export type UserWithProfile = User & {
  profile?: UserProfile;
};

export type UserWithSessions = User & {
  sessions: InterviewSession[];
};

export type InterviewSessionWithDetails = InterviewSession & {
  user: User;
  interactions: Interaction[];
  metrics: SessionMetrics[];
};

export type InteractionWithSession = Interaction & {
  session: InterviewSession;
};

// Database configuration types
export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
  logQueries?: boolean;
}

export interface RedisConfig {
  url: string;
  maxRetries?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number;
}

// Cache configuration
export interface CacheConfig {
  defaultTTL: number;
  sessionTTL: number;
  responseTTL: number;
  contextTTL: number;
}

// Query filter types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface UserFilters extends PaginationOptions {
  email?: string;
  subscriptionTier?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface SessionFilters extends PaginationOptions {
  userId?: string;
  status?: string;
  startedAfter?: Date;
  startedBefore?: Date;
  jobTitle?: string;
  company?: string;
}

export interface InteractionFilters extends PaginationOptions {
  sessionId?: string;
  questionType?: string;
  hasUserFeedback?: boolean;
  feedbackRating?: number;
}

// Repository response types
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HealthCheckResult {
  database: boolean;
  redis: boolean;
  timestamp: Date;
}

// Database operation results
export interface CreateResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UpdateResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  affected: number;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
  affected: number;
}