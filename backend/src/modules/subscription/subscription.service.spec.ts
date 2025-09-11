import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { DatabaseService } from '../../config/database.config';
import { StripeService } from './services/stripe.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaService: DatabaseService;
  let stripeService: StripeService;
  let usageTrackingService: UsageTrackingService;

  const mockPrismaService = {
    subscription: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    subscriptionPlan: {
      findMany: jest.fn(),
    },
    billingHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockStripeService = {
    createCheckoutSession: jest.fn(),
    upgradeSubscription: jest.fn(),
    downgradeSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    constructWebhookEvent: jest.fn(),
  };

  const mockUsageTrackingService = {
    initializeUsageTracking: jest.fn(),
    updateUsageLimits: jest.fn(),
    checkUsageLimit: jest.fn(),
    trackUsage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: DatabaseService,
          useValue: mockPrismaService,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: UsageTrackingService,
          useValue: mockUsageTrackingService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prismaService = module.get<DatabaseService>(DatabaseService);
    stripeService = module.get<StripeService>(StripeService);
    usageTrackingService = module.get<UsageTrackingService>(UsageTrackingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const createDto = {
        userId: 'user-1',
        tier: SubscriptionTier.PRO,
      };

      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.subscription.findUnique.mockResolvedValue(null);
      mockPrismaService.subscription.create.mockResolvedValue(mockSubscription);
      mockUsageTrackingService.initializeUsageTracking.mockResolvedValue(undefined);

      const result = await service.createSubscription(createDto);

      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: createDto.userId,
          tier: createDto.tier,
          stripeCustomerId: undefined,
          stripeSubscriptionId: undefined,
          status: SubscriptionStatus.ACTIVE,
        },
      });
      expect(mockUsageTrackingService.initializeUsageTracking).toHaveBeenCalledWith(
        mockSubscription.id,
        createDto.userId,
      );
      expect(result).toEqual({
        id: mockSubscription.id,
        userId: mockSubscription.userId,
        tier: mockSubscription.tier,
        status: mockSubscription.status,
        currentPeriodStart: undefined,
        currentPeriodEnd: undefined,
        cancelAtPeriodEnd: mockSubscription.cancelAtPeriodEnd,
        trialStart: undefined,
        trialEnd: undefined,
        createdAt: mockSubscription.createdAt,
        updatedAt: mockSubscription.updatedAt,
      });
    });

    it('should throw error if subscription already exists', async () => {
      const createDto = {
        userId: 'user-1',
        tier: SubscriptionTier.PRO,
      };

      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 'existing-sub',
        userId: 'user-1',
      });

      await expect(service.createSubscription(createDto)).rejects.toThrow(
        'User already has a subscription',
      );
    });
  });

  describe('getSubscription', () => {
    it('should return existing subscription', async () => {
      const userId = 'user-1';
      const mockSubscription = {
        id: 'sub-1',
        userId,
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.getSubscription(userId);

      expect(result.tier).toBe(SubscriptionTier.PRO);
      expect(result.userId).toBe(userId);
    });

    it('should create free subscription if none exists', async () => {
      const userId = 'user-1';
      const mockFreeSubscription = {
        id: 'sub-1',
        userId,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.subscription.findUnique.mockResolvedValue(null);
      mockPrismaService.subscription.create.mockResolvedValue(mockFreeSubscription);
      mockUsageTrackingService.initializeUsageTracking.mockResolvedValue(undefined);

      const result = await service.getSubscription(userId);

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith({
        data: {
          userId,
          tier: SubscriptionTier.FREE,
          stripeCustomerId: undefined,
          stripeSubscriptionId: undefined,
          status: SubscriptionStatus.ACTIVE,
        },
      });
    });
  });

  describe('upgradeSubscription', () => {
    it('should upgrade subscription tier', async () => {
      const userId = 'user-1';
      const newTier = SubscriptionTier.PRO;
      
      const currentSubscription = {
        id: 'sub-1',
        userId,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const upgradedSubscription = {
        ...currentSubscription,
        tier: newTier,
      };

      mockPrismaService.subscription.findUnique.mockResolvedValue(currentSubscription);
      mockPrismaService.subscription.update.mockResolvedValue(upgradedSubscription);
      mockUsageTrackingService.updateUsageLimits.mockResolvedValue(undefined);

      const result = await service.upgradeSubscription(userId, newTier);

      expect(result.tier).toBe(newTier);
      expect(mockUsageTrackingService.updateUsageLimits).toHaveBeenCalledWith(
        currentSubscription.id,
        newTier,
      );
    });

    it('should throw error if already on same tier', async () => {
      const userId = 'user-1';
      const tier = SubscriptionTier.PRO;
      
      const subscription = {
        id: 'sub-1',
        userId,
        tier,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.subscription.findUnique.mockResolvedValue(subscription);

      await expect(service.upgradeSubscription(userId, tier)).rejects.toThrow(
        'User is already on this subscription tier',
      );
    });
  });

  describe('checkUsageLimit', () => {
    it('should check usage limit for a feature', async () => {
      const userId = 'user-1';
      const feature = 'monthly_sessions';
      const expectedResult = { allowed: true, usage: 5, limit: 50 };

      mockUsageTrackingService.checkUsageLimit.mockResolvedValue(expectedResult);

      const result = await service.checkUsageLimit(userId, feature);

      expect(result).toEqual(expectedResult);
      expect(mockUsageTrackingService.checkUsageLimit).toHaveBeenCalledWith(userId, feature);
    });
  });

  describe('trackUsage', () => {
    it('should track usage for a feature', async () => {
      const userId = 'user-1';
      const feature = 'monthly_sessions';
      const increment = 1;

      mockUsageTrackingService.trackUsage.mockResolvedValue(undefined);

      await service.trackUsage(userId, feature, increment);

      expect(mockUsageTrackingService.trackUsage).toHaveBeenCalledWith(
        userId,
        feature,
        increment,
      );
    });
  });

  describe('getSubscriptionPlans', () => {
    it('should return all active subscription plans', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          tier: SubscriptionTier.FREE,
          name: 'Free Plan',
          priceMonthly: 0,
          features: ['Basic features'],
          limits: { monthly_sessions: 5 },
          isActive: true,
        },
        {
          id: 'plan-2',
          tier: SubscriptionTier.PRO,
          name: 'Pro Plan',
          priceMonthly: 29.99,
          features: ['Advanced features'],
          limits: { monthly_sessions: 50 },
          isActive: true,
        },
      ];

      mockPrismaService.subscriptionPlan.findMany.mockResolvedValue(mockPlans);

      const result = await service.getSubscriptionPlans();

      expect(result).toHaveLength(2);
      expect(result[0].tier).toBe(SubscriptionTier.FREE);
      expect(result[1].tier).toBe(SubscriptionTier.PRO);
    });
  });
});