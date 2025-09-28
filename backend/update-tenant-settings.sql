-- SQL script to enable all models in tenant settings
-- This directly updates the database to enable Gemini and Claude

-- Insert or update model settings for the default organization
INSERT INTO tenant_settings (org_id, key, value, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'modelEnabled', '{"openai": true, "gemini": true, "anthropic": true}', NOW(), NOW())
ON CONFLICT (org_id, key) 
DO UPDATE SET 
  value = '{"openai": true, "gemini": true, "anthropic": true}',
  updated_at = NOW();

-- Verify the settings
SELECT org_id, key, value FROM tenant_settings WHERE org_id = '00000000-0000-0000-0000-000000000001';
