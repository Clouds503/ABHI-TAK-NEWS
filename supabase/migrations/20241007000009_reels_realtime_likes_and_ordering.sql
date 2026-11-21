-- =============================================================================
-- Migration: 20241007000009_reels_realtime_likes_and_ordering.sql
-- 1. Enables Supabase Realtime publication on reel_likes (and reels) with REPLICA IDENTITY FULL
-- 2. Adds index for latest-first reels feed (posted_at DESC NULLS LAST, created_at DESC)
-- 3. Backfills existing reels where posted_at IS NULL with created_at
-- =============================================================================

-- 1. Set replica identity on reel_likes and reels so real-time updates include full row data
ALTER TABLE public.reel_likes REPLICA IDENTITY FULL;
ALTER TABLE public.reels REPLICA IDENTITY FULL;

-- 2. Add public.reel_likes to supabase_realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'reel_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_likes;
  END IF;
END $$;

-- 3. Ensure public.reels is in supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'reels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;
  END IF;
END $$;

-- 4. Create composite index on reels for latest-first ordering
CREATE INDEX IF NOT EXISTS reels_posted_at_idx ON public.reels (posted_at DESC NULLS LAST, created_at DESC);

-- 5. Backfill existing reels where posted_at is NULL with created_at
UPDATE public.reels 
SET posted_at = created_at 
WHERE posted_at IS NULL;
