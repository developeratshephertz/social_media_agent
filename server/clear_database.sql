-- Clear all data from PostgreSQL database while preserving table structure
-- This script will remove all rows but keep all tables, columns, indexes, and constraints intact

-- WARNING: This will delete ALL data from your social media agent database!
-- Make sure you want to do this before running.

-- Disable foreign key checks temporarily (PostgreSQL equivalent)
SET session_replication_role = replica;

-- Clear child tables first (to handle foreign key constraints)
TRUNCATE TABLE posting_schedules RESTART IDENTITY CASCADE;
TRUNCATE TABLE captions RESTART IDENTITY CASCADE;
TRUNCATE TABLE images RESTART IDENTITY CASCADE;
TRUNCATE TABLE calendar_events RESTART IDENTITY CASCADE;

-- Clear main tables
TRUNCATE TABLE posts RESTART IDENTITY CASCADE;
TRUNCATE TABLE batch_operations RESTART IDENTITY CASCADE;

-- Clear parent tables last
TRUNCATE TABLE campaigns RESTART IDENTITY CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Create a default campaign for new posts
INSERT INTO campaigns (id, name, description, is_active, created_at, updated_at) 
VALUES (
    gen_random_uuid(), 
    'Default Campaign', 
    'Default campaign for social media posts', 
    true, 
    NOW(), 
    NOW()
) ON CONFLICT DO NOTHING;

-- Verify the clearing worked
SELECT 
    'campaigns' as table_name, COUNT(*) as row_count FROM campaigns
UNION ALL
SELECT 
    'posts' as table_name, COUNT(*) as row_count FROM posts
UNION ALL
SELECT 
    'batch_operations' as table_name, COUNT(*) as row_count FROM batch_operations
UNION ALL
SELECT 
    'images' as table_name, COUNT(*) as row_count FROM images
UNION ALL
SELECT 
    'captions' as table_name, COUNT(*) as row_count FROM captions
UNION ALL
SELECT 
    'calendar_events' as table_name, COUNT(*) as row_count FROM calendar_events
UNION ALL
SELECT 
    'posting_schedules' as table_name, COUNT(*) as row_count FROM posting_schedules
ORDER BY table_name;

-- Show table structures are still intact
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('campaigns', 'posts', 'images', 'captions', 'calendar_events', 'posting_schedules', 'batch_operations')
ORDER BY table_name, ordinal_position;
