import { Module } from '@nestjs/common';
import { ContextAnalysisService } from './context-analysis.service';
import { ContextAnalysisController } from './context-analysis.controller';
import { QuestionClassificationService } from './services/question-classification.service';
import { UserProfileAnalysisService } from './services/user-profile-analysis.service';
import { JobDescriptionParsingService } from './services/job-description-parsing.service';
import { ConversationHistoryService } from './services/conversation-history.service';
import { ContextDataAggregationService } from './services/context-data-aggregation.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ContextAnalysisController],
  providers: [
    ContextAnalysisService,
    QuestionClassificationService,
    UserProfileAnalysisService,
    JobDescriptionParsingService,
    ConversationHistoryService,
    ContextDataAggregationService,
  ],
  exports: [
    ContextAnalysisService,
    QuestionClassificationService,
    UserProfileAnalysisService,
    JobDescriptionParsingService,
    ConversationHistoryService,
    ContextDataAggregationService,
  ],
})
export class ContextAnalysisModule {}