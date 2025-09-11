import { Injectable, Logger } from '@nestjs/common';
import { 
  ResponseGenerationRequest,
  ResponseOption,
  PersonalizationContext,
  ResponseGenerationOptions,
  ResponseValidationResult
} from './interfaces/response-generation.interface';
import { OpenAIService } from './providers/openai.service';
import { STARStructureService } from './services/star-structure.service';
import { ResponsePersonalizationService } from './services/response-personalization.service';
import { ResponseValidationService } from './services/response-validation.service';
import { ResponseCacheService } from './services/response-cache.service';

@Injectable()
export class ResponseGenerationService {
  private readonly logger = new Logger(ResponseGenerationService.name);

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly starStructureService: STARStructureService,
    private readonly personalizationService: ResponsePersonalizationService,
    private readonly validationService: ResponseValidationService,
    private readonly cacheService: ResponseCacheService,
  ) {}

  /**
   * Generate multiple response options for an interview question
   */
  async generateResponses(request: ResponseGenerationRequest): Promise<{
    responses: ResponseOption[];
    processingTimeMs: number;
    fromCache: boolean;
  }> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Generating responses for user ${request.userId}`);
      
      // Check cache first
      const cachedResponses = await this.cacheService.getCachedResponses(
        request.question,
        request.context
      );
      
      if (cachedResponses) {
        this.logger.debug('Returning cached responses');
        return {
          responses: cachedResponses,
          processingTimeMs: Date.now() - startTime,
          fromCache: true
        };
      }

      // Generate new responses
      const responses = await this.generateNewResponses(request);
      
      // Validate and optimize responses
      const validatedResponses = await this.validateAndOptimizeResponses(
        responses,
        request.options?.maxDuration || 90
      );

      // Cache the results
      await this.cacheService.cacheResponses(
        request.question,
        request.context,
        validatedResponses
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(`Generated ${validatedResponses.length} responses in ${processingTime}ms`);

      return {
        responses: validatedResponses,
        processingTimeMs: processingTime,
        fromCache: false
      };
    } catch (error) {
      this.logger.error('Error generating responses:', error);
      
      // Return fallback responses
      const fallbackResponses = await this.generateFallbackResponses(request);
      return {
        responses: fallbackResponses,
        processingTimeMs: Date.now() - startTime,
        fromCache: false
      };
    }
  }

  /**
   * Apply STAR method structure to a response
   */
  async applySTARStructure(
    content: string,
    experiences: any[],
    questionClassification?: any
  ): Promise<string> {
    return this.starStructureService.applySTARStructure(
      content,
      experiences,
      questionClassification
    );
  }

  /**
   * Personalize a response template
   */
  async personalizeResponse(
    template: string,
    context: PersonalizationContext
  ): Promise<string> {
    return this.personalizationService.personalizeResponse(template, context);
  }

  /**
   * Validate response length and quality
   */
  async validateResponse(
    response: string,
    maxDurationSeconds: number = 90
  ): Promise<ResponseValidationResult> {
    return this.validationService.validateResponse(response, maxDurationSeconds);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    return this.cacheService.getCacheStats();
  }

  /**
   * Clear response cache
   */
  async clearCache(pattern?: string): Promise<number> {
    return this.cacheService.clearCache(pattern);
  }

  /**
   * Generate a custom response using OpenAI for practice feedback
   */
  async generateCustomResponse(prompt: string): Promise<string> {
    try {
      this.logger.log('Generating custom response for practice feedback');
      
      // Use OpenAI service to generate response
      const response = await this.openaiService.generateCustomResponse(prompt);
      
      return response;
    } catch (error) {
      this.logger.error('Error generating custom response:', error);
      throw error;
    }
  }

  private async generateNewResponses(request: ResponseGenerationRequest): Promise<ResponseOption[]> {
    const { question, context, options = {} } = request;
    
    // Generate base responses using OpenAI
    const aiResponses = await this.openaiService.generateResponses(
      question,
      context,
      options
    );

    // Generate additional personalized options
    const personalizedOptions = await this.personalizationService.generateMultipleOptions(
      aiResponses[0]?.content || question,
      context,
      options.responseCount || 3
    );

    // Combine and deduplicate responses
    const allResponses = [...aiResponses, ...personalizedOptions];
    const uniqueResponses = this.deduplicateResponses(allResponses);

    // Apply STAR structure where appropriate
    const structuredResponses = await this.applyStructureEnhancements(
      uniqueResponses,
      context
    );

    // Sort by confidence and return top responses
    return structuredResponses
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, options.responseCount || 3);
  }

  private async validateAndOptimizeResponses(
    responses: ResponseOption[],
    maxDuration: number
  ): Promise<ResponseOption[]> {
    const validatedResponses: ResponseOption[] = [];

    for (const response of responses) {
      const validation = await this.validationService.validateResponse(
        response.content,
        maxDuration
      );

      // Use optimized content if available and valid
      const finalContent = validation.optimizedResponse && validation.isValid
        ? validation.optimizedResponse
        : response.content;

      // Update response with validation results
      const validatedResponse: ResponseOption = {
        ...response,
        content: finalContent,
        estimatedDuration: validation.estimatedDurationSeconds,
        confidence: validation.isValid ? response.confidence : response.confidence * 0.8
      };

      validatedResponses.push(validatedResponse);
    }

    return validatedResponses;
  }

  private async applyStructureEnhancements(
    responses: ResponseOption[],
    context: PersonalizationContext
  ): Promise<ResponseOption[]> {
    const enhancedResponses: ResponseOption[] = [];

    for (const response of responses) {
      let enhancedContent = response.content;

      // Apply STAR structure for behavioral questions
      if (response.structure === 'STAR' || 
          (context.questionClassification?.requiresSTAR && 
           context.relevantExperiences.length > 0)) {
        
        enhancedContent = await this.starStructureService.applySTARStructure(
          response.content,
          context.relevantExperiences,
          context.questionClassification
        );
      }

      // Apply personalization
      enhancedContent = await this.personalizationService.personalizeResponse(
        enhancedContent,
        context
      );

      enhancedResponses.push({
        ...response,
        content: enhancedContent
      });
    }

    return enhancedResponses;
  }

  private deduplicateResponses(responses: ResponseOption[]): ResponseOption[] {
    const seen = new Set<string>();
    const unique: ResponseOption[] = [];

    for (const response of responses) {
      // Create a normalized version for comparison
      const normalized = response.content
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(response);
      }
    }

    return unique;
  }

  private async generateFallbackResponses(request: ResponseGenerationRequest): Promise<ResponseOption[]> {
    const { question, context } = request;
    
    // Generate basic fallback responses
    const fallbackContent = this.createFallbackContent(question, context);
    
    return [
      {
        id: `fallback-${Date.now()}`,
        content: fallbackContent,
        structure: 'direct',
        estimatedDuration: 60,
        confidence: 0.5,
        tags: ['fallback'],
        tone: 'balanced',
        reasoning: 'Fallback response generated when AI services are unavailable'
      }
    ];
  }

  private createFallbackContent(question: string, context: PersonalizationContext): string {
    const { userProfile, jobContext } = context;
    
    let content = `Thank you for that question. `;
    
    // Add context-aware opening
    if (jobContext.title) {
      content += `As someone interested in the ${jobContext.title} position, `;
    }
    
    // Add experience reference
    if (userProfile.experience.length > 0) {
      const recentExp = userProfile.experience[0];
      content += `I can draw from my experience as ${recentExp.role} at ${recentExp.company}. `;
    }
    
    // Add skill reference
    if (userProfile.skills.length > 0) {
      const topSkill = userProfile.skills.find(s => s.level === 'expert' || s.level === 'advanced');
      if (topSkill) {
        content += `My expertise in ${topSkill.name} has prepared me to handle similar challenges. `;
      }
    }
    
    // Generic closing
    content += `I believe my background and skills align well with what you're looking for, and I'm excited about the opportunity to contribute to your team.`;
    
    return content;
  }
}