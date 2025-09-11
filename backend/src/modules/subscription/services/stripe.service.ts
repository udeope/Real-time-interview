import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionTier } from '@prisma/client';

interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  successUrl?: string;
  cancelUrl?: string;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
    const { userId, userEmail, tier, billingCycle, successUrl, cancelUrl } = params;

    // Get price ID based on tier and billing cycle
    const priceId = this.getPriceId(tier, billingCycle);
    
    if (!priceId) {
      throw new BadRequestException(`No price configured for ${tier} ${billingCycle}`);
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      metadata: {
        userId,
        tier,
        billingCycle,
      },
      success_url: successUrl || `${this.configService.get('FRONTEND_URL')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${this.configService.get('FRONTEND_URL')}/subscription/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
    };

    // Add trial period for Pro and Enterprise plans
    if (tier !== SubscriptionTier.FREE) {
      sessionParams.subscription_data.trial_period_days = 14;
    }

    return this.stripe.checkout.sessions.create(sessionParams);
  }

  async createCustomer(email: string, name: string, userId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });
  }

  async upgradeSubscription(subscriptionId: string, newTier: SubscriptionTier): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = subscription.items.data[0];
    
    // Get the new price ID based on current billing cycle
    const currentPrice = await this.stripe.prices.retrieve(currentItem.price.id);
    const billingCycle = currentPrice.recurring?.interval === 'year' ? 'yearly' : 'monthly';
    const newPriceId = this.getPriceId(newTier, billingCycle);

    if (!newPriceId) {
      throw new BadRequestException(`No price configured for ${newTier} ${billingCycle}`);
    }

    return this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: currentItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  async downgradeSubscription(subscriptionId: string, newTier: SubscriptionTier): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = subscription.items.data[0];
    
    // Get the new price ID based on current billing cycle
    const currentPrice = await this.stripe.prices.retrieve(currentItem.price.id);
    const billingCycle = currentPrice.recurring?.interval === 'year' ? 'yearly' : 'monthly';
    const newPriceId = this.getPriceId(newTier, billingCycle);

    if (!newPriceId) {
      throw new BadRequestException(`No price configured for ${newTier} ${billingCycle}`);
    }

    // Schedule downgrade at period end to avoid immediate charges
    return this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: currentItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'none',
      billing_cycle_anchor: 'unchanged',
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async getCustomerPortalSession(customerId: string, returnUrl?: string): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${this.configService.get('FRONTEND_URL')}/subscription`,
    });
  }

  async constructWebhookEvent(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  private getPriceId(tier: SubscriptionTier, billingCycle: 'monthly' | 'yearly'): string | null {
    const priceMap = {
      [SubscriptionTier.FREE]: {
        monthly: null,
        yearly: null,
      },
      [SubscriptionTier.PRO]: {
        monthly: this.configService.get<string>('STRIPE_PRO_MONTHLY_PRICE_ID'),
        yearly: this.configService.get<string>('STRIPE_PRO_YEARLY_PRICE_ID'),
      },
      [SubscriptionTier.ENTERPRISE]: {
        monthly: this.configService.get<string>('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID'),
        yearly: this.configService.get<string>('STRIPE_ENTERPRISE_YEARLY_PRICE_ID'),
      },
    };

    return priceMap[tier]?.[billingCycle] || null;
  }
}