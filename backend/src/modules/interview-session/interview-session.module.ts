import { Module } from '@nestjs/common';
import { InterviewSessionService } from './interview-session.service';
import { InterviewSessionController } from './interview-session.controller';
import { InterviewSessionRepository } from './interview-session.repository';

@Module({
  controllers: [InterviewSessionController],
  providers: [
    InterviewSessionService,
    InterviewSessionRepository,
  ],
  exports: [InterviewSessionService],
})
export class InterviewSessionModule {}