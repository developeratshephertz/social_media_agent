-- Database Migration Script
-- This script adds user_id columns to existing tables

-- Add user_id column to campaigns table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaigns' AND column_name = 'user_id') THEN
        ALTER TABLE campaigns ADD COLUMN user_id VARCHAR(255);
    END IF;
END $$;

-- Add user_id column to posts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'user_id') THEN
        ALTER TABLE posts ADD COLUMN user_id VARCHAR(255);
    END IF;
END $$;

-- Add user_id column to batch_operations table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'batch_operations' AND column_name = 'user_id') THEN
        ALTER TABLE batch_operations ADD COLUMN user_id VARCHAR(255);
    END IF;
END $$;

-- Add user_id column to calendar_events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calendar_events' AND column_name = 'user_id') THEN
        ALTER TABLE calendar_events ADD COLUMN user_id VARCHAR(255);
    END IF;
END $$;

-- Create indexes for user_id columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_user_id ON batch_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);

-- Update existing records to have a default user_id (for existing data)
-- This ensures existing data doesn't break
UPDATE campaigns SET user_id = 'legacy-user' WHERE user_id IS NULL;
UPDATE posts SET user_id = 'legacy-user' WHERE user_id IS NULL;
UPDATE batch_operations SET user_id = 'legacy-user' WHERE user_id IS NULL;
UPDATE calendar_events SET user_id = 'legacy-user' WHERE user_id IS NULL;
