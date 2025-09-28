-- Create threads and messages tables for thread persistence
-- Run this in Supabase SQL Editor

-- Threads table
CREATE TABLE IF NOT EXISTS app.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  title TEXT,
  created_by UUID REFERENCES app.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table  
CREATE TABLE IF NOT EXISTS app.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES app.threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  provider TEXT, -- 'openai', 'anthropic', 'google', etc.
  model_id TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  created_by UUID REFERENCES app.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS threads_org_id_idx ON app.threads(org_id);
CREATE INDEX IF NOT EXISTS threads_created_by_idx ON app.threads(created_by);
CREATE INDEX IF NOT EXISTS threads_created_at_idx ON app.threads(created_at DESC);

CREATE INDEX IF NOT EXISTS messages_thread_id_idx ON app.messages(thread_id);
CREATE INDEX IF NOT EXISTS messages_org_id_idx ON app.messages(org_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON app.messages(created_at);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION app.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for threads updated_at
DROP TRIGGER IF EXISTS update_threads_updated_at ON app.threads;
CREATE TRIGGER update_threads_updated_at
    BEFORE UPDATE ON app.threads
    FOR EACH ROW
    EXECUTE FUNCTION app.update_updated_at_column();

-- Grant permissions to service role
GRANT ALL ON app.threads TO service_role;
GRANT ALL ON app.messages TO service_role;
