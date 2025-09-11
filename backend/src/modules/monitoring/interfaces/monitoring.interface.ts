export interface PerformanceMetrics {
  transcriptionLatency: number;
  responseGenerationLatency: number;
  totalLatency: number;
  timestamp: Date;
  sessionId: string;
  userId: string;
}

export interface AccuracyMetrics {
  wordErrorRate: number;
  confidenceScore: number;
  transcriptionId: string;
  actualText?: string;
  transcribedText: string;
  timestamp: Date;
}

export interface UserSatisfactionMetrics {
  sessionId: string;
  userId: string;
  rating: number; // 1-5 scale
  feedback?: string;
  featureUsed: string;
  timestamp: Date;
}

export interface UsageAnalytics {
  userId: string;
  sessionId: string;
  feature: string;
  action: string;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface SystemHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  queueSize: number;
  errorRate: number;
  timestamp: Date;
}

export interface BusinessIntelligenceData {
  totalUsers: number;
  activeUsers: number;
  sessionsToday: number;
  averageSessionDuration: number;
  featureAdoption: Record<string, number>;
  conversionRate: number;
  churnRate: number;
  timestamp: Date;
}

export interface AlertThreshold {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}