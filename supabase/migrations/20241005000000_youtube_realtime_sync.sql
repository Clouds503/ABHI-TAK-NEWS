-- =============================================================================
-- Migration: 20241005000000_youtube_realtime_sync.sql
-- Enables Supabase Realtime on videos table, handles seed deduplication,
-- and adds a unique index on video_url for atomic upserts.
-- =============================================================================

-- 1. Deduplicate any existing mock video_urls before creating unique index
UPDATE public.videos 
SET video_url = video_url || '?mock_dup=' || id 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY video_url ORDER BY created_at ASC) as rnum
    FROM public.videos
  ) t WHERE t.rnum > 1
);

-- 2. Create unique index on video_url for atomic upserts
CREATE UNIQUE INDEX IF NOT EXISTS videos_video_url_uniq_idx ON public.videos (video_url);

-- 3. Set replica identity so real-time updates include full row data
ALTER TABLE public.videos REPLICA IDENTITY FULL;

-- 4. Enable Supabase Realtime publication for videos table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'videos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
  END IF;
END $$;
