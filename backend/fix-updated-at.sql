-- Remove the updated_at column and trigger that's causing issues
-- Run this in Supabase SQL Editor

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_threads_updated_at ON app.threads;

-- Drop the function
DROP FUNCTION IF EXISTS app.update_updated_at_column();

-- Remove the updated_at column
ALTER TABLE app.threads DROP COLUMN IF EXISTS updated_at;
