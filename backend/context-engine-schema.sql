-- N8N Context Engine Database Schema
-- This creates the tables needed for persistent memory and context indexing

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Context embeddings table for semantic search
CREATE TABLE IF NOT EXISTS app.context_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES app.threads(id) ON DELETE CASCADE,
  message_id uuid REFERENCES app.messages(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('message', 'document', 'summary')),
  content_text text NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Context entities table for structured information
CREATE TABLE IF NOT EXISTS app.context_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES app.threads(id) ON DELETE CASCADE,
  message_id uuid REFERENCES app.messages(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- 'person', 'company', 'matter_number', 'date', 'legal_concept'
  entity_value text NOT NULL,
  confidence_score decimal(3,2) DEFAULT 0.0, -- 0.00 to 1.00
  context_snippet text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Context relationships table for linking related information
CREATE TABLE IF NOT EXISTS app.context_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  source_type text NOT NULL, -- 'thread', 'message', 'entity', 'document'
  source_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  relationship_type text NOT NULL, -- 'related_to', 'mentions', 'follows_up', 'contradicts'
  strength decimal(3,2) DEFAULT 0.0, -- relationship strength 0.00 to 1.00
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Context summaries table for conversation summaries
CREATE TABLE IF NOT EXISTS app.context_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES app.threads(id) ON DELETE CASCADE,
  summary_type text NOT NULL CHECK (summary_type IN ('thread', 'topic', 'entity', 'time_period')),
  summary_text text NOT NULL,
  key_points jsonb DEFAULT '[]',
  entities_mentioned jsonb DEFAULT '[]',
  confidence_score decimal(3,2) DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Context usage tracking for audit and optimization
CREATE TABLE IF NOT EXISTS app.context_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES app.threads(id) ON DELETE CASCADE,
  message_id uuid REFERENCES app.messages(id) ON DELETE CASCADE,
  context_type text NOT NULL, -- 'embedding', 'entity', 'summary', 'relationship'
  context_ids uuid[] NOT NULL, -- array of context item IDs used
  usage_type text NOT NULL, -- 'retrieval', 'injection', 'generation'
  relevance_scores decimal[] DEFAULT '{}', -- relevance scores for each context item
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_context_embeddings_org_id ON app.context_embeddings(org_id);
CREATE INDEX IF NOT EXISTS idx_context_embeddings_thread_id ON app.context_embeddings(thread_id);
CREATE INDEX IF NOT EXISTS idx_context_embeddings_message_id ON app.context_embeddings(message_id);
CREATE INDEX IF NOT EXISTS idx_context_embeddings_content_type ON app.context_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_context_embeddings_created_at ON app.context_embeddings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_entities_org_id ON app.context_entities(org_id);
CREATE INDEX IF NOT EXISTS idx_context_entities_thread_id ON app.context_entities(thread_id);
CREATE INDEX IF NOT EXISTS idx_context_entities_entity_type ON app.context_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_context_entities_entity_value ON app.context_entities(entity_value);
CREATE INDEX IF NOT EXISTS idx_context_entities_confidence ON app.context_entities(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_context_relationships_org_id ON app.context_relationships(org_id);
CREATE INDEX IF NOT EXISTS idx_context_relationships_source ON app.context_relationships(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_context_relationships_target ON app.context_relationships(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_context_relationships_type ON app.context_relationships(relationship_type);

CREATE INDEX IF NOT EXISTS idx_context_summaries_org_id ON app.context_summaries(org_id);
CREATE INDEX IF NOT EXISTS idx_context_summaries_thread_id ON app.context_summaries(thread_id);
CREATE INDEX IF NOT EXISTS idx_context_summaries_type ON app.context_summaries(summary_type);

CREATE INDEX IF NOT EXISTS idx_context_usage_org_id ON app.context_usage(org_id);
CREATE INDEX IF NOT EXISTS idx_context_usage_thread_id ON app.context_usage(thread_id);
CREATE INDEX IF NOT EXISTS idx_context_usage_created_at ON app.context_usage(created_at DESC);

-- RLS Policies for context tables
ALTER TABLE app.context_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.context_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.context_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.context_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.context_usage ENABLE ROW LEVEL SECURITY;

-- Context embeddings policies
CREATE POLICY "context_embeddings_org_isolation" ON app.context_embeddings
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "context_embeddings_service_role" ON app.context_embeddings
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Context entities policies
CREATE POLICY "context_entities_org_isolation" ON app.context_entities
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "context_entities_service_role" ON app.context_entities
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Context relationships policies
CREATE POLICY "context_relationships_org_isolation" ON app.context_relationships
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "context_relationships_service_role" ON app.context_relationships
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Context summaries policies
CREATE POLICY "context_summaries_org_isolation" ON app.context_summaries
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "context_summaries_service_role" ON app.context_summaries
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Context usage policies
CREATE POLICY "context_usage_org_isolation" ON app.context_usage
  FOR ALL USING (org_id IN (SELECT org_id FROM app.org_members WHERE user_id = auth.uid()));

CREATE POLICY "context_usage_service_role" ON app.context_usage
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Functions for context operations
CREATE OR REPLACE FUNCTION app.search_context_embeddings(
  p_org_id uuid,
  p_query_embedding vector(1536),
  p_limit integer DEFAULT 10,
  p_similarity_threshold decimal DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  content_text text,
  similarity decimal,
  metadata jsonb,
  thread_id uuid,
  message_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    ce.id,
    ce.content_text,
    (1 - (ce.embedding <=> p_query_embedding))::decimal as similarity,
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

-- Function to get context for a thread
CREATE OR REPLACE FUNCTION app.get_thread_context(
  p_org_id uuid,
  p_thread_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  context_type text,
  content text,
  confidence decimal,
  created_at timestamptz,
  metadata jsonb
)
LANGUAGE sql
STABLE
AS $$
  -- Get recent embeddings
  SELECT 
    'embedding' as context_type,
    content_text as content,
    1.0 as confidence,
    created_at,
    metadata
  FROM app.context_embeddings
  WHERE org_id = p_org_id AND thread_id = p_thread_id
  ORDER BY created_at DESC
  LIMIT p_limit / 2

  UNION ALL

  -- Get entities
  SELECT 
    'entity' as context_type,
    entity_type || ': ' || entity_value as content,
    confidence_score as confidence,
    created_at,
    metadata
  FROM app.context_entities
  WHERE org_id = p_org_id AND thread_id = p_thread_id
  ORDER BY confidence_score DESC, created_at DESC
  LIMIT p_limit / 4

  UNION ALL

  -- Get summaries
  SELECT 
    'summary' as context_type,
    summary_text as content,
    confidence_score as confidence,
    created_at,
    jsonb_build_object('key_points', key_points, 'entities', entities_mentioned) as metadata
  FROM app.context_summaries
  WHERE org_id = p_org_id AND thread_id = p_thread_id
  ORDER BY updated_at DESC
  LIMIT p_limit / 4;
$$;
