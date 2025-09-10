import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResponseGenerationService } from './response-generation.service';
import { ResponseGenerationController } from './response-generation.controller';
import { ResponseCacheService } from './services/response-cache.service';
import { STARStructureService } from './services/star-structure.service';
import { ResponsePersonalizationService } from './services/response-personalization.service';
import { ResponseValidationService } from './services/response-validation.service';
import { OpenAIService } from './providers/openai.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [ResponseGenerationController],
  providers: [
    ResponseGenerationService,
    ResponseCacheService,
    STARStructureService,
    ResponsePersonalizationService,
    ResponseValidationService,
    OpenAIService,
  ],
  exports: [ResponseGenerationService],
})
export class ResponseGenerationModule {}