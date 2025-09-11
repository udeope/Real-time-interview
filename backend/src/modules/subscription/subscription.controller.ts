import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import {
  CreateCheckoutSessionDto,
  UpdateSubscriptionDto,
  UsageTrackingDto,
  SubscriptionResponseDto,
  BillingHistoryResponseDto,
  SubscriptionPlanResponseDto,
} from './dto/subscription.dto';
import { SubscriptionTier } from '@prisma/client';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getSubscription(@Request() req): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.getSubscription(req.user.id);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async updateSubscription(
    @Request() req,
    @Body() updateDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.updateSubscription(req.user.id, updateDto);
  }

  @Post('upgrade/:tier')
  @UseGuards(JwtAuthGuard)
  async upgradeSubscription(
    @Request() req,
    @Param('tier') tier: SubscriptionTier,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.upgradeSubscription(req.user.id, tier);
  }

  @Post('downgrade/:tier')
  @UseGuards(JwtAuthGuard)
  async downgradeSubscription(
    @Request() req,
    @Param('tier') tier: SubscriptionTier,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.downgradeSubscription(req.user.id, tier);
  }

  @Delete('cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@Request() req): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.cancelSubscription(req.user.id);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Request() req,
    @Body() createDto: CreateCheckoutSessionDto,
  ): Promise<{ url: string }> {
    return this.subscriptionService.createCheckoutSession(req.user.id, createDto);
  }

  @Get('billing-history')
  @UseGuards(JwtAuthGuard)
  async getBillingHistory(@Request() req): Promise<BillingHistoryResponseDto[]> {
    return this.subscriptionService.getBillingHistory(req.user.id);
  }

  @Get('plans')
  async getSubscriptionPlans(): Promise<SubscriptionPlanResponseDto[]> {
    return this.subscriptionService.getSubscriptionPlans();
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsageStats(@Request() req): Promise<Record<string, { usage: number; limit: number; percentage: number }>> {
    const usageTrackingService = this.subscriptionService['usageTrackingService'];
    return usageTrackingService.getUsageStats(req.user.id);
  }

  @Post('usage/track')
  @UseGuards(JwtAuthGuard)
  async trackUsage(@Request() req, @Body() usageDto: UsageTrackingDto): Promise<{ success: boolean }> {
    await this.subscriptionService.trackUsage(req.user.id, usageDto.feature, usageDto.increment);
    return { success: true };
  }

  @Get('usage/check/:feature')
  @UseGuards(JwtAuthGuard)
  async checkUsageLimit(
    @Request() req,
    @Param('feature') feature: string,
  ): Promise<{ allowed: boolean; usage: number; limit: number }> {
    return this.subscriptionService.checkUsageLimit(req.user.id, feature);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const stripeService = this.subscriptionService['stripeService'];
    const event = await stripeService.constructWebhookEvent(req.rawBody, signature);
    await this.subscriptionService.handleStripeWebhook(event);
    return { received: true };
  }
}