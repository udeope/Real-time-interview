import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Query, 
  Delete, 
  UseGuards,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ResponseGenerationService } from './response-generation.service';
import { 
  GenerateResponsesDto, 
  GenerateResponsesResponseDto,
  ValidateResponseDto,
  ResponseValidationResultDto
} from './dto/response-generation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('response-generation')
@UseGuards(JwtAuthGuard)
export class ResponseGenerationController {
  constructor(
    private readonly responseGenerationService: ResponseGenerationService
  ) {}

  /**
   * Generate response options for an interview question
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateResponses(
    @Body() generateResponsesDto: GenerateResponsesDto,
    @CurrentUser() user: any
  ): Promise<GenerateResponsesResponseDto> {
    const request = {
      question: generateResponsesDto.question,
      userId: generateResponsesDto.userId || user.id,
      sessionId: generateResponsesDto.sessionId,
      context: {
        ...generateResponsesDto.context,
        questionClassification: generateResponsesDto.questionClassification || {
          type: 'behavioral' as const,
          category: 'general',
          difficulty: 'mid' as const,
          requiresSTAR: false,
          confidence: 0.7,
          keywords: []
        }
      },
      options: {
        responseCount: 3,
        maxDuration: 90,
        includeReasoning: true
      }
    };

    const result = await this.responseGenerationService.generateResponses(request);

    return {
      responses: result.responses,
      processingTimeMs: result.processingTimeMs,
      fromCache: result.fromCache
    };
  }

  /**
   * Apply STAR method structure to a response
   */
  @Post('apply-star')
  @HttpCode(HttpStatus.OK)
  async applySTARStructure(
    @Body() body: {
      content: string;
      experiences: any[];
      questionClassification?: any;
    }
  ): Promise<{ structuredResponse: string }> {
    const structuredResponse = await this.responseGenerationService.applySTARStructure(
      body.content,
      body.experiences,
      body.questionClassification
    );

    return { structuredResponse };
  }

  /**
   * Personalize a response template
   */
  @Post('personalize')
  @HttpCode(HttpStatus.OK)
  async personalizeResponse(
    @Body() body: {
      template: string;
      context: any;
    }
  ): Promise<{ personalizedResponse: string }> {
    const personalizedResponse = await this.responseGenerationService.personalizeResponse(
      body.template,
      body.context
    );

    return { personalizedResponse };
  }

  /**
   * Validate response length and quality
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateResponse(
    @Body() validateResponseDto: ValidateResponseDto
  ): Promise<ResponseValidationResultDto> {
    const result = await this.responseGenerationService.validateResponse(
      validateResponseDto.response,
      validateResponseDto.maxDurationSeconds
    );

    return {
      isValid: result.isValid,
      estimatedDurationSeconds: result.estimatedDurationSeconds,
      wordCount: result.wordCount,
      issues: result.issues,
      optimizedResponse: result.optimizedResponse
    };
  }

  /**
   * Get cache statistics
   */
  @Get('cache/stats')
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
    topQuestions: Array<{ question: string; hits: number }>;
  }> {
    return this.responseGenerationService.getCacheStats();
  }

  /**
   * Clear response cache
   */
  @Delete('cache')
  @HttpCode(HttpStatus.OK)
  async clearCache(
    @Query('pattern') pattern?: string
  ): Promise<{ deletedCount: number }> {
    const deletedCount = await this.responseGenerationService.clearCache(pattern);
    return { deletedCount };
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    services: {
      openai: string;
      cache: string;
      validation: string;
    };
  }> {
    // Basic health check - in production, you might want to ping actual services
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        openai: 'available',
        cache: 'available',
        validation: 'available'
      }
    };
  }
}