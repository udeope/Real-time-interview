import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../providers/openai.service';
import { CircuitBreakerService } from '../../../common/circuit-breaker/circuit-breaker.service';
import { ErrorHandlerService } from '../../../common/errors/error-handler.service';
import { ErrorType, ErrorSeverity } from '../../../common/errors/error-types';
import { ResponseOption, LLMProvider } from '../interfaces/response-generation.interface';
import { GenerateResponseDto } from '../dto/response-generation.dto';

interface ClaudeService {
  generateResponse(prompt: string, context: any): Promise<ResponseOption[]>;
}

@Injectable()
export class ResponseFallbackService {
  private readonly logger = new Logger(ResponseFallbackService.name);
  private currentProvider: LLMProvider = 'openai';
  private readonly providerPriority: LLMProvider[] = ['openai', 'claude'];

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly errorHandler: ErrorHandlerService,
    // Note: ClaudeService would be injected here when implemented
    // private readonly claudeService: ClaudeService,
  ) {}

  async generateResponseWithFallback(
    dto: GenerateResponseDto,
    sessionId: string,
    userId?: string,
  ): Promise<ResponseOption[]> {
    const context = {
      userId,
      sessionId,
      service: 'response-generation',
      operation: 'generateResponse',
      timestamp: new Date(),
      metadata: { questionType: dto.questionType },
    };

    // Try primary provider first
    try {
      return await this.tryProvider(this.currentProvider, dto, context);
    } catch (error) {
      this.logger.warn(`Primary provider ${this.currentProvider} failed, trying fallback`);
      
      // Try fallback providers
      for (const provider of this.providerPriority) {
        if (provider === this.currentProvider) continue;
        
        try {
          const result = await this.tryProvider(provider, dto, context);
          
          // Switch to working provider
          if (provider !== this.currentProvider) {
            this.logger.log(`Switched LLM provider from ${this.currentProvider} to ${provider}`);
            this.currentProvider = provider;
          }
          
          return result;
        } catch (fallbackError) {
          this.logger.warn(`Fallback provider ${provider} also failed`);
          continue;
        }
      }

      // All providers failed - return generic responses
      this.logger.error('All LLM providers failed, returning generic responses');
      return this.generateGenericResponses(dto);
    }
  }

  private async tryProvider(
    provider: LLMProvider,
    dto: GenerateResponseDto,
    context: any,
  ): Promise<ResponseOption[]> {
    const circuitName = `llm-${provider}`;
    
    return await this.circuitBreaker.execute(
      circuitName,
      async () => {
        switch (provider) {
          case 'openai':
            return await this.openaiService.generateResponse(dto);
          case 'claude':
            // Placeholder for Claude service
            // return await this.claudeService.generateResponse(dto.question, dto);
            throw new Error('Claude service not implemented yet');
          default:
            throw new Error(`Unknown LLM provider: ${provider}`);
        }
      },
      async () => {
        // Fallback to next provider in priority list
        const nextProvider = this.getNextProvider(provider);
        if (nextProvider && nextProvider !== provider) {
          return await this.tryProvider(nextProvider, dto, context);
        }
        // Final fallback to generic responses
        return this.generateGenericResponses(dto);
      },
    );
  }

  private getNextProvider(currentProvider: LLMProvider): LLMProvider | null {
    const currentIndex = this.providerPriority.indexOf(currentProvider);
    if (currentIndex === -1 || currentIndex === this.providerPriority.length - 1) {
      return null;
    }
    return this.providerPriority[currentIndex + 1];
  }

  private generateGenericResponses(dto: GenerateResponseDto): ResponseOption[] {
    const { question, questionType } = dto;
    
    const genericResponses: ResponseOption[] = [];

    switch (questionType) {
      case 'behavioral':
        genericResponses.push({
          id: 'generic-behavioral-1',
          content: 'I can share an example from my experience where I faced a similar challenge. Let me walk you through the situation, the task I needed to accomplish, the actions I took, and the results I achieved.',
          structure: 'STAR',
          estimatedDuration: 60,
          confidence: 0.6,
          tags: ['behavioral', 'generic', 'STAR'],
        });
        break;

      case 'technical':
        genericResponses.push({
          id: 'generic-technical-1',
          content: 'That\'s a great technical question. Based on my experience, I would approach this by first analyzing the requirements, then considering the available technologies and best practices for this type of solution.',
          structure: 'direct',
          estimatedDuration: 45,
          confidence: 0.5,
          tags: ['technical', 'generic'],
        });
        break;

      case 'situational':
        genericResponses.push({
          id: 'generic-situational-1',
          content: 'In a situation like this, I would start by gathering all the relevant information, consulting with stakeholders, and then developing a structured approach to address the challenge effectively.',
          structure: 'direct',
          estimatedDuration: 50,
          confidence: 0.5,
          tags: ['situational', 'generic'],
        });
        break;

      default:
        genericResponses.push({
          id: 'generic-default-1',
          content: 'Thank you for that question. Let me think about this systematically and provide you with a comprehensive answer based on my experience and knowledge.',
          structure: 'direct',
          estimatedDuration: 40,
          confidence: 0.4,
          tags: ['generic', 'fallback'],
        });
    }

    // Add a second generic option
    genericResponses.push({
      id: 'generic-clarification',
      content: 'That\'s an interesting question. Could you help me understand if you\'re looking for a specific aspect of this topic, so I can provide the most relevant answer?',
      structure: 'direct',
      estimatedDuration: 30,
      confidence: 0.5,
      tags: ['generic', 'clarification'],
    });

    return genericResponses;
  }

  getCurrentProvider(): LLMProvider {
    return this.currentProvider;
  }

  setProvider(provider: LLMProvider): void {
    if (this.providerPriority.includes(provider)) {
      this.currentProvider = provider;
      this.logger.log(`Manually switched LLM provider to ${provider}`);
    } else {
      throw new Error(`Invalid LLM provider: ${provider}`);
    }
  }

  getProviderStatus(): Record<LLMProvider, boolean> {
    const status: Record<LLMProvider, boolean> = {} as any;
    
    for (const provider of this.providerPriority) {
      const circuitName = `llm-${provider}`;
      status[provider] = !this.circuitBreaker.isCircuitOpen(circuitName);
    }
    
    return status;
  }

  async testProvider(provider: LLMProvider): Promise<boolean> {
    try {
      const testDto: GenerateResponseDto = {
        question: 'Test question',
        questionType: 'technical',
        userProfile: {},
        jobContext: {},
        conversationHistory: [],
      };

      await this.tryProvider(provider, testDto, {
        service: 'response-generation',
        operation: 'test',
        timestamp: new Date(),
      });
      return true;
    } catch (error) {
      this.logger.warn(`Provider ${provider} test failed:`, error.message);
      return false;
    }
  }

  async getProviderHealth(): Promise<Record<LLMProvider, { available: boolean; latency?: number }>> {
    const health: Record<LLMProvider, { available: boolean; latency?: number }> = {} as any;
    
    for (const provider of this.providerPriority) {
      const startTime = Date.now();
      const available = await this.testProvider(provider);
      const latency = available ? Date.now() - startTime : undefined;
      
      health[provider] = { available, latency };
    }
    
    return health;
  }

  async handleRateLimitError(provider: LLMProvider, error: any): Promise<ResponseOption[]> {
    this.logger.warn(`Rate limit hit for provider ${provider}, switching to fallback`);
    
    const appError = this.errorHandler.createError(
      ErrorType.LLM_RATE_LIMITED,
      ErrorSeverity.MEDIUM,
      {
        service: 'response-generation',
        operation: 'generateResponse',
        timestamp: new Date(),
        metadata: { provider, rateLimitError: error.message },
      },
      `Rate limit exceeded for ${provider}`,
      error,
    );

    // Try next provider or return generic responses
    const nextProvider = this.getNextProvider(provider);
    if (nextProvider) {
      this.currentProvider = nextProvider;
      this.logger.log(`Switched to ${nextProvider} due to rate limiting`);
    }

    throw appError;
  }

  async handleContextMissingError(dto: GenerateResponseDto): Promise<ResponseOption[]> {
    this.logger.warn('Context missing for response generation, using simplified approach');
    
    // Generate responses with minimal context
    const simplifiedDto: GenerateResponseDto = {
      ...dto,
      userProfile: dto.userProfile || {},
      jobContext: dto.jobContext || { title: 'General Position', company: 'Company' },
      conversationHistory: [],
    };

    return this.generateGenericResponses(simplifiedDto);
  }

  async validateResponseLength(responses: ResponseOption[]): Promise<ResponseOption[]> {
    return responses.map(response => {
      if (response.estimatedDuration > 90) {
        // Truncate response if too long
        const words = response.content.split(' ');
        const maxWords = Math.floor(words.length * 0.7); // Reduce by 30%
        const truncatedContent = words.slice(0, maxWords).join(' ') + '...';
        
        return {
          ...response,
          content: truncatedContent,
          estimatedDuration: Math.floor(response.estimatedDuration * 0.7),
          tags: [...response.tags, 'truncated'],
        };
      }
      return response;
    });
  }
}