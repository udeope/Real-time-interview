import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { PrecomputationJob } from '../interfaces/cache.interface';
import { DatabaseService } from '../../../config/database.config';
import * as cron from 'node-cron';

@Injectable()
export class ResponsePrecomputationService implements OnModuleInit {
  private readonly logger = new Logger(ResponsePrecomputationService.name);
  private readonly jobs = new Map<string, PrecomputationJob>();
  private readonly scheduledTasks = new Map<string, cron.ScheduledTask>();
  private readonly enabled: boolean;

  // Common interview questions for precomputation
  private readonly commonQuestions = [
    'Tell me about yourself',
    'What are your strengths?',
    'What are your weaknesses?',
    'Why do you want to work here?',
    'Where do you see yourself in five years?',
    'Why are you leaving your current job?',
    'Describe a challenging situation you faced at work',
    'What motivates you?',
    'How do you handle stress and pressure?',
    'What are your salary expectations?',
    'Do you have any questions for us?',
    'Describe your ideal work environment',
    'How do you prioritize your work?',
    'Tell me about a time you failed',
    'What makes you unique?',
  ];

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly prisma: DatabaseService,
  ) {
    this.enabled = this.configService.get<boolean>('PRECOMPUTATION_ENABLED', true);
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Response precomputation is disabled');
      return;
    }

    // Register default precomputation jobs
    await this.registerDefaultJobs();
    
    // Start scheduled precomputation
    this.startScheduledJobs();

    this.logger.log('Response precomputation service initialized');
  }

  /**
   * Register a precomputation job
   */
  registerJob(job: PrecomputationJob): void {
    this.jobs.set(job.id, job);
    
    if (job.enabled && job.schedule) {
      this.scheduleJob(job);
    }

    this.logger.debug(`Registered precomputation job: ${job.id}`);
  }

  /**
   * Execute a specific precomputation job
   */
  async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Precomputation job not found: ${jobId}`);
    }

    if (!job.enabled) {
      this.logger.debug(`Skipping disabled job: ${jobId}`);
      return;
    }

    try {
      this.logger.log(`Executing precomputation job: ${jobId}`);
      const startTime = Date.now();
      
      await job.generator();
      
      const duration = Date.now() - startTime;
      this.logger.log(`Completed precomputation job: ${jobId} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Error executing precomputation job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Precompute responses for common questions
   */
  async precomputeCommonResponses(): Promise<void> {
    this.logger.log('Starting precomputation of common responses');

    // Get sample user profiles for different scenarios
    const sampleProfiles = await this.getSampleUserProfiles();
    const jobContexts = await this.getSampleJobContexts();

    let precomputedCount = 0;

    for (const question of this.commonQuestions) {
      for (const profile of sampleProfiles) {
        for (const jobContext of jobContexts) {
          try {
            // Generate cache key
            const cacheKey = this.generateResponseCacheKey(question, profile, jobContext);
            
            // Check if already cached
            const existing = await this.cacheService.get(cacheKey);
            if (existing) {
              continue; // Skip if already cached
            }

            // Generate responses (this would typically call the response generation service)
            const responses = await this.generateSampleResponses(question, profile, jobContext);
            
            // Cache the responses with extended TTL
            await this.cacheService.set(
              cacheKey,
              responses,
              24 * 60 * 60, // 24 hours
              ['precomputed', 'responses', `user:${profile.seniority}`, `job:${jobContext.industry}`]
            );

            precomputedCount++;
          } catch (error) {
            this.logger.warn(`Failed to precompute response for question: ${question}`, error);
          }
        }
      }
    }

    this.logger.log(`Precomputed ${precomputedCount} responses`);
  }

  /**
   * Precompute context data for frequent patterns
   */
  async precomputeContextData(): Promise<void> {
    this.logger.log('Starting precomputation of context data');

    try {
      // Get frequently accessed user profiles
      const frequentUsers = await this.prisma.user.findMany({
        take: 100,
        orderBy: {
          sessions: {
            _count: 'desc'
          }
        },
        include: {
          profile: true,
          sessions: {
            take: 1,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      let precomputedCount = 0;

      for (const user of frequentUsers) {
        if (!user.profile) continue;

        try {
          // Precompute user context
          const contextKey = `context:${user.id}:profile`;
          const contextData = {
            userId: user.id,
            profile: user.profile,
            recentSessions: user.sessions,
            skills: user.profile.skills,
            experience: user.profile.experience,
            preferences: user.profile.preferences,
          };

          await this.cacheService.set(
            contextKey,
            contextData,
            12 * 60 * 60, // 12 hours
            ['precomputed', 'context', `user:${user.id}`]
          );

          precomputedCount++;
        } catch (error) {
          this.logger.warn(`Failed to precompute context for user: ${user.id}`, error);
        }
      }

      this.logger.log(`Precomputed ${precomputedCount} context entries`);
    } catch (error) {
      this.logger.error('Error precomputing context data:', error);
    }
  }

  /**
   * Precompute transcription patterns
   */
  async precomputeTranscriptionPatterns(): Promise<void> {
    this.logger.log('Starting precomputation of transcription patterns');

    try {
      // Get common transcription patterns from database
      const commonTranscriptions = await this.prisma.transcriptionCache.findMany({
        where: {
          hitCount: {
            gte: 5 // Frequently accessed transcriptions
          }
        },
        orderBy: {
          hitCount: 'desc'
        },
        take: 1000
      });

      let precomputedCount = 0;

      for (const transcription of commonTranscriptions) {
        try {
          // Precompute question classification for common transcriptions
          const classificationKey = `classification:${transcription.audioHash}`;
          
          const existing = await this.cacheService.get(classificationKey);
          if (existing) continue;

          // This would typically call the question classification service
          const classification = await this.classifyQuestion(transcription.text);
          
          await this.cacheService.set(
            classificationKey,
            classification,
            6 * 60 * 60, // 6 hours
            ['precomputed', 'classification', `provider:${transcription.provider}`]
          );

          precomputedCount++;
        } catch (error) {
          this.logger.warn(`Failed to precompute classification for transcription: ${transcription.id}`, error);
        }
      }

      this.logger.log(`Precomputed ${precomputedCount} transcription classifications`);
    } catch (error) {
      this.logger.error('Error precomputing transcription patterns:', error);
    }
  }

  /**
   * Get precomputation statistics
   */
  async getPrecomputationStats(): Promise<{
    totalJobs: number;
    activeJobs: number;
    scheduledJobs: number;
    precomputedEntries: number;
    lastExecutionTimes: Record<string, Date>;
  }> {
    const redis = this.cacheService['redisService'].getClient();
    const precomputedKeys = await redis.keys('cache:*');
    
    // Count precomputed entries (those with 'precomputed' tag)
    let precomputedCount = 0;
    for (const key of precomputedKeys.slice(0, 1000)) { // Sample for performance
      try {
        const tagKey = `tags:precomputed`;
        const isPrecomputed = await redis.sismember(tagKey, key.replace('cache:', ''));
        if (isPrecomputed) {
          precomputedCount++;
        }
      } catch (error) {
        // Skip problematic keys
      }
    }

    const activeJobs = Array.from(this.jobs.values()).filter(job => job.enabled).length;
    const scheduledJobs = this.scheduledTasks.size;

    return {
      totalJobs: this.jobs.size,
      activeJobs,
      scheduledJobs,
      precomputedEntries: precomputedCount,
      lastExecutionTimes: {}, // Could be implemented with execution tracking
    };
  }

  /**
   * Clear precomputed cache
   */
  async clearPrecomputedCache(): Promise<number> {
    this.logger.log('Clearing precomputed cache');
    
    try {
      const redis = this.cacheService['redisService'].getClient();
      const tagKey = 'tags:precomputed';
      const keys = await redis.smembers(tagKey);
      
      if (keys.length === 0) return 0;

      // Delete all precomputed entries
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.del(`cache:${key}`);
      }
      pipeline.del(tagKey);
      
      await pipeline.exec();
      
      this.logger.log(`Cleared ${keys.length} precomputed cache entries`);
      return keys.length;
    } catch (error) {
      this.logger.error('Error clearing precomputed cache:', error);
      return 0;
    }
  }

  private async registerDefaultJobs(): Promise<void> {
    // Common responses precomputation job
    this.registerJob({
      id: 'common-responses',
      pattern: 'responses:common:*',
      generator: () => this.precomputeCommonResponses(),
      schedule: '0 2 * * *', // Daily at 2 AM
      priority: 1,
      enabled: true,
    });

    // Context data precomputation job
    this.registerJob({
      id: 'context-data',
      pattern: 'context:*',
      generator: () => this.precomputeContextData(),
      schedule: '0 3 * * *', // Daily at 3 AM
      priority: 2,
      enabled: true,
    });

    // Transcription patterns precomputation job
    this.registerJob({
      id: 'transcription-patterns',
      pattern: 'classification:*',
      generator: () => this.precomputeTranscriptionPatterns(),
      schedule: '0 4 * * 0', // Weekly on Sunday at 4 AM
      priority: 3,
      enabled: true,
    });
  }

  private startScheduledJobs(): void {
    for (const job of this.jobs.values()) {
      if (job.enabled && job.schedule) {
        this.scheduleJob(job);
      }
    }
  }

  private scheduleJob(job: PrecomputationJob): void {
    if (this.scheduledTasks.has(job.id)) {
      this.scheduledTasks.get(job.id)?.stop();
    }

    const task = cron.schedule(job.schedule, async () => {
      try {
        await this.executeJob(job.id);
      } catch (error) {
        this.logger.error(`Scheduled job ${job.id} failed:`, error);
      }
    }, {
      scheduled: false
    });

    task.start();
    this.scheduledTasks.set(job.id, task);
    
    this.logger.debug(`Scheduled job: ${job.id} with cron: ${job.schedule}`);
  }

  private async getSampleUserProfiles(): Promise<any[]> {
    // Return sample profiles representing different user types
    return [
      {
        seniority: 'junior',
        industries: ['technology', 'software'],
        skills: ['JavaScript', 'React', 'Node.js'],
        communicationStyle: 'concise',
        preferredResponseStyle: 'structured'
      },
      {
        seniority: 'mid',
        industries: ['technology', 'fintech'],
        skills: ['Python', 'Django', 'PostgreSQL', 'AWS'],
        communicationStyle: 'detailed',
        preferredResponseStyle: 'conversational'
      },
      {
        seniority: 'senior',
        industries: ['technology', 'enterprise'],
        skills: ['Java', 'Spring', 'Microservices', 'Kubernetes'],
        communicationStyle: 'strategic',
        preferredResponseStyle: 'leadership-focused'
      }
    ];
  }

  private async getSampleJobContexts(): Promise<any[]> {
    // Return sample job contexts for different industries
    return [
      {
        industry: 'technology',
        title: 'Software Engineer',
        type: 'technical',
        company: 'Tech Startup'
      },
      {
        industry: 'finance',
        title: 'Financial Analyst',
        type: 'analytical',
        company: 'Investment Bank'
      },
      {
        industry: 'healthcare',
        title: 'Product Manager',
        type: 'strategic',
        company: 'Healthcare Company'
      }
    ];
  }

  private generateResponseCacheKey(question: string, profile: any, jobContext: any): string {
    const questionHash = this.hashString(question.toLowerCase().trim());
    const profileHash = this.hashString(JSON.stringify({
      seniority: profile.seniority,
      industry: profile.industries?.[0],
      communicationStyle: profile.communicationStyle
    }));
    const jobHash = this.hashString(JSON.stringify({
      industry: jobContext.industry,
      type: jobContext.type
    }));

    return `responses:precomputed:${questionHash}:${profileHash}:${jobHash}`;
  }

  private async generateSampleResponses(question: string, profile: any, jobContext: any): Promise<any[]> {
    // This would typically call the actual response generation service
    // For now, return mock responses
    return [
      {
        id: '1',
        content: `Sample response for "${question}" tailored to ${profile.seniority} level in ${jobContext.industry}`,
        structure: 'STAR',
        estimatedDuration: 90,
        confidence: 0.85,
        tags: ['precomputed', profile.seniority, jobContext.industry]
      }
    ];
  }

  private async classifyQuestion(text: string): Promise<any> {
    // This would typically call the actual question classification service
    // For now, return mock classification
    return {
      type: 'behavioral',
      category: 'general',
      difficulty: 'mid',
      requiresSTAR: true
    };
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}