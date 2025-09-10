import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TranscriptionService } from './transcription.service';
import { TranscriptionRepository } from './transcription.repository';
import { GoogleSpeechService } from './providers/google-speech.service';
import { WhisperService } from './providers/whisper.service';
import { AudioProcessingService } from './services/audio-processing.service';
import { SpeakerDiarizationService } from './services/speaker-diarization.service';
import { TranscriptionCacheService } from './services/transcription-cache.service';
import { TranscriptionResult, TranscriptionConfig } from './interfaces/transcription.interface';
import { AudioChunkDto, AudioFormat } from './dto/transcription.dto';
import { of } from 'rxjs';

describe('TranscriptionService', () => {
  let service: TranscriptionService;
  let repository: jest.Mocked<TranscriptionRepository>;
  let googleSpeech: jest.Mocked<GoogleSpeechService>;
  let whisper: jest.Mocked<WhisperService>;
  let audioProcessor: jest.Mocked<AudioProcessingService>;
  let speakerDiarization: jest.Mocked<SpeakerDiarizationService>;
  let cache: jest.Mocked<TranscriptionCacheService>;

  const mockTranscriptionResult: TranscriptionResult = {
    id: 'test-id',
    sessionId: 'test-session',
    audioChunkId: 'test-chunk',
    text: 'Hello, this is a test transcription',
    confidence: 0.95,
    isFinal: true,
    provider: 'google',
    language: 'en-US',
    createdAt: new Date(),
  };

  const mockAudioChunk = Buffer.from('mock-audio-data');

  beforeEach(async () => {
    const mockRepository = {
      createTranscriptionResult: jest.fn(),
      getTranscriptionsBySession: jest.fn(),
      getTranscriptionsByInteraction: jest.fn(),
      createAudioChunk: jest.fn(),
      getAudioChunk: jest.fn(),
    };

    const mockGoogleSpeech = {
      getProviderName: jest.fn().mockReturnValue('google'),
      isAvailable: jest.fn().mockResolvedValue(true),
      transcribeAudio: jest.fn(),
      transcribeRealTime: jest.fn(),
    };

    const mockWhisper = {
      getProviderName: jest.fn().mockReturnValue('whisper'),
      isAvailable: jest.fn().mockResolvedValue(true),
      transcribeAudio: jest.fn(),
      transcribeRealTime: jest.fn(),
    };

    const mockAudioProcessor = {
      processAudioChunk: jest.fn(),
      extractAudioFeatures: jest.fn(),
      generateAudioHash: jest.fn(),
    };

    const mockSpeakerDiarization = {
      identifySpeakers: jest.fn(),
      assignSpeakerToTranscription: jest.fn(),
    };

    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      getStats: jest.fn(),
      cleanup: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionService,
        {
          provide: TranscriptionRepository,
          useValue: mockRepository,
        },
        {
          provide: GoogleSpeechService,
          useValue: mockGoogleSpeech,
        },
        {
          provide: WhisperService,
          useValue: mockWhisper,
        },
        {
          provide: AudioProcessingService,
          useValue: mockAudioProcessor,
        },
        {
          provide: SpeakerDiarizationService,
          useValue: mockSpeakerDiarization,
        },
        {
          provide: TranscriptionCacheService,
          useValue: mockCache,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
    repository = module.get(TranscriptionRepository);
    googleSpeech = module.get(GoogleSpeechService);
    whisper = module.get(WhisperService);
    audioProcessor = module.get(AudioProcessingService);
    speakerDiarization = module.get(SpeakerDiarizationService);
    cache = module.get(TranscriptionCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transcribeAudioChunk', () => {
    const mockAudioChunkDto: AudioChunkDto = {
      sessionId: 'test-session',
      chunkIndex: 0,
      audioData: Buffer.from('mock-audio-data').toString('base64'),
      format: AudioFormat.WEBM,
      sampleRate: 16000,
      channels: 1,
    };

    beforeEach(() => {
      audioProcessor.processAudioChunk.mockResolvedValue(mockAudioChunk);
      audioProcessor.generateAudioHash.mockReturnValue('mock-hash');
      audioProcessor.extractAudioFeatures.mockResolvedValue({
        duration: 5.0,
        sampleRate: 16000,
        channels: 1,
        format: 'webm',
        size: 1024,
      });
      
      repository.createAudioChunk.mockResolvedValue({
        id: 'test-chunk-id',
        sessionId: 'test-session',
        chunkIndex: 0,
        format: 'webm',
        sampleRate: 16000,
        channels: 1,
        createdAt: new Date(),
      });

      repository.createTranscriptionResult.mockResolvedValue(mockTranscriptionResult);
    });

    it('should transcribe audio chunk successfully', async () => {
      cache.get.mockResolvedValue(null);
      googleSpeech.transcribeAudio.mockResolvedValue(mockTranscriptionResult);

      const result = await service.transcribeAudioChunk(mockAudioChunkDto);

      expect(result).toBeDefined();
      expect(result.text).toBe('Hello, this is a test transcription');
      expect(result.confidence).toBe(0.95);
      expect(audioProcessor.processAudioChunk).toHaveBeenCalledWith(mockAudioChunk, AudioFormat.WEBM);
      expect(googleSpeech.transcribeAudio).toHaveBeenCalled();
      expect(repository.createTranscriptionResult).toHaveBeenCalled();
    });

    it('should use cached result when available', async () => {
      cache.get.mockResolvedValue(mockTranscriptionResult);

      const result = await service.transcribeAudioChunk(mockAudioChunkDto);

      expect(result).toBeDefined();
      expect(result.text).toBe('Hello, this is a test transcription');
      expect(googleSpeech.transcribeAudio).not.toHaveBeenCalled();
    });

    it('should handle transcription errors gracefully', async () => {
      cache.get.mockResolvedValue(null);
      googleSpeech.transcribeAudio.mockRejectedValue(new Error('Transcription failed'));

      await expect(service.transcribeAudioChunk(mockAudioChunkDto)).rejects.toThrow('Transcription failed');
    });

    it('should apply speaker diarization when enabled', async () => {
      const configWithDiarization = { ...mockAudioChunkDto, config: { enableSpeakerDiarization: true } };
      
      cache.get.mockResolvedValue(null);
      googleSpeech.transcribeAudio.mockResolvedValue(mockTranscriptionResult);
      speakerDiarization.identifySpeakers.mockResolvedValue([
        {
          speakerId: 'speaker_1',
          confidence: 0.9,
          startTime: 0,
          endTime: 5,
        },
      ]);

      const result = await service.transcribeAudioChunk(configWithDiarization);

      expect(speakerDiarization.identifySpeakers).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('transcribeRealTime', () => {
    it('should return observable for real-time transcription', () => {
      const audioStream = of(mockAudioChunk);
      const config: TranscriptionConfig = { provider: 'google' };

      const resultStream = service.transcribeRealTime('test-session', audioStream, config);

      expect(resultStream).toBeDefined();
      expect(typeof resultStream.subscribe).toBe('function');
    });
  });

  describe('refineTranscription', () => {
    it('should refine transcription using Whisper', async () => {
      const refinedResult = { ...mockTranscriptionResult, provider: 'whisper' as const, confidence: 0.98 };
      
      repository.getTranscriptionsBySession.mockResolvedValue([mockTranscriptionResult]);
      repository.getAudioChunk.mockResolvedValue({
        id: 'test-chunk-id',
        sessionId: 'test-session',
        chunkIndex: 0,
        audioData: mockAudioChunk,
        format: 'webm',
        sampleRate: 16000,
        channels: 1,
        createdAt: new Date(),
      });
      whisper.transcribeAudio.mockResolvedValue(refinedResult);
      repository.createTranscriptionResult.mockResolvedValue(refinedResult);

      const result = await service.refineTranscription('test-id');

      expect(result).toBeDefined();
      expect(result.provider).toBe('whisper');
      expect(result.confidence).toBe(0.98);
      expect(whisper.transcribeAudio).toHaveBeenCalled();
    });

    it('should throw error when transcription not found', async () => {
      repository.getTranscriptionsBySession.mockResolvedValue([]);

      await expect(service.refineTranscription('non-existent-id')).rejects.toThrow('Transcription not found');
    });
  });

  describe('getTranscriptionsBySession', () => {
    it('should return transcriptions for a session', async () => {
      repository.getTranscriptionsBySession.mockResolvedValue([mockTranscriptionResult]);

      const results = await service.getTranscriptionsBySession('test-session');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockTranscriptionResult);
      expect(repository.getTranscriptionsBySession).toHaveBeenCalledWith('test-session');
    });
  });

  describe('assessTranscriptionQuality', () => {
    it('should assess transcription quality', async () => {
      repository.getTranscriptionsBySession.mockResolvedValue([
        mockTranscriptionResult,
        { ...mockTranscriptionResult, confidence: 0.85, text: 'Another test transcription' },
      ]);

      const quality = await service.assessTranscriptionQuality('test-session');

      expect(quality).toBeDefined();
      expect(quality.averageConfidence).toBeCloseTo(0.9); // (0.95 + 0.85) / 2
      expect(quality.totalWords).toBeGreaterThan(0);
      expect(quality.wordErrorRate).toBeLessThan(1);
    });

    it('should handle empty transcription list', async () => {
      repository.getTranscriptionsBySession.mockResolvedValue([]);

      const quality = await service.assessTranscriptionQuality('test-session');

      expect(quality.wordErrorRate).toBe(1.0);
      expect(quality.averageConfidence).toBe(0);
      expect(quality.totalWords).toBe(0);
    });
  });
});