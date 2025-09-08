-- Migration script to update platform column to allow null values
-- This will remove the default 'instagram' value and allow null platforms

-- Remove the default constraint from the platform column
ALTER TABLE posts ALTER COLUMN platform DROP DEFAULT;

-- Allow null values for platform column (should already be allowed, but making it explicit)
ALTER TABLE posts ALTER COLUMN platform DROP NOT NULL;

-- Optional: Update existing posts with 'instagram' platform to null if you want a clean slate
-- Uncomment the line below if you want to reset all existing platforms to null
-- UPDATE posts SET platform = NULL WHERE platform = 'instagram';

-- Add a comment to document the change
COMMENT ON COLUMN posts.platform IS 'Social media platform (instagram, facebook, twitter, etc.) - null until user selects during scheduling';
