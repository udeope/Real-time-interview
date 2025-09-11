import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../config/database.config';
import { StripeService } from './services/stripe.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionResponseDto,
  CreateCheckoutSessionDto,
  BillingHistoryResponseDto,
  SubscriptionPlanResponseDto,
} from './dto/subscription.dto';
import { SubscriptionTier, SubscriptionStatus, Subscription } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly stripeService: StripeService,
    private readonly usageTrackingService: UsageTrackingService,
  ) {}

  async createSubscription(createDto: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { userId: createDto.userId },
    });

    if (existingSubscription) {
      throw new ConflictException('User already has a subscription');
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId: createDto.userId,
        tier: createDto.tier,
        stripeCustomerId: createDto.stripeCustomerId,
        stripeSubscriptionId: createDto.stripeSubscriptionId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // Initialize usage tracking for the new subscription
    await this.usageTrackingService.initializeUsageTracking(subscription.id, createDto.userId);

    return this.mapToResponseDto(subscription);
  }

  async getSubscription(userId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      // Create a free subscription if none exists
      return this.createSubscription({
        userId,
        tier: SubscriptionTier.FREE,
      });
    }

    return this.mapToResponseDto(subscription);
  }

  async updateSubscription(userId: string, updateDto: UpdateSubscriptionDto): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const updatedSubscription = await this.prisma.subscription.update({
      where: { userId },
      data: updateDto,
    });

    return this.mapToResponseDto(updatedSubscription);
  }

  async upgradeSubscription(userId: string, newTier: SubscriptionTier): Promise<SubscriptionResponseDto> {
    const subscription = await this.getSubscription(userId);
    
    if (subscription.tier === newTier) {
      throw new BadRequestException('User is already on this subscription tier');
    }

    // Handle Stripe subscription upgrade
    if (subscription.stripeSubscriptionId) {
      await this.stripeService.upgradeSubscription(subscription.stripeSubscriptionId, newTier);
    }

    const updatedSubscription = await this.updateSubscription(userId, {
      tier: newTier,
      status: SubscriptionStatus.ACTIVE,
    });

    // Update usage limits
    await this.usageTrackingService.updateUsageLimits(subscription.id, newTier);

    return updatedSubscription;
  }

  async downgradeSubscription(userId: string, newTier: SubscriptionTier): Promise<SubscriptionResponseDto> {
    const subscription = await this.getSubscription(userId);
    
    if (subscription.tier === newTier) {
      throw new BadRequestException('User is already on this subscription tier');
    }

    // Handle Stripe subscription downgrade
    if (subscription.stripeSubscriptionId) {
      await this.stripeService.downgradeSubscription(subscription.stripeSubscriptionId, newTier);
    }

    const updatedSubscription = await this.updateSubscription(userId, {
      tier: newTier,
      cancelAtPeriodEnd: true, // Downgrade at period end
    });

    return updatedSubscription;
  }

  async cancelSubscription(userId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.getSubscription(userId);

    // Cancel Stripe subscription
    if (subscription.stripeSubscriptionId) {
      await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);
    }

    const updatedSubscription = await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });

    return this.mapToResponseDto(updatedSubscription);

    return updatedSubscription;
  }

  async createCheckoutSession(userId: string, createDto: CreateCheckoutSessionDto): Promise<{ url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const checkoutSession = await this.stripeService.createCheckoutSession({
      userId,
      userEmail: user.email,
      tier: createDto.tier,
      billingCycle: createDto.billingCycle || 'monthly',
      successUrl: createDto.successUrl,
      cancelUrl: createDto.cancelUrl,
    });

    return { url: checkoutSession.url };
  }

  async getBillingHistory(userId: string): Promise<BillingHistoryResponseDto[]> {
    const billingHistory = await this.prisma.billingHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return billingHistory.map(bill => ({
      id: bill.id,
      amount: Number(bill.amount),
      currency: bill.currency,
      status: bill.status,
      description: bill.description,
      invoiceUrl: bill.invoiceUrl,
      paidAt: bill.paidAt,
      dueDate: bill.dueDate,
      createdAt: bill.createdAt,
    }));
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlanResponseDto[]> {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });

    return plans.map(plan => ({
      id: plan.id,
      tier: plan.tier,
      name: plan.name,
      description: plan.description,
      priceMonthly: Number(plan.priceMonthly),
      priceYearly: plan.priceYearly ? Number(plan.priceYearly) : undefined,
      features: plan.features as string[],
      limits: plan.limits as Record<string, number>,
      isActive: plan.isActive,
    }));
  }

  async checkUsageLimit(userId: string, feature: string): Promise<{ allowed: boolean; usage: number; limit: number }> {
    return this.usageTrackingService.checkUsageLimit(userId, feature);
  }

  async trackUsage(userId: string, feature: string, increment: number = 1): Promise<void> {
    await this.usageTrackingService.trackUsage(userId, feature, increment);
  }

  async handleStripeWebhook(event: any): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancellation(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;
    }
  }

  private async handleSubscriptionUpdate(stripeSubscription: any): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: this.mapStripeStatus(stripeSubscription.status),
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        },
      });
    }
  }

  private async handleSubscriptionCancellation(stripeSubscription: any): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
        },
      });
    }
  }

  private async handlePaymentSuccess(stripeInvoice: any): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeInvoice.subscription },
    });

    if (subscription) {
      await this.prisma.billingHistory.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          stripeInvoiceId: stripeInvoice.id,
          amount: stripeInvoice.amount_paid / 100, // Convert from cents
          currency: stripeInvoice.currency,
          status: 'SUCCEEDED',
          description: stripeInvoice.description,
          invoiceUrl: stripeInvoice.hosted_invoice_url,
          paidAt: new Date(stripeInvoice.status_transitions.paid_at * 1000),
        },
      });
    }
  }

  private async handlePaymentFailure(stripeInvoice: any): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeInvoice.subscription },
    });

    if (subscription) {
      await this.prisma.billingHistory.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          stripeInvoiceId: stripeInvoice.id,
          amount: stripeInvoice.amount_due / 100, // Convert from cents
          currency: stripeInvoice.currency,
          status: 'FAILED',
          description: stripeInvoice.description,
          dueDate: new Date(stripeInvoice.due_date * 1000),
        },
      });

      // Update subscription status
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.PAST_DUE },
      });
    }
  }

  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  private mapToResponseDto(subscription: Subscription): SubscriptionResponseDto {
    return {
      id: subscription.id,
      userId: subscription.userId,
      tier: subscription.tier,
      status: subscription.status,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeCustomerId: subscription.stripeCustomerId,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}