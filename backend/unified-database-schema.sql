-- 🐝 Hive AI Platform - Unified Database Schema
-- Complete schema consolidating threads, collaborative AI, context engine, and platform features
-- Run this in Supabase SQL Editor to set up all required tables

-- =============================================================================
-- CORE ORGANIZATION & USER TABLES (assumed to already exist)
-- =============================================================================
-- These tables should already exist in your Supabase instance:
-- - auth.users (Supabase auth)
-- - app.orgs (organizations)
-- - app.org_members (user-org relationships)
-- - app.users (user profiles)

-- =============================================================================
-- THREAD PERSISTENCE SYSTEM
-- =============================================================================

-- Threads table for conversation management
CREATE TABLE IF NOT EXISTS app.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  title TEXT,
  created_by UUID REFERENCES app.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table for conversation content
CREATE TABLE IF NOT EXISTS app.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES app.threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  provider TEXT, -- 'openai', 'anthropic', 'google'
  model_id TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  created_by UUID REFERENCES app.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- COLLABORATIVE AI SYSTEM
-- =============================================================================

-- Sessions table for multi-model AI collaboration
CREATE TABLE IF NOT EXISTS app.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES app.threads(id) ON DELETE CASCADE,
  created_by UUID REFERENCES app.users(id),
  mode TEXT NOT NULL CHECK (mode IN ('council','debate','pipeline','shadow')),
  rubric_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turns table for collaborative AI rounds
CREATE TABLE IF NOT EXISTS app.turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES app.sessions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  context_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced messages table for collaborative AI (extends base messages)
-- This uses the same messages table but adds session/turn tracking
ALTER TABLE app.messages ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES app.sessions(id) ON DELETE CASCADE;
ALTER TABLE app.messages ADD COLUMN IF NOT EXISTS turn_id UUID REFERENCES app.turns(id) ON DELETE CASCADE;
ALTER TABLE app.messages ADD COLUMN IF NOT EXISTS score DECIMAL(3,2) DEFAULT NULL;
ALTER TABLE app.messages ADD COLUMN IF NOT EXISTS latency_ms INTEGER DEFAULT 0;

-- Verdicts table for collaborative AI final decisions
CREATE TABLE IF NOT EXISTS app.verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id UUID NOT NULL REFERENCES app.turns(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  final_answer TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.0,
  rationale TEXT,
  dissent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CONTEXT ENGINE (Enhanced Memory System)
-- =============================================================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Context embeddings for semantic search
CREATE TABLE IF NOT EXISTS app.context_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES app.threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES app.messages(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('message', 'document', 'summary')),
  content_text TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Context entities for structured information extraction
CREATE TABLE IF NOT EXISTS app.context_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES app.threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES app.messages(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'person', 'company', 'matter_number', 'date', 'legal_concept'
  entity_value TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  context_snippet TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Context relationships for linking information
CREATE TABLE IF NOT EXISTS app.context_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'thread', 'message', 'entity', 'document'
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  relationship_type TEXT NOT NULL, -- 'related_to', 'mentions', 'follows_up', 'contradicts'
  strength DECIMAL(3,2) DEFAULT 0.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Context summaries for conversation intelligence
CREATE TABLE IF NOT EXISTS app.context_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES app.threads(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('thread', 'topic', 'entity', 'time_period')),
  summary_text TEXT NOT NULL,
  key_points JSONB DEFAULT '[]',
  entities_mentioned JSONB DEFAULT '[]',
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PLATFORM MANAGEMENT & SECURITY
-- =============================================================================

-- Model invocations for usage tracking and billing
CREATE TABLE IF NOT EXISTS app.model_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES app.threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES app.messages(id) ON DELETE CASCADE,
  session_id UUID REFERENCES app.sessions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google'
  model_id TEXT NOT NULL,
  latency_ms INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant settings for organization configuration
CREATE TABLE IF NOT EXISTS app.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, key)
);

-- Audit logs for compliance and security
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

-- DLP rules for data loss prevention
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

-- File attachments for document support
CREATE TABLE IF NOT EXISTS app.file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES app.threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES app.messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  content_hash TEXT,
  uploaded_by UUID REFERENCES app.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Thread indexes
CREATE INDEX IF NOT EXISTS threads_org_id_idx ON app.threads(org_id);
CREATE INDEX IF NOT EXISTS threads_created_by_idx ON app.threads(created_by);
CREATE INDEX IF NOT EXISTS threads_created_at_idx ON app.threads(created_at DESC);

-- Message indexes
CREATE INDEX IF NOT EXISTS messages_thread_id_idx ON app.messages(thread_id);
CREATE INDEX IF NOT EXISTS messages_org_id_idx ON app.messages(org_id);
CREATE INDEX IF NOT EXISTS messages_session_id_idx ON app.messages(session_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON app.messages(created_at);

-- Session indexes
CREATE INDEX IF NOT EXISTS sessions_org_id_idx ON app.sessions(org_id);
CREATE INDEX IF NOT EXISTS sessions_thread_id_idx ON app.sessions(thread_id);
CREATE INDEX IF NOT EXISTS sessions_mode_idx ON app.sessions(mode);

-- Context engine indexes
CREATE INDEX IF NOT EXISTS context_embeddings_org_id_idx ON app.context_embeddings(org_id);
CREATE INDEX IF NOT EXISTS context_embeddings_thread_id_idx ON app.context_embeddings(thread_id);
CREATE INDEX IF NOT EXISTS context_entities_org_id_idx ON app.context_entities(org_id);
CREATE INDEX IF NOT EXISTS context_entities_entity_type_idx ON app.context_entities(entity_type);

-- Platform indexes
CREATE INDEX IF NOT EXISTS model_invocations_org_id_idx ON app.model_invocations(org_id);
CREATE INDEX IF NOT EXISTS model_invocations_created_at_idx ON app.model_invocations(created_at DESC);
CREATE INDEX IF NOT EXISTS tenant_settings_org_id_idx ON app.tenant_settings(org_id);
CREATE INDEX IF NOT EXISTS audit_logs_org_id_idx ON app.audit_logs(org_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON app.audit_logs(created_at DESC);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION app.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_threads_updated_at ON app.threads;
CREATE TRIGGER update_threads_updated_at
    BEFORE UPDATE ON app.threads
    FOR EACH ROW
    EXECUTE FUNCTION app.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_settings_updated_at ON app.tenant_settings;
CREATE TRIGGER update_tenant_settings_updated_at
    BEFORE UPDATE ON app.tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION app.update_updated_at_column();

-- Context search function
CREATE OR REPLACE FUNCTION app.search_context_embeddings(
  p_org_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content_text TEXT,
  similarity DECIMAL,
  metadata JSONB,
  thread_id UUID,
  message_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ce.id,
    ce.content_text,
    (1 - (ce.embedding <=> p_query_embedding))::DECIMAL as similarity,
    ce.metadata,
    ce.thread_id,
    ce.message_id,
    ce.created_at
  FROM app.context_embeddings ce
  WHERE ce.org_id = p_org_id
    AND (1 - (ce.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY ce.embedding <=> p_query_embedding
  LIMIT p_limit;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE app.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.context_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.context_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.context_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.context_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.model_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.dlp_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.file_attachments ENABLE ROW LEVEL SECURITY;

-- Org isolation policies (users can only access their org's data)
CREATE POLICY "threads_org_isolation" ON app.threads
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "messages_org_isolation" ON app.messages
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "sessions_org_isolation" ON app.sessions
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "turns_org_isolation" ON app.turns
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "verdicts_org_isolation" ON app.verdicts
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "context_embeddings_org_isolation" ON app.context_embeddings
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "context_entities_org_isolation" ON app.context_entities
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "model_invocations_org_isolation" ON app.model_invocations
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "tenant_settings_org_isolation" ON app.tenant_settings
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "audit_logs_org_isolation" ON app.audit_logs
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

-- Service role bypass policies (for backend operations)
CREATE POLICY "threads_service_role" ON app.threads
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "messages_service_role" ON app.messages
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "sessions_service_role" ON app.sessions
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "tenant_settings_service_role" ON app.tenant_settings
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant all permissions to service role
GRANT ALL ON app.threads TO service_role;
GRANT ALL ON app.messages TO service_role;
GRANT ALL ON app.sessions TO service_role;
GRANT ALL ON app.turns TO service_role;
GRANT ALL ON app.verdicts TO service_role;
GRANT ALL ON app.context_embeddings TO service_role;
GRANT ALL ON app.context_entities TO service_role;
GRANT ALL ON app.context_relationships TO service_role;
GRANT ALL ON app.context_summaries TO service_role;
GRANT ALL ON app.model_invocations TO service_role;
GRANT ALL ON app.tenant_settings TO service_role;
GRANT ALL ON app.audit_logs TO service_role;
GRANT ALL ON app.dlp_rules TO service_role;
GRANT ALL ON app.file_attachments TO service_role;

-- =============================================================================
-- DEFAULT DATA
-- =============================================================================

-- Insert default tenant settings for demo org
INSERT INTO app.tenant_settings (org_id, key, value, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'modelEnabled', '{"openai": true, "gemini": true, "anthropic": true}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000001', 'retentionDays', '90', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000001', 'legalHold', 'false', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000001', 'contextEngine', '{"enabled": true, "embedding_model": "text-embedding-3-small"}', NOW(), NOW())
ON CONFLICT (org_id, key)
DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify schema setup
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'app'
  AND table_name IN ('threads', 'messages', 'sessions', 'context_embeddings', 'tenant_settings')
ORDER BY table_name, ordinal_position;

-- Show table counts
SELECT 'threads' as table_name, COUNT(*) as row_count FROM app.threads
UNION ALL
SELECT 'messages' as table_name, COUNT(*) as row_count FROM app.messages
UNION ALL
SELECT 'sessions' as table_name, COUNT(*) as row_count FROM app.sessions
UNION ALL
SELECT 'tenant_settings' as table_name, COUNT(*) as row_count FROM app.tenant_settings;

-- Show enabled models
SELECT org_id, key, value FROM app.tenant_settings WHERE key = 'modelEnabled';