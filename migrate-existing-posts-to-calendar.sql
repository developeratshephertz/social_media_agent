-- Migration script to create calendar events for existing scheduled posts
-- This will create calendar events for posts that have scheduled_at but no corresponding calendar events

INSERT INTO calendar_events (id, post_id, user_id, title, description, start_time, end_time, status, event_metadata, created_at, updated_at)
SELECT 
    gen_random_uuid() as id,
    p.id as post_id,
    p.user_id,
    COALESCE(p.campaign_name, 'Scheduled Post') as title,
    COALESCE(p.caption, p.original_description, '') as description,
    p.scheduled_at as start_time,
    p.scheduled_at as end_time,
    p.status,
    jsonb_build_object('platforms', p.platforms, 'subreddit', p.subreddit) as event_metadata,
    NOW() as created_at,
    NOW() as updated_at
FROM posts p
LEFT JOIN calendar_events ce ON p.id = ce.post_id
WHERE p.scheduled_at IS NOT NULL 
  AND p.user_id IS NOT NULL
  AND ce.post_id IS NULL;  -- Only create events for posts that don't already have calendar events

-- Show how many calendar events were created
SELECT COUNT(*) as calendar_events_created FROM calendar_events WHERE created_at >= NOW() - INTERVAL '1 minute';
