-- Add security and privacy features

-- User consent management
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(100) NOT NULL, -- 'audio_processing', 'data_storage', 'analytics', 'marketing'
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  version VARCHAR(50) NOT NULL, -- Version of privacy policy/terms
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, consent_type, version)
);

-- Data retention policies
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type VARCHAR(100) NOT NULL, -- 'audio', 'transcription', 'session', 'analytics'
  retention_days INTEGER NOT NULL,
  auto_delete BOOLEAN DEFAULT true,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs for all user interactions
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES interview_sessions(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- 'login', 'audio_capture', 'transcription', 'response_generation', 'data_export', 'data_delete'
  resource_type VARCHAR(100), -- 'user', 'session', 'audio', 'transcription'
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fraud detection and usage patterns
CREATE TABLE usage_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_type VARCHAR(100) NOT NULL, -- 'session_frequency', 'audio_volume', 'api_usage', 'suspicious_activity'
  pattern_data JSONB NOT NULL,
  risk_score DECIMAL(5,2) DEFAULT 0.00,
  flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  reviewed BOOLEAN DEFAULT false,
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Data encryption keys management
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_type VARCHAR(50) NOT NULL, -- 'audio', 'transcription', 'profile'
  key_hash VARCHAR(255) NOT NULL, -- Hashed version of the key
  salt VARCHAR(255) NOT NULL,
  algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(user_id, key_type)
);

-- GDPR compliance - data export requests
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL, -- 'export', 'delete'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  requested_data_types JSONB, -- Array of data types requested
  export_url VARCHAR(500),
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Privacy settings per user
CREATE TABLE privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  audio_retention_days INTEGER DEFAULT 30,
  transcription_retention_days INTEGER DEFAULT 90,
  analytics_enabled BOOLEAN DEFAULT true,
  data_sharing_enabled BOOLEAN DEFAULT false,
  marketing_emails_enabled BOOLEAN DEFAULT false,
  session_recording_enabled BOOLEAN DEFAULT true,
  ai_training_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_usage_patterns_user_id ON usage_patterns(user_id);
CREATE INDEX idx_usage_patterns_flagged ON usage_patterns(flagged);
CREATE INDEX idx_encryption_keys_user_id ON encryption_keys(user_id);
CREATE INDEX idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX idx_data_export_requests_status ON data_export_requests(status);

-- Insert default data retention policies
INSERT INTO data_retention_policies (data_type, retention_days, description) VALUES
('audio', 30, 'Audio recordings are deleted after 30 days'),
('transcription', 90, 'Transcription data is deleted after 90 days'),
('session', 365, 'Session metadata is deleted after 1 year'),
('analytics', 730, 'Analytics data is deleted after 2 years');