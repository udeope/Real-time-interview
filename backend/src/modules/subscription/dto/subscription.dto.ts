import { IsEnum, IsOptional, IsString, IsBoolean, IsNumber, IsDateString } from 'class-validator';
import { SubscriptionTier, SubscriptionStatus, PaymentStatus } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsString()
  userId: string;

  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @IsOptional()
  @IsString()
  stripeCustomerId?: string;

  @IsOptional()
  @IsString()
  stripeSubscriptionId?: string;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @IsOptional()
  @IsDateString()
  currentPeriodStart?: string;

  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;

  @IsOptional()
  @IsDateString()
  canceledAt?: string;
}

export class SubscriptionResponseDto {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateCheckoutSessionDto {
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @IsString()
  @IsOptional()
  billingCycle?: 'monthly' | 'yearly';

  @IsString()
  @IsOptional()
  successUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;
}

export class UsageTrackingDto {
  @IsString()
  feature: string;

  @IsNumber()
  @IsOptional()
  increment?: number;
}

export class BillingHistoryResponseDto {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  invoiceUrl?: string;
  paidAt?: Date;
  dueDate?: Date;
  createdAt: Date;
}

export class SubscriptionPlanResponseDto {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  features: string[];
  limits: Record<string, number>;
  isActive: boolean;
}