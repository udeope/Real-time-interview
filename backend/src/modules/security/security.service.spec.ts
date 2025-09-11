import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';

// Services
import { EncryptionService } from './services/encryption.service';
import { AuditService, AuditAction } from './services/audit.service';
import { ConsentService, ConsentType } from './services/consent.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { DataRetentionService } from './services/data-retention.service';
import { GdprService } from './services/gdpr.service';
import { PrivacySettingsService } from './services/privacy-settings.service';

describe('Security Services', () => {
  let module: TestingModule;
  let prismaService: PrismaService;
  let encryptionService: EncryptionService;
  let auditService: AuditService;
  let consentService: ConsentService;
  let fraudDetectionService: FraudDetectionService;
  let dataRetentionService: DataRetentionService;
  let gdprService: GdprService;
  let privacySettingsService: PrivacySettingsService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userConsent: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    usagePattern: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    encryptionKey: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    dataExportRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    privacySetting: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    interviewSession: {
      count: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    audioChunk: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    transcriptionResult: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        ENCRYPTION_MASTER_KEY: 'test-master-key-32-characters-long',
        DATA_EXPORT_DIR: './test-exports',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        EncryptionService,
        AuditService,
        ConsentService,
        FraudDetectionService,
        DataRetentionService,
        GdprService,
        PrivacySettingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    auditService = module.get<AuditService>(AuditService);
    consentService = module.get<ConsentService>(ConsentService);
    fraudDetectionService = module.get<FraudDetectionService>(FraudDetectionService);
    dataRetentionService = module.get<DataRetentionService>(DataRetentionService);
    gdprService = module.get<GdprService>(GdprService);
    privacySettingsService = module.get<PrivacySettingsService>(PrivacySettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('EncryptionService', () => {
    const userId = 'test-user-id';
    const keyType = 'audio';

    it('should generate user encryption key', async () => {
      mockPrismaService.encryptionKey.upsert.mockResolvedValue({
        id: 'key-id',
        userId,
        keyType,
        keyHash: 'hashed-key',
        salt: 'salt',
        isActive: true,
      });

      const key = await encryptionService.generateUserKey(userId, keyType);
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(mockPrismaService.encryptionKey.upsert).toHaveBeenCalled();
    });

    it('should encrypt and decrypt data', async () => {
      const testData = 'sensitive test data';
      
      mockPrismaService.encryptionKey.findUnique.mockResolvedValue({
        id: 'key-id',
        userId,
        keyType,
        keyHash: 'hashed-key',
        salt: 'salt',
        isActive: true,
      });

      // Mock key generation for new user
      mockPrismaService.encryptionKey.upsert.mockResolvedValue({
        id: 'key-id',
        userId,
        keyType,
        keyHash: 'hashed-key',
        salt: 'salt',
        isActive: true,
      });

      const encrypted = await encryptionService.encryptData(testData, userId, keyType);
      
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
    });

    it('should hash and verify data', () => {
      const testData = 'password123';
      
      const hashed = encryptionService.hashData(testData);
      expect(hashed).toBeDefined();
      expect(hashed.includes(':')).toBe(true);
      
      const isValid = encryptionService.verifyHash(testData, hashed);
      expect(isValid).toBe(true);
      
      const isInvalid = encryptionService.verifyHash('wrongpassword', hashed);
      expect(isInvalid).toBe(false);
    });
  });

  describe('AuditService', () => {
    const userId = 'test-user-id';

    it('should log audit entry', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'audit-id',
        userId,
        action: AuditAction.LOGIN,
        success: true,
      });

      await auditService.log({
        userId,
        action: AuditAction.LOGIN,
        success: true,
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          action: AuditAction.LOGIN,
          success: true,
        }),
      });
    });

    it('should get user audit logs', async () => {
      const mockLogs = [
        { id: 'log1', action: AuditAction.LOGIN, createdAt: new Date() },
        { id: 'log2', action: AuditAction.LOGOUT, createdAt: new Date() },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const logs = await auditService.getUserAuditLogs(userId);
      
      expect(logs).toEqual(mockLogs);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
        select: expect.any(Object),
      });
    });

    it('should cleanup old logs', async () => {
      mockPrismaService.auditLog.deleteMany.mockResolvedValue({ count: 10 });

      const deletedCount = await auditService.cleanupOldLogs(365);
      
      expect(deletedCount).toBe(10);
      expect(mockPrismaService.auditLog.deleteMany).toHaveBeenCalled();
    });
  });

  describe('ConsentService', () => {
    const userId = 'test-user-id';

    it('should update user consent', async () => {
      mockPrismaService.userConsent.findUnique.mockResolvedValue(null);
      mockPrismaService.userConsent.create.mockResolvedValue({
        id: 'consent-id',
        userId,
        consentType: ConsentType.AUDIO_PROCESSING,
        granted: true,
      });

      await consentService.updateConsent(userId, {
        consentType: ConsentType.AUDIO_PROCESSING,
        granted: true,
        version: '1.0.0',
      });

      expect(mockPrismaService.userConsent.create).toHaveBeenCalled();
    });

    it('should check if user has consent', async () => {
      mockPrismaService.userConsent.findUnique.mockResolvedValue({
        id: 'consent-id',
        userId,
        consentType: ConsentType.AUDIO_PROCESSING,
        granted: true,
      });

      const hasConsent = await consentService.hasConsent(userId, ConsentType.AUDIO_PROCESSING);
      
      expect(hasConsent).toBe(true);
    });

    it('should get missing required consents', async () => {
      mockPrismaService.userConsent.findUnique
        .mockResolvedValueOnce(null) // AUDIO_PROCESSING not found
        .mockResolvedValueOnce({ granted: true }); // DATA_STORAGE found and granted

      const missing = await consentService.getMissingRequiredConsents(userId);
      
      expect(missing).toContain(ConsentType.AUDIO_PROCESSING);
    });
  });

  describe('FraudDetectionService', () => {
    const userId = 'test-user-id';

    it('should analyze user activity', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        subscriptionTier: 'free',
      });

      mockPrismaService.interviewSession.count.mockResolvedValue(3);
      mockPrismaService.auditLog.count.mockResolvedValue(50);
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const alerts = await fraudDetectionService.analyzeUserActivity(userId);
      
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should get user risk score', async () => {
      mockPrismaService.usagePattern.findMany.mockResolvedValue([
        { riskScore: { toNumber: () => 30 } },
        { riskScore: { toNumber: () => 40 } },
      ]);

      const riskScore = await fraudDetectionService.getUserRiskScore(userId);
      
      expect(typeof riskScore).toBe('number');
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(100);
    });

    it('should determine if user should be blocked', async () => {
      mockPrismaService.usagePattern.findMany.mockResolvedValue([
        { riskScore: { toNumber: () => 98 } },
      ]);

      const shouldBlock = await fraudDetectionService.shouldBlockUser(userId);
      
      expect(shouldBlock).toBe(true);
    });
  });

  describe('DataRetentionService', () => {
    it('should get retention policies', async () => {
      const mockPolicies = [
        { dataType: 'audio', retentionDays: 30, autoDelete: true },
        { dataType: 'transcription', retentionDays: 90, autoDelete: true },
      ];

      mockPrismaService.dataRetentionPolicy.findMany.mockResolvedValue(mockPolicies);

      const policies = await dataRetentionService.getRetentionPolicies();
      
      expect(policies).toEqual(mockPolicies.map(p => ({
        dataType: p.dataType,
        retentionDays: p.retentionDays,
        autoDelete: p.autoDelete,
        description: undefined,
      })));
    });

    it('should cleanup audio data', async () => {
      mockPrismaService.audioChunk.deleteMany.mockResolvedValue({ count: 5 });

      const result = await dataRetentionService.cleanupAudioData(30);
      
      expect(result.dataType).toBe('audio');
      expect(result.deletedCount).toBe(5);
      expect(result.errors).toHaveLength(0);
    });

    it('should update retention policy', async () => {
      mockPrismaService.dataRetentionPolicy.upsert.mockResolvedValue({
        dataType: 'audio',
        retentionDays: 60,
        autoDelete: true,
      });

      await dataRetentionService.updateRetentionPolicy('audio', 60, true);
      
      expect(mockPrismaService.dataRetentionPolicy.upsert).toHaveBeenCalledWith({
        where: { dataType: 'audio' },
        update: expect.objectContaining({
          retentionDays: 60,
          autoDelete: true,
        }),
        create: expect.objectContaining({
          dataType: 'audio',
          retentionDays: 60,
          autoDelete: true,
        }),
      });
    });
  });

  describe('PrivacySettingsService', () => {
    const userId = 'test-user-id';

    it('should get user privacy settings', async () => {
      const mockSettings = {
        userId,
        audioRetentionDays: 30,
        transcriptionRetentionDays: 90,
        analyticsEnabled: true,
        dataSharingEnabled: false,
        marketingEmailsEnabled: false,
        sessionRecordingEnabled: true,
        aiTrainingConsent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.privacySetting.findUnique.mockResolvedValue(mockSettings);

      const settings = await privacySettingsService.getUserPrivacySettings(userId);
      
      expect(settings).toMatchObject({
        audioRetentionDays: 30,
        transcriptionRetentionDays: 90,
        analyticsEnabled: true,
        dataSharingEnabled: false,
      });
    });

    it('should create default settings for new user', async () => {
      mockPrismaService.privacySetting.findUnique.mockResolvedValue(null);
      mockPrismaService.privacySetting.create.mockResolvedValue({
        userId,
        audioRetentionDays: 30,
        transcriptionRetentionDays: 90,
        analyticsEnabled: true,
        dataSharingEnabled: false,
        marketingEmailsEnabled: false,
        sessionRecordingEnabled: true,
        aiTrainingConsent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const settings = await privacySettingsService.getUserPrivacySettings(userId);
      
      expect(mockPrismaService.privacySetting.create).toHaveBeenCalled();
      expect(settings.audioRetentionDays).toBe(30);
    });

    it('should update privacy settings', async () => {
      const existingSettings = {
        userId,
        audioRetentionDays: 30,
        transcriptionRetentionDays: 90,
        analyticsEnabled: true,
        dataSharingEnabled: false,
        marketingEmailsEnabled: false,
        sessionRecordingEnabled: true,
        aiTrainingConsent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.privacySetting.findUnique.mockResolvedValue(existingSettings);
      mockPrismaService.privacySetting.upsert.mockResolvedValue({
        ...existingSettings,
        audioRetentionDays: 60,
        updatedAt: new Date(),
      });

      const updates = { audioRetentionDays: 60 };
      const updatedSettings = await privacySettingsService.updatePrivacySettings(userId, updates);
      
      expect(updatedSettings.audioRetentionDays).toBe(60);
      expect(mockPrismaService.privacySetting.upsert).toHaveBeenCalled();
    });
  });

  describe('GdprService', () => {
    const userId = 'test-user-id';

    it('should create export request', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
      });

      mockPrismaService.dataExportRequest.create.mockResolvedValue({
        id: 'export-request-id',
        userId,
        requestType: 'export',
        status: 'pending',
      });

      const requestId = await gdprService.createExportRequest({
        userId,
        requestType: 'export',
        dataTypes: ['profile', 'sessions'],
      });

      expect(requestId).toBe('export-request-id');
      expect(mockPrismaService.dataExportRequest.create).toHaveBeenCalled();
    });

    it('should get export request status', async () => {
      const mockRequest = {
        id: 'export-request-id',
        userId,
        requestType: 'export',
        status: 'completed',
        exportUrl: '/download/file.json',
      };

      mockPrismaService.dataExportRequest.findUnique.mockResolvedValue(mockRequest);

      const status = await gdprService.getExportRequestStatus('export-request-id');
      
      expect(status).toEqual(mockRequest);
    });
  });
});