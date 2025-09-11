-- Add performance optimization indexes

-- User-related indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_created 
ON users(subscription_tier, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_seniority_industries 
ON user_profiles(seniority, (industries->0));

-- Interview session indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_sessions_user_status_started 
ON interview_sessions(user_id, status, started_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_sessions_status_created 
ON interview_sessions(status, created_at DESC);

-- Interaction indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_session_timestamp 
ON interactions(session_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interactions_question_classification 
ON interactions USING GIN((question_classification));

-- Transcription result indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_results_session_final_created 
ON transcription_results(session_id, is_final, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_results_provider_confidence 
ON transcription_results(provider, confidence DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_results_speaker_time 
ON transcription_results(speaker_id, start_time, end_time);

-- Audio chunk indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audio_chunks_session_processed 
ON audio_chunks(session_id, processed_at DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audio_chunks_created_size 
ON audio_chunks(created_at DESC, size DESC);

-- Transcription cache indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_cache_provider_hit_count 
ON transcription_cache(provider, hit_count DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_cache_language_confidence 
ON transcription_cache(language, confidence DESC);

-- Practice session indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_sessions_user_status_started 
ON practice_sessions(user_id, status, started_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_sessions_industry_difficulty 
ON practice_sessions(industry, difficulty, created_at DESC);

-- Question bank indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_type_industry_difficulty_active 
ON question_bank(type, industry, difficulty, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_category_tags 
ON question_bank USING GIN(category, tags);

-- Practice question indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_questions_session_order 
ON practice_questions(session_id, question_order);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_questions_bank_presented 
ON practice_questions(question_bank_id, presented_at DESC);

-- Practice response indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_responses_session_score_created 
ON practice_responses(session_id, overall_score DESC, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_responses_duration_score 
ON practice_responses(duration, overall_score DESC);

-- Session metrics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_metrics_session_created 
ON session_metrics(session_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_metrics_latency_accuracy 
ON session_metrics(total_latency_ms, transcription_accuracy DESC);

-- Practice analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_analytics_user_created 
ON practice_analytics(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_analytics_session_score 
ON practice_analytics(session_id, average_score DESC);

-- Full-text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_results_text_search 
ON transcription_results USING GIN(to_tsvector('english', text));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_question_search 
ON question_bank USING GIN(to_tsvector('english', question));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_responses_response_search 
ON practice_responses USING GIN(to_tsvector('english', response));

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_bank_active_type_industry 
ON question_bank(type, industry, difficulty) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_sessions_active 
ON interview_sessions(user_id, started_at DESC) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_practice_sessions_active 
ON practice_sessions(user_id, started_at DESC) WHERE status = 'active';

-- Covering indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_subscription_created 
ON users(email) INCLUDE (subscription_tier, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transcription_cache_hash_text_confidence 
ON transcription_cache(audio_hash) INCLUDE (text, confidence, provider);