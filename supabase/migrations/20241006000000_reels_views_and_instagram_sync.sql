-- =============================================================================
-- Migration: 20241006000000_reels_views_and_instagram_sync.sql
-- Adds: views, likes_count, thumbnail_url, posted_at to reels table
-- Adds: increment_reel_views RPC function
-- Enables: Supabase Realtime on reels and reel_likes
-- =============================================================================

-- 1. Add views, likes_count, thumbnail_url, posted_at columns if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reels' AND column_name = 'views'
  ) THEN
    ALTER TABLE public.reels ADD COLUMN views integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reels' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE public.reels ADD COLUMN likes_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reels' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE public.reels ADD COLUMN thumbnail_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reels' AND column_name = 'posted_at'
  ) THEN
    ALTER TABLE public.reels ADD COLUMN posted_at timestamptz;
  END IF;
END $$;

-- 2. Create index on views and created_at for fast querying
CREATE INDEX IF NOT EXISTS reels_views_idx ON public.reels(views DESC);
CREATE INDEX IF NOT EXISTS reels_created_at_idx ON public.reels(created_at DESC);

-- 3. increment_reel_views RPC function (atomic and safe for anon/authenticated)
CREATE OR REPLACE FUNCTION public.increment_reel_views(_reel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.reels
  SET views = COALESCE(views, 0) + 1
  WHERE id = _reel_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_reel_views(uuid) TO anon, authenticated;

-- 4. Set replica identity so real-time updates include full row data
ALTER TABLE public.reels REPLICA IDENTITY FULL;

-- 5. Enable Supabase Realtime publication for reels
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
