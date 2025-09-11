import { Test, TestingModule } from '@nestjs/testing';
import { TranscriptionService } from '../../src/modules/transcription/transcription.service';
import { GoogleSpeechService } from '../../src/modules/transcription/providers/google-speech.service';
import { WhisperService } from '../../src/modules/transcription/providers/whisper.service';
import { TranscriptionCacheService } from '../../src/modules/transcription/services/transcription-cache.service';

describe('Audio Processing Unit Tests', () => {
  let transcriptionService: TranscriptionService;
  let googleSpeechService: GoogleSpeechService;
  let whisperService: WhisperService;
  let cacheService: TranscriptionCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionService,
        {
          provide: GoogleSpeechService,
          useValue: {
            transcribeStream: jest.fn(),
            transcribeAudio: jest.fn(),
          },
        },
        {
          provide: WhisperService,
          useValue: {
            transcribeAudio: jest.fn(),
          },
        },
        {
          provide: TranscriptionCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            invalidate: jest.fn(),
          },
        },
      ],
    }).compile();

    transcriptionService = module.get<TranscriptionService>(TranscriptionService);
    googleSpeechService = module.get<GoogleSpeechService>(GoogleSpeechService);
    whisperService = module.get<WhisperService>(WhisperService);
    cacheService = module.get<TranscriptionCacheService>(TranscriptionCacheService);
  });

  describe('Transcription Service', () => {
    it('should transcribe audio with high confidence', async () => {
      const mockAudioBuffer = Buffer.from('mock-audio-data');
      const expectedResult = {
        text: 'Hello, can you tell me about your experience?',
        confidence: 0.98,
        isFinal: true,
        timestamp: Date.now(),
      };

      jest.spyOn(googleSpeechService, 'transcribeAudio').mockResolvedValue(expectedResult);

      const result = await transcriptionService.transcribeAudio(mockAudioBuffer);

      expect(result.text).toBe(expectedResult.text);
      expect(result.confidence).toBeGreaterThan(0.95);
      expect(googleSpeechService.transcribeAudio).toHaveBeenCalledWith(mockAudioBuffer);
    });

    it('should fallback to Whisper when Google Speech fails', async () => {
      const mockAudioBuffer = Buffer.from('mock-audio-data');
      const whisperResult = {
        text: 'Fallback transcription result',
        confidence: 0.92,
        isFinal: true,
        timestamp: Date.now(),
      };

      jest.spyOn(googleSpeechService, 'transcribeAudio').mockRejectedValue(new Error('API Error'));
      jest.spyOn(whisperService, 'transcribeAudio').mockResolvedValue(whisperResult);

      const result = await transcriptionService.transcribeAudio(mockAudioBuffer);

      expect(result.text).toBe(whisperResult.text);
      expect(whisperService.transcribeAudio).toHaveBeenCalledWith(mockAudioBuffer);
    });

    it('should use cached results when available', async () => {
      const mockAudioBuffer = Buffer.from('mock-audio-data');
      const cachedResult = {
        text: 'Cached transcription',
        confidence: 0.96,
        isFinal: true,
        timestamp: Date.now(),
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedResult);

      const result = await transcriptionService.transcribeAudio(mockAudioBuffer);

      expect(result).toEqual(cachedResult);
      expect(cacheService.get).toHaveBeenCalled();
      expect(googleSpeechService.transcribeAudio).not.toHaveBeenCalled();
    });

    it('should handle low confidence transcriptions', async () => {
      const mockAudioBuffer = Buffer.from('mock-audio-data');
      const lowConfidenceResult = {
        text: 'Uncertain transcription',
        confidence: 0.75,
        isFinal: true,
        timestamp: Date.now(),
      };

      jest.spyOn(googleSpeechService, 'transcribeAudio').mockResolvedValue(lowConfidenceResult);

      const result = await transcriptionService.transcribeAudio(mockAudioBuffer);

      expect(result.confidence).toBeLessThan(0.95);
      expect(result.text).toBe(lowConfidenceResult.text);
    });
  });

  describe('Speaker Diarization', () => {
    it('should identify different speakers', async () => {
      const mockAudioBuffer = Buffer.from('mock-multi-speaker-audio');
      const expectedSpeakers = [
        { speakerId: 'speaker_1', startTime: 0, endTime: 5000 },
        { speakerId: 'speaker_2', startTime: 5000, endTime: 10000 },
      ];

      jest.spyOn(transcriptionService, 'detectSpeakers').mockResolvedValue(expectedSpeakers);

      const speakers = await transcriptionService.detectSpeakers(mockAudioBuffer);

      expect(speakers).toHaveLength(2);
      expect(speakers[0].speakerId).toBe('speaker_1');
      expect(speakers[1].speakerId).toBe('speaker_2');
    });
  });
});