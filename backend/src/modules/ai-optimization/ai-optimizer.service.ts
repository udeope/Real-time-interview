import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { performance } from 'perf_hooks';

interface ModelPerformanceMetrics {
  modelName: string;
  promptVersion: string;
  averageLatency: number;
  accuracyScore: number;
  tokenUsage: number;
  costPerRequest: number;
  successRate: number;
  timestamp: Date;
}

interface OptimizedPrompt {
  version: string;
  content: string;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  performance: {
    averageLatency: number;
    accuracyScore: number;
    tokenEfficiency: number;
  };
}

interface ModelConfig {
  name: string;
  endpoint: string;
  apiKey: string;
  defaultParams: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  costPerToken: number;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

@Injectable()
export class AIOptimizerService {
  private readonly logger = new Logger(AIOptimizerService.name);
  private performanceMetrics: ModelPerformanceMetrics[] = [];
  private optimizedPrompts: Map<string, OptimizedPrompt> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeModelConfigs();
    this.loadOptimizedPrompts();
  }

  private initializeModelConfigs() {
    // GPT-4 Turbo configuration
    this.modelConfigs.set('gpt-4-turbo', {
      name: 'gpt-4-turbo',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: this.configService.get('OPENAI_API_KEY'),
      defaultParams: {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
      },
      costPerToken: 0.00003, // $0.03 per 1K tokens
      rateLimits: {
        requestsPerMinute: 500,
        tokensPerMinute: 150000
      }
    });

    // Claude 3 configuration
    this.modelConfigs.set('claude-3-sonnet', {
      name: 'claude-3-sonnet',
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: this.configService.get('ANTHROPIC_API_KEY'),
      defaultParams: {
        temperature: 0.6,
        maxTokens: 1000,
        topP: 0.9,
        frequencyPenalty: 0,
        presencePenalty: 0
      },
      costPerToken: 0.000015, // $0.015 per 1K tokens
      rateLimits: {
        requestsPerMinute: 300,
        tokensPerMinute: 100000
      }
    });

    // GPT-3.5 Turbo for fallback
    this.modelConfigs.set('gpt-3.5-turbo', {
      name: 'gpt-3.5-turbo',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: this.configService.get('OPENAI_API_KEY'),
      defaultParams: {
        temperature: 0.8,
        maxTokens: 800,
        topP: 0.9,
        frequencyPenalty: 0.2,
        presencePenalty: 0.1
      },
      costPerToken: 0.000002, // $0.002 per 1K tokens
      rateLimits: {
        requestsPerMinute: 3500,
        tokensPerMinute: 90000
      }
    });
  }

  private loadOptimizedPrompts() {
    // Response generation prompts optimized for different question types
    this.optimizedPrompts.set('behavioral-response', {
      version: 'v2.1',
      content: `You are an expert interview coach helping a candidate respond to behavioral questions using the STAR method.

Context: {context}
User Profile: {userProfile}
Question: {question}

Generate 2-3 response options that:
1. Follow STAR structure (Situation, Task, Action, Result)
2. Are personalized to the candidate's experience
3. Stay within 90 seconds speaking time
4. Highlight relevant skills and achievements
5. Sound natural and conversational

Response format:
- Option 1: [Confident and detailed approach]
- Option 2: [Concise and focused approach]
- Option 3: [Story-driven approach] (if applicable)

Keep responses authentic and avoid generic examples.`,
      parameters: {
        temperature: 0.7,
        maxTokens: 800,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
      },
      performance: {
        averageLatency: 1200,
        accuracyScore: 0.92,
        tokenEfficiency: 0.85
      }
    });

    this.optimizedPrompts.set('technical-response', {
      version: 'v2.0',
      content: `You are a technical interview expert helping a candidate answer technical questions clearly and comprehensively.

Context: {context}
User Profile: {userProfile}
Question: {question}

Generate 2 response options that:
1. Demonstrate technical knowledge at the appropriate level
2. Include practical examples from the candidate's experience
3. Show problem-solving approach
4. Are clear and well-structured
5. Stay within 90 seconds speaking time

Response format:
- Option 1: [Detailed technical explanation]
- Option 2: [Practical example-focused approach]

Focus on accuracy, clarity, and demonstrating expertise.`,
      parameters: {
        temperature: 0.6,
        maxTokens: 700,
        topP: 0.8,
        frequencyPenalty: 0.2,
        presencePenalty: 0.1
      },
      performance: {
        averageLatency: 1000,
        accuracyScore: 0.94,
        tokenEfficiency: 0.88
      }
    });

    this.optimizedPrompts.set('situational-response', {
      version: 'v1.9',
      content: `You are an interview coach helping a candidate respond to situational/hypothetical questions with strategic thinking.

Context: {context}
User Profile: {userProfile}
Question: {question}

Generate 2 response options that:
1. Show analytical and strategic thinking
2. Reference relevant experience when possible
3. Demonstrate leadership and problem-solving skills
4. Are structured and logical
5. Stay within 90 seconds speaking time

Response format:
- Option 1: [Analytical approach with framework]
- Option 2: [Experience-based approach]

Emphasize thought process and decision-making rationale.`,
      parameters: {
        temperature: 0.75,
        maxTokens: 750,
        topP: 0.9,
        frequencyPenalty: 0.15,
        presencePenalty: 0.1
      },
      performance: {
        averageLatency: 1100,
        accuracyScore: 0.89,
        tokenEfficiency: 0.82
      }
    });

    this.optimizedPrompts.set('cultural-response', {
      version: 'v1.8',
      content: `You are an interview coach helping a candidate respond to culture-fit and values-based questions authentically.

Context: {context}
User Profile: {userProfile}
Question: {question}

Generate 2 response options that:
1. Align with the company's stated values and culture
2. Show genuine personality and authenticity
3. Include specific examples that demonstrate values
4. Are conversational and engaging
5. Stay within 90 seconds speaking time

Response format:
- Option 1: [Values-focused approach]
- Option 2: [Personal story approach]

Emphasize authenticity and cultural alignment.`,
      parameters: {
        temperature: 0.8,
        maxTokens: 700,
        topP: 0.95,
        frequencyPenalty: 0.1,
        presencePenalty: 0.2
      },
      performance: {
        averageLatency: 950,
        accuracyScore: 0.87,
        tokenEfficiency: 0.80
      }
    });
  }

  /**
   * Get optimized model configuration based on request type and performance requirements
   */
  getOptimalModelConfig(
    requestType: 'behavioral' | 'technical' | 'situational' | 'cultural',
    prioritizeSpeed: boolean = false,
    prioritizeCost: boolean = false
  ): ModelConfig {
    if (prioritizeCost) {
      return this.modelConfigs.get('gpt-3.5-turbo');
    }

    if (prioritizeSpeed && requestType === 'technical') {
      return this.modelConfigs.get('claude-3-sonnet'); // Faster for technical content
    }

    // Default to GPT-4 Turbo for best quality
    return this.modelConfigs.get('gpt-4-turbo');
  }

  /**
   * Get optimized prompt for specific question type
   */
  getOptimizedPrompt(questionType: string): OptimizedPrompt | null {
    const promptKey = `${questionType}-response`;
    return this.optimizedPrompts.get(promptKey) || null;
  }

  /**
   * Measure and record model performance
   */
  async measureModelPerformance<T>(
    modelName: string,
    promptVersion: string,
    operation: () => Promise<T>,
    tokenCount?: number
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      const modelConfig = this.modelConfigs.get(modelName);
      const costPerRequest = tokenCount && modelConfig 
        ? tokenCount * modelConfig.costPerToken 
        : 0;

      this.recordPerformanceMetric({
        modelName,
        promptVersion,
        averageLatency: latency,
        accuracyScore: 0.9, // Would be calculated based on user feedback
        tokenUsage: tokenCount || 0,
        costPerRequest,
        successRate: 1.0,
        timestamp: new Date()
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const latency = endTime - startTime;

      this.recordPerformanceMetric({
        modelName,
        promptVersion,
        averageLatency: latency,
        accuracyScore: 0,
        tokenUsage: 0,
        costPerRequest: 0,
        successRate: 0,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Optimize model parameters based on performance data
   */
  optimizeModelParameters(
    modelName: string,
    targetLatency: number = 1500,
    targetAccuracy: number = 0.9
  ): Partial<ModelConfig['defaultParams']> {
    const metrics = this.performanceMetrics.filter(m => m.modelName === modelName);
    
    if (metrics.length < 10) {
      this.logger.warn(`Insufficient data for ${modelName} optimization`);
      return {};
    }

    const avgLatency = metrics.reduce((sum, m) => sum + m.averageLatency, 0) / metrics.length;
    const avgAccuracy = metrics.reduce((sum, m) => sum + m.accuracyScore, 0) / metrics.length;

    const optimizations: Partial<ModelConfig['defaultParams']> = {};

    // If latency is too high, reduce max tokens and increase temperature slightly
    if (avgLatency > targetLatency) {
      const currentConfig = this.modelConfigs.get(modelName);
      optimizations.maxTokens = Math.max(500, currentConfig.defaultParams.maxTokens * 0.8);
      optimizations.temperature = Math.min(1.0, currentConfig.defaultParams.temperature + 0.1);
      
      this.logger.log(`Optimizing ${modelName} for speed: reducing maxTokens to ${optimizations.maxTokens}`);
    }

    // If accuracy is too low, reduce temperature and adjust penalties
    if (avgAccuracy < targetAccuracy) {
      const currentConfig = this.modelConfigs.get(modelName);
      optimizations.temperature = Math.max(0.1, currentConfig.defaultParams.temperature - 0.1);
      optimizations.frequencyPenalty = Math.min(2.0, currentConfig.defaultParams.frequencyPenalty + 0.1);
      
      this.logger.log(`Optimizing ${modelName} for accuracy: reducing temperature to ${optimizations.temperature}`);
    }

    return optimizations;
  }

  /**
   * A/B test different prompt versions
   */
  async abTestPrompts(
    questionType: string,
    promptA: OptimizedPrompt,
    promptB: OptimizedPrompt,
    testCases: Array<{ question: string; context: any; userProfile: any }>
  ): Promise<{
    winner: 'A' | 'B';
    results: {
      promptA: { avgLatency: number; avgAccuracy: number; avgTokens: number };
      promptB: { avgLatency: number; avgAccuracy: number; avgTokens: number };
    };
  }> {
    const resultsA = [];
    const resultsB = [];

    // Test prompt A
    for (const testCase of testCases) {
      const startTime = performance.now();
      // Simulate API call with prompt A
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      const endTime = performance.now();
      
      resultsA.push({
        latency: endTime - startTime,
        accuracy: 0.85 + Math.random() * 0.1, // Simulated accuracy
        tokens: 600 + Math.random() * 200
      });
    }

    // Test prompt B
    for (const testCase of testCases) {
      const startTime = performance.now();
      // Simulate API call with prompt B
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1200 + 400));
      const endTime = performance.now();
      
      resultsB.push({
        latency: endTime - startTime,
        accuracy: 0.88 + Math.random() * 0.08, // Simulated accuracy
        tokens: 550 + Math.random() * 150
      });
    }

    const avgA = {
      avgLatency: resultsA.reduce((sum, r) => sum + r.latency, 0) / resultsA.length,
      avgAccuracy: resultsA.reduce((sum, r) => sum + r.accuracy, 0) / resultsA.length,
      avgTokens: resultsA.reduce((sum, r) => sum + r.tokens, 0) / resultsA.length
    };

    const avgB = {
      avgLatency: resultsB.reduce((sum, r) => sum + r.latency, 0) / resultsB.length,
      avgAccuracy: resultsB.reduce((sum, r) => sum + r.accuracy, 0) / resultsB.length,
      avgTokens: resultsB.reduce((sum, r) => sum + r.tokens, 0) / resultsB.length
    };

    // Determine winner based on weighted score (accuracy 60%, speed 25%, efficiency 15%)
    const scoreA = (avgA.avgAccuracy * 0.6) + ((2000 - avgA.avgLatency) / 2000 * 0.25) + ((1000 - avgA.avgTokens) / 1000 * 0.15);
    const scoreB = (avgB.avgAccuracy * 0.6) + ((2000 - avgB.avgLatency) / 2000 * 0.25) + ((1000 - avgB.avgTokens) / 1000 * 0.15);

    const winner = scoreA > scoreB ? 'A' : 'B';
    
    this.logger.log(`A/B test results for ${questionType}: Winner is Prompt ${winner}`);
    this.logger.log(`Prompt A - Accuracy: ${avgA.avgAccuracy.toFixed(3)}, Latency: ${avgA.avgLatency.toFixed(0)}ms`);
    this.logger.log(`Prompt B - Accuracy: ${avgB.avgAccuracy.toFixed(3)}, Latency: ${avgB.avgLatency.toFixed(0)}ms`);

    return {
      winner,
      results: {
        promptA: avgA,
        promptB: avgB
      }
    };
  }

  /**
   * Dynamic model selection based on current performance and load
   */
  selectOptimalModel(
    questionType: string,
    currentLoad: number,
    userTier: 'free' | 'pro' | 'enterprise' = 'free'
  ): string {
    const loadThreshold = 0.8; // 80% capacity
    
    // For enterprise users, always use best model
    if (userTier === 'enterprise') {
      return 'gpt-4-turbo';
    }

    // For high load, use faster/cheaper models
    if (currentLoad > loadThreshold) {
      if (userTier === 'free') {
        return 'gpt-3.5-turbo';
      }
      return 'claude-3-sonnet'; // Good balance for pro users
    }

    // For technical questions, prefer Claude for better reasoning
    if (questionType === 'technical' && userTier === 'pro') {
      return 'claude-3-sonnet';
    }

    // Default selection based on user tier
    return userTier === 'pro' ? 'gpt-4-turbo' : 'gpt-3.5-turbo';
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(timeRange: { from: Date; to: Date }) {
    const filteredMetrics = this.performanceMetrics.filter(
      m => m.timestamp >= timeRange.from && m.timestamp <= timeRange.to
    );

    const byModel = new Map<string, ModelPerformanceMetrics[]>();
    filteredMetrics.forEach(metric => {
      if (!byModel.has(metric.modelName)) {
        byModel.set(metric.modelName, []);
      }
      byModel.get(metric.modelName).push(metric);
    });

    const analytics = {};
    for (const [modelName, metrics] of byModel) {
      analytics[modelName] = {
        totalRequests: metrics.length,
        avgLatency: metrics.reduce((sum, m) => sum + m.averageLatency, 0) / metrics.length,
        avgAccuracy: metrics.reduce((sum, m) => sum + m.accuracyScore, 0) / metrics.length,
        totalCost: metrics.reduce((sum, m) => sum + m.costPerRequest, 0),
        successRate: metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length,
        avgTokenUsage: metrics.reduce((sum, m) => sum + m.tokenUsage, 0) / metrics.length
      };
    }

    return analytics;
  }

  /**
   * Record performance metric
   */
  private recordPerformanceMetric(metric: ModelPerformanceMetrics) {
    this.performanceMetrics.push(metric);
    
    // Keep only last 10000 metrics to prevent memory issues
    if (this.performanceMetrics.length > 10000) {
      this.performanceMetrics = this.performanceMetrics.slice(-5000);
    }
  }

  /**
   * Update prompt based on performance feedback
   */
  updatePromptPerformance(
    promptKey: string,
    latency: number,
    accuracyScore: number,
    tokenEfficiency: number
  ) {
    const prompt = this.optimizedPrompts.get(promptKey);
    if (prompt) {
      // Update performance metrics with exponential moving average
      const alpha = 0.1; // Learning rate
      prompt.performance.averageLatency = 
        (1 - alpha) * prompt.performance.averageLatency + alpha * latency;
      prompt.performance.accuracyScore = 
        (1 - alpha) * prompt.performance.accuracyScore + alpha * accuracyScore;
      prompt.performance.tokenEfficiency = 
        (1 - alpha) * prompt.performance.tokenEfficiency + alpha * tokenEfficiency;
      
      this.optimizedPrompts.set(promptKey, prompt);
    }
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): Array<{
    type: 'model' | 'prompt' | 'parameters';
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImprovement: string;
  }> {
    const recommendations = [];
    
    // Analyze recent performance
    const recentMetrics = this.performanceMetrics.slice(-1000);
    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.averageLatency, 0) / recentMetrics.length;
    const avgAccuracy = recentMetrics.reduce((sum, m) => sum + m.accuracyScore, 0) / recentMetrics.length;
    
    if (avgLatency > 2000) {
      recommendations.push({
        type: 'model',
        priority: 'high',
        description: 'Average response latency is above 2 seconds',
        expectedImprovement: '30-50% latency reduction'
      });
    }
    
    if (avgAccuracy < 0.85) {
      recommendations.push({
        type: 'prompt',
        priority: 'high',
        description: 'Response accuracy is below target threshold',
        expectedImprovement: '10-15% accuracy improvement'
      });
    }
    
    // Check for underperforming prompts
    for (const [key, prompt] of this.optimizedPrompts) {
      if (prompt.performance.accuracyScore < 0.8) {
        recommendations.push({
          type: 'prompt',
          priority: 'medium',
          description: `Prompt ${key} has low accuracy score`,
          expectedImprovement: '15-20% accuracy improvement'
        });
      }
    }
    
    return recommendations;
  }
}