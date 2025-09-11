import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './services/metrics.service';
import { AnalyticsService } from './services/analytics.service';
import { PerformanceMonitoringService } from './services/performance-monitoring.service';
import { UserSatisfactionService } from './services/user-satisfaction.service';
import { SystemHealthService } from './services/system-health.service';
import { MonitoringIntegrationService } from './services/monitoring-integration.service';
import { DatabaseService } from '../../config/database.config';

describe('MonitoringServices', () => {
  let metricsService: MetricsService;
  let analyticsService: AnalyticsService;
  let performanceService: PerformanceMonitoringService;
  let satisfactionService: UserSatisfactionService;
  let healthService: SystemHealthService;
  let integrationService: MonitoringIntegrationService;
  let prismaService: DatabaseService;

  const mockPrismaService = {
    performanceMetrics: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    accuracyMetrics: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    userSatisfactionMetrics: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    usageAnalytics: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    interviewSession: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        AnalyticsService,
        PerformanceMonitoringService,
        UserSatisfactionService,
        SystemHealthService,
        MonitoringIntegrationService,
        {
          provide: DatabaseService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    metricsService = module.get<MetricsService>(MetricsService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    performanceService = module.get<PerformanceMonitoringService>(PerformanceMonitoringService);
    satisfactionService = module.get<UserSatisfactionService>(UserSatisfactionService);
    healthService = module.get<SystemHealthService>(SystemHealthService);
    integrationService = module.get<MonitoringIntegrationService>(MonitoringIntegrationService);
    prismaService = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MetricsService', () => {
    it('should record performance metrics', async () => {
      const metrics = {
        sessionId: 'session-1',
        userId: 'user-1',
        transcriptionLatency: 500,
        responseGenerationLatency: 800,
        totalLatency: 1300,
        timestamp: new Date(),
      };

      mockPrismaService.performanceMetrics.create.mockResolvedValue(metrics);

      await metricsService.recordPerformanceMetrics(metrics);

      expect(mockPrismaService.performanceMetrics.create).toHaveBeenCalledWith({
        data: metrics,
      });
    });

    it('should calculate WER correctly', async () => {
      const actualText = 'hello world test';
      const transcribedText = 'hello word test';

      const wer = await metricsService.calculateWER(actualText, transcribedText);

      // Should be 1/3 = 0.333... (one substitution out of three words)
      expect(wer).toBeCloseTo(0.333, 2);
    });

    it('should record accuracy metrics', async () => {
      const metrics = {
        transcriptionId: 'trans-1',
        wordErrorRate: 0.05,
        confidenceScore: 0.95,
        actualText: 'hello world',
        transcribedText: 'hello world',
        timestamp: new Date(),
      };

      mockPrismaService.accuracyMetrics.create.mockResolvedValue(metrics);

      await metricsService.recordAccuracyMetrics(metrics);

      expect(mockPrismaService.accuracyMetrics.create).toHaveBeenCalledWith({
        data: metrics,
      });
    });
  });

  describe('AnalyticsService', () => {
    it('should track feature usage', async () => {
      const analytics = {
        userId: 'user-1',
        sessionId: 'session-1',
        feature: 'transcription',
        action: 'process',
        metadata: { latency: 500 },
        timestamp: expect.any(Date),
      };

      mockPrismaService.usageAnalytics.create.mockResolvedValue(analytics);

      await analyticsService.trackFeatureUsage(
        'user-1',
        'session-1',
        'transcription',
        'process',
        { latency: 500 }
      );

      expect(mockPrismaService.usageAnalytics.create).toHaveBeenCalledWith({
        data: analytics,
      });
    });

    it('should generate business intelligence report', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      mockPrismaService.user.count.mockResolvedValue(100);
      mockPrismaService.usageAnalytics.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      mockPrismaService.usageAnalytics.groupBy.mockResolvedValue([
        { feature: 'transcription', _count: { feature: 50 } },
      ]);
      mockPrismaService.interviewSession.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);
      mockPrismaService.interviewSession.aggregate.mockResolvedValue({
        _count: { id: 5 },
      });

      const report = await analyticsService.generateBusinessIntelligenceReport(timeRange);

      expect(report).toHaveProperty('totalUsers', 100);
      expect(report).toHaveProperty('activeUsers');
      expect(report).toHaveProperty('featureAdoption');
      expect(report).toHaveProperty('conversionRate');
      expect(report).toHaveProperty('churnRate');
    });
  });

  describe('PerformanceMonitoringService', () => {
    it('should track operation latency', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      
      const result = await performanceService.trackLatency(
        'test-operation',
        'session-1',
        'user-1',
        mockOperation
      );

      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should handle operation errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(
        performanceService.trackLatency(
          'test-operation',
          'session-1',
          'user-1',
          mockOperation
        )
      ).rejects.toThrow('Test error');
    });

    it('should calculate system metrics', async () => {
      const cpuUsage = await performanceService['getCpuUsage']();
      const memoryUsage = performanceService['getMemoryUsage']();

      expect(typeof cpuUsage).toBe('number');
      expect(typeof memoryUsage).toBe('number');
      expect(cpuUsage).toBeGreaterThanOrEqual(0);
      expect(memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('UserSatisfactionService', () => {
    it('should record user feedback', async () => {
      const feedback = {
        sessionId: 'session-1',
        userId: 'user-1',
        rating: 5,
        feedback: 'Great service!',
        featureUsed: 'transcription',
        timestamp: expect.any(Date),
      };

      mockPrismaService.userSatisfactionMetrics.create.mockResolvedValue(feedback);

      await satisfactionService.recordFeedback(
        'session-1',
        'user-1',
        5,
        'transcription',
        'Great service!'
      );

      expect(mockPrismaService.userSatisfactionMetrics.create).toHaveBeenCalledWith({
        data: feedback,
      });
    });

    it('should calculate satisfaction metrics', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const mockMetrics = [
        { rating: 5, featureUsed: 'transcription' },
        { rating: 4, featureUsed: 'transcription' },
        { rating: 3, featureUsed: 'responses' },
      ];

      mockPrismaService.userSatisfactionMetrics.findMany.mockResolvedValue(mockMetrics);

      const metrics = await satisfactionService.getSatisfactionMetrics(timeRange);

      expect(metrics.averageRating).toBe(4);
      expect(metrics.totalResponses).toBe(3);
      expect(metrics.ratingDistribution).toEqual({ 3: 1, 4: 1, 5: 1 });
    });

    it('should calculate NPS score', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const mockRatings = [
        { rating: 5 }, // Promoter (10 on 0-10 scale)
        { rating: 5 }, // Promoter (10 on 0-10 scale)
        { rating: 4 }, // Passive (7.5 on 0-10 scale)
        { rating: 2 }, // Detractor (2.5 on 0-10 scale)
      ];

      mockPrismaService.userSatisfactionMetrics.findMany.mockResolvedValue(mockRatings);

      const npsScore = await satisfactionService.getNPSScore(timeRange);

      // 2 promoters, 1 detractor out of 4 = (2-1)/4 * 100 = 25
      expect(npsScore).toBe(25);
    });
  });

  describe('SystemHealthService', () => {
    it('should check system health', async () => {
      const healthStatus = await healthService.checkSystemHealth();

      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('issues');
      expect(Array.isArray(healthStatus.issues)).toBe(true);
    });

    it('should manage alert thresholds', () => {
      const initialThresholds = healthService.getAlertThresholds();
      expect(Array.isArray(initialThresholds)).toBe(true);

      healthService.updateAlertThreshold('testMetric', {
        threshold: 50,
        operator: 'gt',
        severity: 'high',
        enabled: true,
      });

      const updatedThresholds = healthService.getAlertThresholds();
      const testThreshold = updatedThresholds.find(t => t.metric === 'testMetric');
      
      expect(testThreshold).toBeDefined();
      expect(testThreshold?.threshold).toBe(50);
    });
  });

  describe('MonitoringIntegrationService', () => {
    it('should record transcription metrics', async () => {
      const recordPerformanceSpy = jest.spyOn(metricsService, 'recordPerformanceMetrics');
      const recordAccuracySpy = jest.spyOn(metricsService, 'recordAccuracyMetrics');
      const trackFeatureSpy = jest.spyOn(analyticsService, 'trackFeatureUsage');

      await integrationService.recordTranscriptionMetrics(
        'session-1',
        'user-1',
        500,
        0.95,
        0.98
      );

      expect(recordPerformanceSpy).toHaveBeenCalled();
      expect(recordAccuracySpy).toHaveBeenCalled();
      expect(trackFeatureSpy).toHaveBeenCalled();
    });

    it('should record user interactions', async () => {
      const trackFeatureSpy = jest.spyOn(analyticsService, 'trackFeatureUsage');

      await integrationService.recordUserInteraction(
        'user-1',
        'session-1',
        'transcription',
        'start'
      );

      expect(trackFeatureSpy).toHaveBeenCalledWith(
        'user-1',
        'session-1',
        'transcription',
        'start',
        undefined
      );
    });

    it('should record session lifecycle events', async () => {
      const trackFeatureSpy = jest.spyOn(analyticsService, 'trackFeatureUsage');
      const trackSessionSpy = jest.spyOn(analyticsService, 'trackSessionDuration');

      await integrationService.recordSessionStart('session-1', 'user-1');
      await integrationService.recordSessionEnd('session-1', 'user-1', 1800);

      expect(trackFeatureSpy).toHaveBeenCalledWith(
        'user-1',
        'session-1',
        'session',
        'start'
      );
      expect(trackSessionSpy).toHaveBeenCalledWith('session-1', 'user-1', 1800);
    });
  });
});