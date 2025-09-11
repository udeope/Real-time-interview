import { Module } from '@nestjs/common';
import { PracticeService } from './practice.service';
import { PracticeController } from './practice.controller';
import { PracticeRepository } from './practice.repository';
import { QuestionBankService } from './services/question-bank.service';
import { PracticeAnalyticsService } from './services/practice-analytics.service';
import { FeedbackService } from './services/feedback.service';
import { DatabaseModule } from '../database/database.module';
import { ContextAnalysisModule } from '../context-analysis/context-analysis.module';
import { ResponseGenerationModule } from '../response-generation/response-generation.module';

@Module({
  imports: [DatabaseModule, ContextAnalysisModule, ResponseGenerationModule],
  controllers: [PracticeController],
  providers: [
    PracticeService,
    PracticeRepository,
    QuestionBankService,
    PracticeAnalyticsService,
    FeedbackService,
  ],
  exports: [PracticeService],
})
export class PracticeModule {}