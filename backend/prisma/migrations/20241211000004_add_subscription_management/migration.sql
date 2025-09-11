-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID', 'TRIALING');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_monthly" DECIMAL(10,2) NOT NULL,
    "price_yearly" DECIMAL(10,2),
    "features" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "stripe_price_id_monthly" TEXT,
    "stripe_price_id_yearly" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_tracking" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "usage_limit" INTEGER,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "stripe_invoice_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "PaymentStatus" NOT NULL,
    "description" TEXT,
    "invoice_url" TEXT,
    "paid_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications" BOOLEAN NOT NULL DEFAULT true,
    "interview_reminders" BOOLEAN NOT NULL DEFAULT true,
    "practice_reminders" BOOLEAN NOT NULL DEFAULT true,
    "weekly_reports" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "audio_quality" TEXT NOT NULL DEFAULT 'high',
    "auto_save_responses" BOOLEAN NOT NULL DEFAULT true,
    "show_confidence_scores" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_tier_key" ON "subscription_plans"("tier");

-- CreateIndex
CREATE INDEX "usage_tracking_user_id_idx" ON "usage_tracking"("user_id");

-- CreateIndex
CREATE INDEX "usage_tracking_subscription_id_idx" ON "usage_tracking"("subscription_id");

-- CreateIndex
CREATE INDEX "usage_tracking_feature_idx" ON "usage_tracking"("feature");

-- CreateIndex
CREATE INDEX "usage_tracking_period_start_idx" ON "usage_tracking"("period_start");

-- CreateIndex
CREATE UNIQUE INDEX "usage_tracking_user_id_feature_period_start_key" ON "usage_tracking"("user_id", "feature", "period_start");

-- CreateIndex
CREATE INDEX "billing_history_user_id_idx" ON "billing_history"("user_id");

-- CreateIndex
CREATE INDEX "billing_history_subscription_id_idx" ON "billing_history"("subscription_id");

-- CreateIndex
CREATE INDEX "billing_history_status_idx" ON "billing_history"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Insert default subscription plans
INSERT INTO "subscription_plans" ("id", "tier", "name", "description", "price_monthly", "price_yearly", "features", "limits") VALUES
('plan_free', 'FREE', 'Free Plan', 'Basic interview assistance with limited features', 0.00, 0.00, 
 '["Basic transcription", "Limited AI responses", "Practice mode"]', 
 '{"monthly_sessions": 5, "session_duration_minutes": 30, "ai_responses_per_session": 10}'),
('plan_pro', 'PRO', 'Pro Plan', 'Advanced features for serious job seekers', 29.99, 299.99, 
 '["High-accuracy transcription", "Unlimited AI responses", "Advanced practice mode", "LinkedIn integration", "Export features"]', 
 '{"monthly_sessions": 50, "session_duration_minutes": 120, "ai_responses_per_session": -1}'),
('plan_enterprise', 'ENTERPRISE', 'Enterprise Plan', 'Full-featured plan for professionals and teams', 99.99, 999.99, 
 '["Premium transcription", "Unlimited everything", "Priority support", "Custom integrations", "Advanced analytics", "Team management"]', 
 '{"monthly_sessions": -1, "session_duration_minutes": -1, "ai_responses_per_session": -1}');