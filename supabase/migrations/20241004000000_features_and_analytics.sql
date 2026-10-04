-- =============================================================================
-- Migration: 20241004000000_features_and_analytics.sql
-- Adds: reel_likes table, app_analytics_events table, increment_article_views RPC
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. reel_likes table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reel_likes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  reel_id    uuid        NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reel_id)
);

CREATE INDEX IF NOT EXISTS reel_likes_reel_id_idx ON public.reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS reel_likes_user_id_idx ON public.reel_likes(user_id);

ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reel_likes_public_read" ON public.reel_likes;
CREATE POLICY "reel_likes_public_read" ON public.reel_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "reel_likes_own" ON public.reel_likes;
CREATE POLICY "reel_likes_own" ON public.reel_likes
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. app_analytics_events table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_analytics_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,
  entity_type text,
  entity_id   text,
  platform    text        NOT NULL DEFAULT 'web',
  user_id     uuid,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_analytics_events_created_at_idx ON public.app_analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS app_analytics_events_event_type_idx ON public.app_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS app_analytics_events_platform_idx   ON public.app_analytics_events(platform);

ALTER TABLE public.app_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_events_insert_all" ON public.app_analytics_events;
CREATE POLICY "analytics_events_insert_all" ON public.app_analytics_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_events_staff_select" ON public.app_analytics_events;
CREATE POLICY "analytics_events_staff_select" ON public.app_analytics_events
  FOR SELECT USING (public.is_staff(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. increment_article_views RPC function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_article_views(_article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.articles
  SET views = COALESCE(views, 0) + 1
  WHERE id = _article_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_article_views(uuid) TO anon, authenticated;
