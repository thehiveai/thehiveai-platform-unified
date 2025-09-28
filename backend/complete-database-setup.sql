-- Complete Database Setup for Hive AI Platform
-- Run this in Supabase SQL Editor to set up all required tables

-- Create tenant_settings table (missing table that's causing the model issue)
CREATE TABLE IF NOT EXISTS app.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, key)
);

-- Create indexes for tenant_settings
CREATE INDEX IF NOT EXISTS tenant_settings_org_id_idx ON app.tenant_settings(org_id);
CREATE INDEX IF NOT EXISTS tenant_settings_key_idx ON app.tenant_settings(key);

-- Grant permissions to service role
GRANT ALL ON app.tenant_settings TO service_role;

-- Enable RLS on tenant_settings
ALTER TABLE app.tenant_settings ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant_settings
CREATE POLICY "tenant_settings_org_isolation" ON app.tenant_settings
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "tenant_settings_service_role" ON app.tenant_settings
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Insert default settings to enable all models
INSERT INTO app.tenant_settings (org_id, key, value, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'modelEnabled', '{"openai": true, "gemini": true, "anthropic": true}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000001', 'retentionDays', '90', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000001', 'legalHold', 'false', NOW(), NOW())
ON CONFLICT (org_id, key)
DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Create other missing tables that might be needed

-- Model invocations table (for tracking AI model usage)
CREATE TABLE IF NOT EXISTS app.model_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES app.threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES app.messages(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google'
  model_id TEXT NOT NULL,
  latency_ms INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for model_invocations
CREATE INDEX IF NOT EXISTS model_invocations_org_id_idx ON app.model_invocations(org_id);
CREATE INDEX IF NOT EXISTS model_invocations_thread_id_idx ON app.model_invocations(thread_id);
CREATE INDEX IF NOT EXISTS model_invocations_created_at_idx ON app.model_invocations(created_at DESC);

-- Grant permissions
GRANT ALL ON app.model_invocations TO service_role;

-- Enable RLS
ALTER TABLE app.model_invocations ENABLE ROW LEVEL SECURITY;

-- RLS policies for model_invocations
CREATE POLICY "model_invocations_org_isolation" ON app.model_invocations
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "model_invocations_service_role" ON app.model_invocations
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Audit logs table (for compliance and security)
CREATE TABLE IF NOT EXISTS app.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES app.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  content_sha256 TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS audit_logs_org_id_idx ON app.audit_logs(org_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON app.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON app.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON app.audit_logs(created_at DESC);

-- Grant permissions
GRANT ALL ON app.audit_logs TO service_role;

-- Enable RLS
ALTER TABLE app.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_logs
CREATE POLICY "audit_logs_org_isolation" ON app.audit_logs
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "audit_logs_service_role" ON app.audit_logs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- DLP rules table (for data loss prevention)
CREATE TABLE IF NOT EXISTS app.dlp_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pattern TEXT NOT NULL,
  is_blocking BOOLEAN DEFAULT false,
  created_by UUID REFERENCES app.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dlp_rules
CREATE INDEX IF NOT EXISTS dlp_rules_org_id_idx ON app.dlp_rules(org_id);
CREATE INDEX IF NOT EXISTS dlp_rules_is_blocking_idx ON app.dlp_rules(is_blocking);

-- Grant permissions
GRANT ALL ON app.dlp_rules TO service_role;

-- Enable RLS
ALTER TABLE app.dlp_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for dlp_rules
CREATE POLICY "dlp_rules_org_isolation" ON app.dlp_rules
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "dlp_rules_service_role" ON app.dlp_rules
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Verify the setup
SELECT 'tenant_settings' as table_name, COUNT(*) as row_count FROM app.tenant_settings
UNION ALL
SELECT 'threads' as table_name, COUNT(*) as row_count FROM app.threads
UNION ALL
SELECT 'messages' as table_name, COUNT(*) as row_count FROM app.messages
UNION ALL
SELECT 'model_invocations' as table_name, COUNT(*) as row_count FROM app.model_invocations
UNION ALL
SELECT 'audit_logs' as table_name, COUNT(*) as row_count FROM app.audit_logs
UNION ALL
SELECT 'dlp_rules' as table_name, COUNT(*) as row_count FROM app.dlp_rules;

-- Show the enabled models
SELECT org_id, key, value FROM app.tenant_settings WHERE key = 'modelEnabled';
