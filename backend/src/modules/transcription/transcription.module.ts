import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TranscriptionService } from './transcription.service';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionRepository } from './transcription.repository';
import { GoogleSpeechService } from './providers/google-speech.service';
import { WhisperService } from './providers/whisper.service';
import { SpeakerDiarizationService } from './services/speaker-diarization.service';
import { TranscriptionCacheService } from './services/transcription-cache.service';
import { AudioProcessingService } from './services/audio-processing.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [TranscriptionController],
  providers: [
    TranscriptionService,
    TranscriptionRepository,
    GoogleSpeechService,
    WhisperService,
    SpeakerDiarizationService,
    TranscriptionCacheService,
    AudioProcessingService,
  ],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}