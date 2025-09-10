import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContextAnalysisService } from './context-analysis.service';
import {
  ClassifyQuestionDto,
  JobContextDto,
  UpdateConversationHistoryDto,
  GetRelevantContextDto,
  QuestionClassificationResponseDto,
  ContextDataResponseDto
} from './dto/context-analysis.dto';

@Controller('context-analysis')
@UseGuards(JwtAuthGuard)
export class ContextAnalysisController {
  private readonly logger = new Logger(ContextAnalysisController.name);

  constructor(private readonly contextAnalysisService: ContextAnalysisService) {}

  @Post('classify-question')
  async classifyQuestion(@Body() classifyQuestionDto: ClassifyQuestionDto) {
    try {
      this.logger.debug(`Classifying question: ${classifyQuestionDto.question.substring(0, 50)}...`);

      const classification = await this.contextAnalysisService.classifyQuestion(
        classifyQuestionDto.question,
        classifyQuestionDto.context,
        classifyQuestionDto.jobContext
      );

      return {
        success: true,
        data: classification
      };
    } catch (error) {
      this.logger.error(`Error classifying question: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to classify question',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('user-profile/:userId')
  async analyzeUserProfile(@Param('userId') userId: string) {
    try {
      this.logger.debug(`Analyzing user profile for user: ${userId}`);

      const userProfile = await this.contextAnalysisService.analyzeUserProfile(userId);

      return {
        success: true,
        data: userProfile
      };
    } catch (error) {
      this.logger.error(`Error analyzing user profile: ${error.message}`, error.stack);
      
      if (error.message.includes('not found')) {
        throw new HttpException('User profile not found', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        'Failed to analyze user profile',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('extract-job-context')
  async extractJobContext(@Body('jobDescription') jobDescription: string) {
    try {
      this.logger.debug(`Extracting job context from description: ${jobDescription.substring(0, 50)}...`);

      if (!jobDescription || jobDescription.trim().length === 0) {
        throw new HttpException('Job description is required', HttpStatus.BAD_REQUEST);
      }

      const jobContext = await this.contextAnalysisService.extractJobContext(jobDescription);

      return {
        success: true,
        data: jobContext
      };
    } catch (error) {
      this.logger.error(`Error extracting job context: ${error.message}`, error.stack);
      
      if (error.status === HttpStatus.BAD_REQUEST) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to extract job context',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('match-requirements')
  async matchRequirements(
    @Body() body: { jobContext: JobContextDto; userId: string }
  ) {
    try {
      this.logger.debug(`Matching requirements for user: ${body.userId}, job: ${body.jobContext.title}`);

      if (!body.jobContext || !body.userId) {
        throw new HttpException('Job context and user ID are required', HttpStatus.BAD_REQUEST);
      }

      const matches = await this.contextAnalysisService.matchRequirements(
        body.jobContext,
        body.userId
      );

      return {
        success: true,
        data: matches
      };
    } catch (error) {
      this.logger.error(`Error matching requirements: ${error.message}`, error.stack);
      
      if (error.status === HttpStatus.BAD_REQUEST) {
        throw error;
      }
      
      if (error.message.includes('not found')) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        'Failed to match requirements',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('conversation-history')
  async updateConversationHistory(@Body() updateDto: UpdateConversationHistoryDto) {
    try {
      this.logger.debug(`Updating conversation history for session: ${updateDto.sessionId}`);

      await this.contextAnalysisService.updateConversationHistory(
        updateDto.sessionId,
        updateDto.question,
        updateDto.response,
        updateDto.feedback,
        updateDto.duration
      );

      return {
        success: true,
        message: 'Conversation history updated successfully'
      };
    } catch (error) {
      this.logger.error(`Error updating conversation history: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to update conversation history',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('conversation-history/:sessionId')
  async getConversationHistory(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string
  ) {
    try {
      this.logger.debug(`Getting conversation history for session: ${sessionId}`);

      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const history = await this.contextAnalysisService.getConversationHistory(sessionId, parsedLimit);

      return {
        success: true,
        data: history
      };
    } catch (error) {
      this.logger.error(`Error getting conversation history: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get conversation history',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('relevant-context')
  async getRelevantContext(@Body() getContextDto: GetRelevantContextDto) {
    try {
      this.logger.debug(`Getting relevant context for user: ${getContextDto.userId}`);

      const contextData = await this.contextAnalysisService.getRelevantContext(
        getContextDto.userId,
        getContextDto.question,
        getContextDto.sessionId,
        getContextDto.jobContext
      );

      return {
        success: true,
        data: contextData
      };
    } catch (error) {
      this.logger.error(`Error getting relevant context: ${error.message}`, error.stack);
      
      if (error.message.includes('not found')) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        'Failed to get relevant context',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze-question-context')
  async analyzeQuestionContext(
    @Body() body: {
      question: string;
      userId: string;
      sessionId?: string;
      jobContext?: JobContextDto;
    }
  ) {
    try {
      this.logger.debug(`Analyzing question context for user: ${body.userId}`);

      if (!body.question || !body.userId) {
        throw new HttpException('Question and user ID are required', HttpStatus.BAD_REQUEST);
      }

      const analysis = await this.contextAnalysisService.analyzeQuestionContext(
        body.question,
        body.userId,
        body.sessionId,
        body.jobContext
      );

      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      this.logger.error(`Error analyzing question context: ${error.message}`, error.stack);
      
      if (error.status === HttpStatus.BAD_REQUEST) {
        throw error;
      }
      
      if (error.message.includes('not found')) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        'Failed to analyze question context',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('conversation-stats/:sessionId')
  async getConversationStats(@Param('sessionId') sessionId: string) {
    try {
      this.logger.debug(`Getting conversation stats for session: ${sessionId}`);

      const stats = await this.contextAnalysisService.getConversationStats(sessionId);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      this.logger.error(`Error getting conversation stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get conversation stats',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('conversation-context/:sessionId')
  async getConversationContext(
    @Param('sessionId') sessionId: string,
    @Query('currentQuestion') currentQuestion: string
  ) {
    try {
      this.logger.debug(`Getting conversation context for session: ${sessionId}`);

      if (!currentQuestion) {
        throw new HttpException('Current question is required', HttpStatus.BAD_REQUEST);
      }

      const context = await this.contextAnalysisService.getConversationContext(sessionId, currentQuestion);

      return {
        success: true,
        data: context
      };
    } catch (error) {
      this.logger.error(`Error getting conversation context: ${error.message}`, error.stack);
      
      if (error.status === HttpStatus.BAD_REQUEST) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to get conversation context',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('similar-questions/:userId')
  async findSimilarQuestions(
    @Param('userId') userId: string,
    @Query('question') question: string,
    @Query('limit') limit?: string
  ) {
    try {
      this.logger.debug(`Finding similar questions for user: ${userId}`);

      if (!question) {
        throw new HttpException('Question parameter is required', HttpStatus.BAD_REQUEST);
      }

      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const similarQuestions = await this.contextAnalysisService.findSimilarQuestions(
        question,
        userId,
        parsedLimit
      );

      return {
        success: true,
        data: similarQuestions
      };
    } catch (error) {
      this.logger.error(`Error finding similar questions: ${error.message}`, error.stack);
      
      if (error.status === HttpStatus.BAD_REQUEST) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to find similar questions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('recent-question-types/:sessionId')
  async getRecentQuestionTypes(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string
  ) {
    try {
      this.logger.debug(`Getting recent question types for session: ${sessionId}`);

      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const questionTypes = await this.contextAnalysisService.getRecentQuestionTypes(sessionId, parsedLimit);

      return {
        success: true,
        data: questionTypes
      };
    } catch (error) {
      this.logger.error(`Error getting recent question types: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to get recent question types',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}