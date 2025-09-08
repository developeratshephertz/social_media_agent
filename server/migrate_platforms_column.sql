-- Migration script to update platform column to platforms array
-- Run this script to update existing database schema

-- First, add the new platforms column
ALTER TABLE posts ADD COLUMN platforms TEXT[];

-- Copy existing platform data to the new platforms array
UPDATE posts 
SET platforms = CASE 
    WHEN platform IS NOT NULL THEN ARRAY[platform]
    ELSE NULL
END;

-- Drop the old platform column
ALTER TABLE posts DROP COLUMN platform;

-- Add a comment to document the change
COMMENT ON COLUMN posts.platforms IS 'Array of platforms for multi-platform posting (instagram, facebook, twitter, reddit)';


