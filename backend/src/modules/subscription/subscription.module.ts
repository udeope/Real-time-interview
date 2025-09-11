import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { StripeService } from './services/stripe.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { DatabaseService } from '../../config/database.config';

@Module({
  imports: [ConfigModule],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    StripeService,
    UsageTrackingService,
    DatabaseService,
  ],
  exports: [SubscriptionService, UsageTrackingService],
})
export class SubscriptionModule {}