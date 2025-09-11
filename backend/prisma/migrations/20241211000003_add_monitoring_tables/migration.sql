-- CreateTable
CREATE TABLE "performance_metrics" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "transcription_latency" INTEGER NOT NULL,
    "response_generation_latency" INTEGER NOT NULL,
    "total_latency" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accuracy_metrics" (
    "id" TEXT NOT NULL,
    "transcription_id" TEXT NOT NULL,
    "word_error_rate" DOUBLE PRECISION NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "actual_text" TEXT,
    "transcribed_text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accuracy_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_satisfaction_metrics" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "feature_used" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_satisfaction_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_analytics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "duration" INTEGER,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_health_metrics" (
    "id" TEXT NOT NULL,
    "cpu_usage" DOUBLE PRECISION NOT NULL,
    "memory_usage" DOUBLE PRECISION NOT NULL,
    "active_connections" INTEGER NOT NULL,
    "queue_size" INTEGER NOT NULL,
    "error_rate" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_metrics_session_id_idx" ON "performance_metrics"("session_id");

-- CreateIndex
CREATE INDEX "performance_metrics_user_id_idx" ON "performance_metrics"("user_id");

-- CreateIndex
CREATE INDEX "performance_metrics_timestamp_idx" ON "performance_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "accuracy_metrics_transcription_id_idx" ON "accuracy_metrics"("transcription_id");

-- CreateIndex
CREATE INDEX "accuracy_metrics_timestamp_idx" ON "accuracy_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "user_satisfaction_metrics_session_id_idx" ON "user_satisfaction_metrics"("session_id");

-- CreateIndex
CREATE INDEX "user_satisfaction_metrics_user_id_idx" ON "user_satisfaction_metrics"("user_id");

-- CreateIndex
CREATE INDEX "user_satisfaction_metrics_feature_used_idx" ON "user_satisfaction_metrics"("feature_used");

-- CreateIndex
CREATE INDEX "user_satisfaction_metrics_timestamp_idx" ON "user_satisfaction_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "usage_analytics_user_id_idx" ON "usage_analytics"("user_id");

-- CreateIndex
CREATE INDEX "usage_analytics_session_id_idx" ON "usage_analytics"("session_id");

-- CreateIndex
CREATE INDEX "usage_analytics_feature_idx" ON "usage_analytics"("feature");

-- CreateIndex
CREATE INDEX "usage_analytics_timestamp_idx" ON "usage_analytics"("timestamp");

-- CreateIndex
CREATE INDEX "system_health_metrics_timestamp_idx" ON "system_health_metrics"("timestamp");

-- AddForeignKey
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_satisfaction_metrics" ADD CONSTRAINT "user_satisfaction_metrics_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_satisfaction_metrics" ADD CONSTRAINT "user_satisfaction_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_analytics" ADD CONSTRAINT "usage_analytics_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_analytics" ADD CONSTRAINT "usage_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;