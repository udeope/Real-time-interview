import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../config/database.config';

@Injectable()
export class DatabaseOptimizationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseOptimizationService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.createOptimizedIndexes();
    await this.configureConnectionPool();
    this.logger.log('Database optimization service initialized');
  }

  /**
   * Create optimized database indexes for performance
   */
  private async createOptimizedIndexes(): Promise<void> {
    try {
      this.logger.log('Creating optimized database indexes...');

      // Execute raw SQL to create indexes that aren't in the schema
      const indexQueries = [
        // User-related indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_created 
         ON users(subscription_tier, created_at DESC)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_seniority_industries 
         ON user_profiles(seniority, (industries->0))`,

        // Interview session indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_sessions_user_status_started 
         ON interview_sessions(user_id, status, started_at DESC)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_sessions_status_created 
         ON interview_sessions(status, created_at DESC)`,

        // Interaction indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_session_timestamp 
         ON interactions(session_id, timestamp DESC)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_question_classification 
         ON interactions USING GIN((question_classification))`,

        // Transcription result indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_results_session_final_created 
         ON transcription_results(session_id, is_final, created_at DESC)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_results_provider_confidence 
         ON transcription_results(provider, confidence DESC)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_results_speaker_time 
         ON transcription_results(speaker_id, start_time, end_time)`,

        // Audio chunk indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audio_chunks_session_processed 
         ON audio_chunks(session_id, processed_at DESC NULLS LAST)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audio_chunks_created_size 
         ON audio_chunks(created_at DESC, size DESC)`,

        // Transcription cache indexes (already in schema but adding composite ones)
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_cache_provider_hit_count 
         ON transcription_cache(provider, hit_count DESC)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_cache_language_confidence 
         ON transcription_cache(language, confidence DESC)`,

        // Practice session indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_sessions_user_status_started 
         ON practice_sessions(user_id, status, started_at DESC)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_sessions_industry_difficulty 
         ON practice_sessions(industry, difficulty, created_at DESC)`,

        // Question bank indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_type_industry_difficulty_active 
         ON question_bank(type, industry, difficulty, is_active)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_category_tags 
         ON question_bank USING GIN(category, tags)`,

        // Practice question indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_questions_session_order 
         ON practice_questions(session_id, question_order)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_questions_bank_presented 
         ON practice_questions(question_bank_id, presented_at DESC)`,

        // Practice response indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_responses_session_score_created 
         ON practice_responses(session_id, overall_score DESC, created_at DESC)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_responses_duration_score 
         ON practice_responses(duration, overall_score DESC)`,

        // Session metrics indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_metrics_session_created 
         ON session_metrics(session_id, created_at DESC)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_metrics_latency_accuracy 
         ON session_metrics(total_latency_ms, transcription_accuracy DESC)`,

        // Practice analytics indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_analytics_user_created 
         ON practice_analytics(user_id, created_at DESC)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_analytics_session_score 
         ON practice_analytics(session_id, average_score DESC)`,

        // Full-text search indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_results_text_search 
         ON transcription_results USING GIN(to_tsvector('english', text))`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_question_search 
         ON question_bank USING GIN(to_tsvector('english', question))`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_responses_response_search 
         ON practice_responses USING GIN(to_tsvector('english', response))`,

        // Partial indexes for active records
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_active_type_industry 
         ON question_bank(type, industry, difficulty) WHERE is_active = true`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_sessions_active 
         ON interview_sessions(user_id, started_at DESC) WHERE status = 'active'`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_sessions_active 
         ON practice_sessions(user_id, started_at DESC) WHERE status = 'active'`,

        // Covering indexes for common queries
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_subscription_created 
         ON users(email) INCLUDE (subscription_tier, created_at)`,
        
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_cache_hash_text_confidence 
         ON transcription_cache(audio_hash) INCLUDE (text, confidence, provider)`,
      ];

      for (const query of indexQueries) {
        try {
          await this.prisma.$executeRawUnsafe(query);
          this.logger.debug(`Created index: ${query.split('IF NOT EXISTS')[1]?.split('ON')[0]?.trim()}`);
        } catch (error) {
          // Index might already exist or there might be a conflict
          this.logger.debug(`Index creation skipped or failed: ${error.message}`);
        }
      }

      this.logger.log('Database indexes optimization completed');
    } catch (error) {
      this.logger.error('Error creating optimized indexes:', error);
    }
  }

  /**
   * Configure connection pool settings
   */
  private async configureConnectionPool(): Promise<void> {
    try {
      // Connection pool is configured in the DATABASE_URL or via Prisma client options
      // These settings should be in the environment configuration
      const poolSettings = {
        connectionLimit: this.configService.get<number>('DB_CONNECTION_LIMIT', 20),
        poolTimeout: this.configService.get<number>('DB_POOL_TIMEOUT', 60000),
        idleTimeout: this.configService.get<number>('DB_IDLE_TIMEOUT', 600000),
      };

      this.logger.log('Database connection pool configured:', poolSettings);

      // Set PostgreSQL-specific optimizations
      await this.setPgOptimizations();
    } catch (error) {
      this.logger.error('Error configuring connection pool:', error);
    }
  }

  /**
   * Set PostgreSQL-specific optimizations
   */
  private async setPgOptimizations(): Promise<void> {
    try {
      const optimizations = [
        // Increase work memory for complex queries
        `SET work_mem = '${this.configService.get<string>('DB_WORK_MEM', '4MB')}'`,
        
        // Optimize for read-heavy workloads
        `SET random_page_cost = ${this.configService.get<number>('DB_RANDOM_PAGE_COST', 1.1)}`,
        
        // Enable parallel query execution
        `SET max_parallel_workers_per_gather = ${this.configService.get<number>('DB_MAX_PARALLEL_WORKERS', 2)}`,
        
        // Optimize checkpoint settings
        `SET checkpoint_completion_target = ${this.configService.get<number>('DB_CHECKPOINT_COMPLETION_TARGET', 0.9)}`,
        
        // Set effective cache size
        `SET effective_cache_size = '${this.configService.get<string>('DB_EFFECTIVE_CACHE_SIZE', '1GB')}'`,
      ];

      for (const optimization of optimizations) {
        try {
          await this.prisma.$executeRawUnsafe(optimization);
          this.logger.debug(`Applied optimization: ${optimization}`);
        } catch (error) {
          this.logger.debug(`Optimization skipped: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error('Error applying PostgreSQL optimizations:', error);
    }
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQueryPerformance(): Promise<{
    slowQueries: Array<{
      query: string;
      avgTime: number;
      calls: number;
      totalTime: number;
    }>;
    indexUsage: Array<{
      tableName: string;
      indexName: string;
      scans: number;
      tuplesRead: number;
      tuplesReturned: number;
    }>;
    tableStats: Array<{
      tableName: string;
      size: string;
      tupleCount: number;
      deadTuples: number;
    }>;
  }> {
    try {
      // Get slow queries from pg_stat_statements (if available)
      const slowQueries = await this.getSlowQueries();
      
      // Get index usage statistics
      const indexUsage = await this.getIndexUsage();
      
      // Get table statistics
      const tableStats = await this.getTableStats();

      return {
        slowQueries,
        indexUsage,
        tableStats,
      };
    } catch (error) {
      this.logger.error('Error analyzing query performance:', error);
      return {
        slowQueries: [],
        indexUsage: [],
        tableStats: [],
      };
    }
  }

  /**
   * Get slow queries from pg_stat_statements
   */
  private async getSlowQueries(): Promise<Array<{
    query: string;
    avgTime: number;
    calls: number;
    totalTime: number;
  }>> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          query,
          mean_exec_time as avg_time,
          calls,
          total_exec_time as total_time
        FROM pg_stat_statements 
        WHERE mean_exec_time > 100 
        ORDER BY mean_exec_time DESC 
        LIMIT 20
      ` as any[];

      return result.map(row => ({
        query: row.query.substring(0, 200) + (row.query.length > 200 ? '...' : ''),
        avgTime: parseFloat(row.avg_time),
        calls: parseInt(row.calls),
        totalTime: parseFloat(row.total_time),
      }));
    } catch (error) {
      this.logger.debug('pg_stat_statements not available or error:', error.message);
      return [];
    }
  }

  /**
   * Get index usage statistics
   */
  private async getIndexUsage(): Promise<Array<{
    tableName: string;
    indexName: string;
    scans: number;
    tuplesRead: number;
    tuplesReturned: number;
  }>> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename as table_name,
          indexname as index_name,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_returned
        FROM pg_stat_user_indexes 
        ORDER BY idx_scan DESC 
        LIMIT 50
      ` as any[];

      return result.map(row => ({
        tableName: row.table_name,
        indexName: row.index_name,
        scans: parseInt(row.scans) || 0,
        tuplesRead: parseInt(row.tuples_read) || 0,
        tuplesReturned: parseInt(row.tuples_returned) || 0,
      }));
    } catch (error) {
      this.logger.error('Error getting index usage:', error);
      return [];
    }
  }

  /**
   * Get table statistics
   */
  private async getTableStats(): Promise<Array<{
    tableName: string;
    size: string;
    tupleCount: number;
    deadTuples: number;
  }>> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          tablename as table_name,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          n_tup_ins + n_tup_upd + n_tup_del as tuple_count,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables 
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      ` as any[];

      return result.map(row => ({
        tableName: row.table_name,
        size: row.size,
        tupleCount: parseInt(row.tuple_count) || 0,
        deadTuples: parseInt(row.dead_tuples) || 0,
      }));
    } catch (error) {
      this.logger.error('Error getting table stats:', error);
      return [];
    }
  }

  /**
   * Run VACUUM and ANALYZE on all tables
   */
  async optimizeTables(): Promise<void> {
    try {
      this.logger.log('Starting table optimization (VACUUM ANALYZE)...');

      const tables = [
        'users', 'user_profiles', 'interview_sessions', 'interactions',
        'session_metrics', 'transcription_results', 'audio_chunks',
        'transcription_cache', 'practice_sessions', 'question_bank',
        'practice_questions', 'practice_responses', 'practice_analytics'
      ];

      for (const table of tables) {
        try {
          await this.prisma.$executeRawUnsafe(`VACUUM ANALYZE ${table}`);
          this.logger.debug(`Optimized table: ${table}`);
        } catch (error) {
          this.logger.warn(`Failed to optimize table ${table}:`, error.message);
        }
      }

      this.logger.log('Table optimization completed');
    } catch (error) {
      this.logger.error('Error optimizing tables:', error);
    }
  }

  /**
   * Get database connection statistics
   */
  async getConnectionStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
    connectionUtilization: number;
  }> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      ` as any[];

      const stats = result[0];
      const totalConnections = parseInt(stats.total_connections) || 0;
      const activeConnections = parseInt(stats.active_connections) || 0;
      const idleConnections = parseInt(stats.idle_connections) || 0;
      const maxConnections = parseInt(stats.max_connections) || 100;
      const connectionUtilization = (totalConnections / maxConnections) * 100;

      return {
        totalConnections,
        activeConnections,
        idleConnections,
        maxConnections,
        connectionUtilization: Math.round(connectionUtilization * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Error getting connection stats:', error);
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        maxConnections: 0,
        connectionUtilization: 0,
      };
    }
  }
}