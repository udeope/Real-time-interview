-- Performance optimization indexes and query improvements

-- User-related indexes for faster authentication and profile lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);

-- User profiles indexes for context analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_seniority ON user_profiles(seniority);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_skills_gin ON user_profiles USING GIN(skills);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_industries_gin ON user_profiles USING GIN(industries);

-- Interview sessions indexes for session management and analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_sessions_started_at ON interview_sessions(started_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_sessions_user_status ON interview_sessions(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_sessions_date_range ON interview_sessions(started_at, ended_at);

-- Interactions indexes for real-time processing and analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_session_id ON interactions(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_session_timestamp ON interactions(session_id, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_question_classification_gin ON interactions USING GIN(question_classification);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_user_feedback ON interactions(user_feedback) WHERE user_feedback IS NOT NULL;

-- Session metrics indexes for performance monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_metrics_session_id ON session_metrics(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_metrics_created_at ON session_metrics(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_metrics_latency ON session_metrics(total_latency_ms);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_metrics_accuracy ON session_metrics(transcription_accuracy);

-- Practice sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_sessions_created_at ON practice_sessions(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_sessions_user_date ON practice_sessions(user_id, created_at);

-- Question bank indexes for practice mode
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_category ON question_bank(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_industry ON question_bank(industry);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_category_difficulty ON question_bank(category, difficulty);

-- Transcription results indexes for caching and retrieval
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_results_session_id ON transcription_results(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_results_created_at ON transcription_results(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_results_confidence ON transcription_results(confidence_score);

-- Response cache indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_response_cache_question_hash ON response_cache(question_hash);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_response_cache_created_at ON response_cache(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_response_cache_expires_at ON response_cache(expires_at);

-- Audit logs indexes for security and compliance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action_date ON audit_logs(user_id, action, created_at);

-- System metrics indexes for monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_metrics_metric_name ON system_metrics(metric_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_metrics_name_timestamp ON system_metrics(metric_name, timestamp);

-- User satisfaction indexes for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_satisfaction_user_id ON user_satisfaction(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_satisfaction_session_id ON user_satisfaction(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_satisfaction_rating ON user_satisfaction(rating);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_satisfaction_created_at ON user_satisfaction(created_at);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_status_date ON interview_sessions(user_id, status, started_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_session_feedback ON interactions(session_id, user_feedback, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_session_performance ON session_metrics(session_id, total_latency_ms, transcription_accuracy);

-- Full-text search indexes for question and response content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_question_fts ON interactions USING GIN(to_tsvector('english', question));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_response_fts ON interactions USING GIN(to_tsvector('english', selected_response));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_question_fts ON question_bank USING GIN(to_tsvector('english', question_text));

-- Partial indexes for active/recent data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_sessions ON interview_sessions(user_id, started_at) 
  WHERE status IN ('active', 'paused');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_interactions ON interactions(session_id, timestamp) 
  WHERE timestamp > NOW() - INTERVAL '7 days';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_metrics ON session_metrics(session_id, created_at) 
  WHERE created_at > NOW() - INTERVAL '30 days';

-- Covering indexes for frequently accessed columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_profile_covering ON users(id, email, name, subscription_tier, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_summary_covering ON interview_sessions(id, user_id, status, started_at, ended_at);

-- Statistics update for better query planning
ANALYZE users;
ANALYZE user_profiles;
ANALYZE interview_sessions;
ANALYZE interactions;
ANALYZE session_metrics;
ANALYZE practice_sessions;
ANALYZE question_bank;
ANALYZE transcription_results;
ANALYZE response_cache;
ANALYZE audit_logs;
ANALYZE system_metrics;
ANALYZE user_satisfaction;