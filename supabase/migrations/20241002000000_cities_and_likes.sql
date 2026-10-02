-- =============================================================================
-- Migration: 20241002000000_cities_and_likes.sql
-- Adds: cities table, city_id on articles, article_likes table
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. cities table (city-level geography, parallel to towns)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cities (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hi    text        NOT NULL,
  name_en    text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cities_sort_order_idx  ON public.cities(sort_order);
CREATE INDEX IF NOT EXISTS cities_is_active_idx   ON public.cities(is_active);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cities_public_read" ON public.cities;
CREATE POLICY "cities_public_read" ON public.cities
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "cities_staff_all" ON public.cities;
CREATE POLICY "cities_staff_all" ON public.cities
  FOR ALL USING (public.is_staff(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. city_id column on articles
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS articles_city_id_idx ON public.articles(city_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2b. village_id column on articles
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS village_id uuid REFERENCES public.villages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS articles_village_id_idx ON public.articles(village_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. article_likes table (authenticated per-user likes)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.article_likes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  article_id uuid        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS article_likes_article_id_idx ON public.article_likes(article_id);
CREATE INDEX IF NOT EXISTS article_likes_user_id_idx    ON public.article_likes(user_id);

ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read like counts (for public display)
DROP POLICY IF EXISTS "likes_public_read" ON public.article_likes;
CREATE POLICY "likes_public_read" ON public.article_likes
  FOR SELECT USING (true);

-- Authenticated users manage only their own likes
DROP POLICY IF EXISTS "likes_own" ON public.article_likes;
CREATE POLICY "likes_own" ON public.article_likes
  FOR ALL USING (auth.uid() = user_id);
