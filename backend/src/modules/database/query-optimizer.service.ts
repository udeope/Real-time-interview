import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { performance } from 'perf_hooks';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  resultCount?: number;
  parameters?: any;
}

interface OptimizationSuggestion {
  query: string;
  issue: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImprovement: string;
}

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);
  private queryMetrics: QueryMetrics[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly MAX_METRICS_HISTORY = 10000;

  constructor(private prisma: PrismaService) {}

  /**
   * Wrap a Prisma query with performance monitoring
   */
  async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    parameters?: any
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordQueryMetric({
        query: queryName,
        duration,
        timestamp: new Date(),
        resultCount: Array.isArray(result) ? result.length : 1,
        parameters
      });
      
      if (duration > this.SLOW_QUERY_THRESHOLD) {
        this.logger.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordQueryMetric({
        query: queryName,
        duration,
        timestamp: new Date(),
        parameters
      });
      
      this.logger.error(`Query failed: ${queryName} after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  /**
   * Optimized user queries with proper indexing
   */
  async findUserWithProfile(userId: string) {
    return this.measureQuery(
      'findUserWithProfile',
      () => this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            select: {
              seniority: true,
              skills: true,
              industries: true,
              experience: true,
              preferences: true
            }
          }
        }
      }),
      { userId }
    );
  }

  /**
   * Optimized session queries with pagination and filtering
   */
  async findUserSessions(
    userId: string,
    options: {
      status?: string[];
      limit?: number;
      offset?: number;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    const { status, limit = 50, offset = 0, dateFrom, dateTo } = options;
    
    return this.measureQuery(
      'findUserSessions',
      () => this.prisma.interviewSession.findMany({
        where: {
          userId,
          ...(status && { status: { in: status } }),
          ...(dateFrom && dateTo && {
            startedAt: {
              gte: dateFrom,
              lte: dateTo
            }
          })
        },
        select: {
          id: true,
          status: true,
          startedAt: true,
          endedAt: true,
          jobContext: true,
          _count: {
            select: {
              interactions: true
            }
          }
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset
      }),
      { userId, status, limit, offset, dateFrom, dateTo }
    );
  }

  /**
   * Optimized interaction queries with aggregation
   */
  async findSessionInteractions(
    sessionId: string,
    options: {
      limit?: number;
      includeResponses?: boolean;
      questionTypes?: string[];
    } = {}
  ) {
    const { limit = 100, includeResponses = false, questionTypes } = options;
    
    return this.measureQuery(
      'findSessionInteractions',
      () => this.prisma.interaction.findMany({
        where: {
          sessionId,
          ...(questionTypes && {
            questionClassification: {
              path: ['type'],
              in: questionTypes
            }
          })
        },
        select: {
          id: true,
          question: true,
          questionClassification: true,
          timestamp: true,
          userFeedback: true,
          ...(includeResponses && {
            generatedResponses: true,
            selectedResponse: true
          })
        },
        orderBy: { timestamp: 'asc' },
        take: limit
      }),
      { sessionId, limit, includeResponses, questionTypes }
    );
  }

  /**
   * Optimized analytics queries with proper aggregation
   */
  async getPerformanceMetrics(
    userId?: string,
    dateRange?: { from: Date; to: Date }
  ) {
    return this.measureQuery(
      'getPerformanceMetrics',
      async () => {
        const whereClause = {
          ...(userId && {
            session: {
              userId
            }
          }),
          ...(dateRange && {
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to
            }
          })
        };

        const [avgMetrics, totalSessions, recentTrends] = await Promise.all([
          // Average metrics
          this.prisma.sessionMetrics.aggregate({
            where: whereClause,
            _avg: {
              transcriptionLatencyMs: true,
              responseGenerationMs: true,
              totalLatencyMs: true,
              transcriptionAccuracy: true
            },
            _count: {
              id: true
            }
          }),

          // Total sessions count
          this.prisma.interviewSession.count({
            where: {
              ...(userId && { userId }),
              ...(dateRange && {
                startedAt: {
                  gte: dateRange.from,
                  lte: dateRange.to
                }
              })
            }
          }),

          // Recent performance trends (last 7 days)
          this.prisma.sessionMetrics.groupBy({
            by: ['createdAt'],
            where: {
              ...whereClause,
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              }
            },
            _avg: {
              totalLatencyMs: true,
              transcriptionAccuracy: true
            },
            orderBy: {
              createdAt: 'asc'
            }
          })
        ]);

        return {
          averageMetrics: avgMetrics,
          totalSessions,
          recentTrends
        };
      },
      { userId, dateRange }
    );
  }

  /**
   * Optimized search queries with full-text search
   */
  async searchInteractions(
    searchQuery: string,
    options: {
      userId?: string;
      sessionId?: string;
      limit?: number;
      questionTypes?: string[];
    } = {}
  ) {
    const { userId, sessionId, limit = 50, questionTypes } = options;
    
    return this.measureQuery(
      'searchInteractions',
      () => this.prisma.$queryRaw`
        SELECT 
          i.id,
          i.question,
          i.selected_response,
          i.timestamp,
          i.question_classification,
          s.id as session_id,
          s.user_id,
          ts_rank(to_tsvector('english', i.question), plainto_tsquery('english', ${searchQuery})) as rank
        FROM interactions i
        JOIN interview_sessions s ON i.session_id = s.id
        WHERE 
          to_tsvector('english', i.question) @@ plainto_tsquery('english', ${searchQuery})
          ${userId ? `AND s.user_id = ${userId}` : ''}
          ${sessionId ? `AND i.session_id = ${sessionId}` : ''}
          ${questionTypes ? `AND i.question_classification->>'type' = ANY(${questionTypes})` : ''}
        ORDER BY rank DESC, i.timestamp DESC
        LIMIT ${limit}
      `,
      { searchQuery, userId, sessionId, limit, questionTypes }
    );
  }

  /**
   * Batch operations for better performance
   */
  async batchCreateInteractions(interactions: any[]) {
    return this.measureQuery(
      'batchCreateInteractions',
      () => this.prisma.interaction.createMany({
        data: interactions,
        skipDuplicates: true
      }),
      { count: interactions.length }
    );
  }

  /**
   * Optimized cache queries
   */
  async findCachedResponse(questionHash: string, contextHash: string) {
    return this.measureQuery(
      'findCachedResponse',
      () => this.prisma.responseCache.findFirst({
        where: {
          questionHash,
          contextHash,
          expiresAt: {
            gt: new Date()
          }
        },
        select: {
          responseData: true,
          createdAt: true
        }
      }),
      { questionHash, contextHash }
    );
  }

  /**
   * Connection pooling optimization
   */
  async executeInTransaction<T>(operations: (tx: any) => Promise<T>): Promise<T> {
    return this.measureQuery(
      'transaction',
      () => this.prisma.$transaction(operations, {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      })
    );
  }

  /**
   * Record query metrics for analysis
   */
  private recordQueryMetric(metric: QueryMetrics) {
    this.queryMetrics.push(metric);
    
    // Keep only recent metrics to prevent memory issues
    if (this.queryMetrics.length > this.MAX_METRICS_HISTORY) {
      this.queryMetrics = this.queryMetrics.slice(-this.MAX_METRICS_HISTORY / 2);
    }
  }

  /**
   * Analyze query performance and generate optimization suggestions
   */
  analyzeQueryPerformance(): {
    slowQueries: QueryMetrics[];
    suggestions: OptimizationSuggestion[];
    summary: {
      totalQueries: number;
      averageDuration: number;
      slowQueryCount: number;
      slowQueryPercentage: number;
    };
  } {
    const slowQueries = this.queryMetrics.filter(
      metric => metric.duration > this.SLOW_QUERY_THRESHOLD
    );

    const totalDuration = this.queryMetrics.reduce(
      (sum, metric) => sum + metric.duration, 0
    );

    const summary = {
      totalQueries: this.queryMetrics.length,
      averageDuration: this.queryMetrics.length > 0 ? totalDuration / this.queryMetrics.length : 0,
      slowQueryCount: slowQueries.length,
      slowQueryPercentage: this.queryMetrics.length > 0 
        ? (slowQueries.length / this.queryMetrics.length) * 100 
        : 0
    };

    const suggestions = this.generateOptimizationSuggestions(slowQueries);

    return {
      slowQueries: slowQueries.slice(-20), // Last 20 slow queries
      suggestions,
      summary
    };
  }

  /**
   * Generate optimization suggestions based on query patterns
   */
  private generateOptimizationSuggestions(slowQueries: QueryMetrics[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const queryFrequency = new Map<string, number>();

    // Count query frequency
    slowQueries.forEach(metric => {
      queryFrequency.set(metric.query, (queryFrequency.get(metric.query) || 0) + 1);
    });

    // Generate suggestions for frequent slow queries
    for (const [queryName, frequency] of queryFrequency) {
      if (frequency >= 5) {
        suggestions.push({
          query: queryName,
          issue: `Query executed ${frequency} times with slow performance`,
          suggestion: this.getSuggestionForQuery(queryName),
          priority: frequency >= 10 ? 'high' : 'medium',
          estimatedImprovement: '30-70% faster execution'
        });
      }
    }

    return suggestions;
  }

  /**
   * Get specific optimization suggestions for different query types
   */
  private getSuggestionForQuery(queryName: string): string {
    const suggestions = {
      findUserWithProfile: 'Consider caching user profiles or using partial selection',
      findUserSessions: 'Add composite index on (user_id, status, started_at)',
      findSessionInteractions: 'Implement pagination and consider archiving old interactions',
      getPerformanceMetrics: 'Use materialized views for complex aggregations',
      searchInteractions: 'Optimize full-text search indexes and consider search engine integration',
      batchCreateInteractions: 'Increase batch size or use bulk insert operations',
      findCachedResponse: 'Optimize cache key structure and TTL settings'
    };

    return suggestions[queryName] || 'Review query structure and add appropriate indexes';
  }

  /**
   * Clear metrics history
   */
  clearMetrics() {
    this.queryMetrics = [];
    this.logger.log('Query metrics history cleared');
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary() {
    return {
      totalQueries: this.queryMetrics.length,
      recentQueries: this.queryMetrics.slice(-10),
      slowQueries: this.queryMetrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD).length
    };
  }
}