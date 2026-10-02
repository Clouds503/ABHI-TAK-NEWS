-- =============================================================================
-- Migration: 20241001000000_initial_schema.sql
-- Source: Derived from src/integrations/supabase/types.ts
-- Project: xhxjroxdgdftsngfkggi (Abhi Tak — District Bijnor News)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'admin',
  'editor',
  'moderator',
  'reporter',
  'user'
);

CREATE TYPE public.content_status AS ENUM (
  'draft',
  'pending',
  'published',
  'archived'
);

CREATE TYPE public.jka_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'forwarded',
  'in_progress',
  'resolved',
  'archived'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES (dependency order: referenced tables first)
-- ─────────────────────────────────────────────────────────────────────────────

-- towns (referenced by articles, advertisements, jan_ki_awaaz_posts,
--         profiles, videos, villages)
CREATE TABLE IF NOT EXISTS public.towns (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hi     text        NOT NULL,
  name_en     text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- categories (referenced by articles, videos)
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hi     text    NOT NULL,
  name_en     text    NOT NULL,
  slug        text    NOT NULL UNIQUE,
  kind        text    NOT NULL DEFAULT 'news',
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

-- articles
CREATE TABLE IF NOT EXISTS public.articles (
  id           uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text                   NOT NULL UNIQUE,
  title_hi     text                   NOT NULL,
  title_en     text,
  summary_hi   text,
  summary_en   text,
  body_hi      text,
  body_en      text,
  cover_url    text,
  author_id    uuid,
  author_name  text,
  category_id  uuid                   REFERENCES public.categories(id) ON DELETE SET NULL,
  town_id      uuid                   REFERENCES public.towns(id) ON DELETE SET NULL,
  status       public.content_status  NOT NULL DEFAULT 'draft',
  is_breaking  boolean                NOT NULL DEFAULT false,
  is_featured  boolean                NOT NULL DEFAULT false,
  views        integer                NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at   timestamptz            NOT NULL DEFAULT now(),
  updated_at   timestamptz            NOT NULL DEFAULT now()
);

-- advertisements
CREATE TABLE IF NOT EXISTS public.advertisements (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text    NOT NULL,
  image_url     text    NOT NULL,
  video_url     text,
  link_url      text,
  advertiser    text,
  placement     text    NOT NULL DEFAULT 'home',
  campaign_type text    NOT NULL DEFAULT 'banner',
  media_type    text    NOT NULL DEFAULT 'image',
  is_active     boolean NOT NULL DEFAULT true,
  impressions   integer NOT NULL DEFAULT 0,
  clicks        integer NOT NULL DEFAULT 0,
  town_id       uuid    REFERENCES public.towns(id) ON DELETE SET NULL,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  article_id uuid        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);

-- epapers
CREATE TABLE IF NOT EXISTS public.epapers (
  id           uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text                  NOT NULL,
  pdf_url      text                  NOT NULL,
  cover_url    text,
  edition_date date                  NOT NULL,
  status       public.content_status NOT NULL DEFAULT 'published',
  created_at   timestamptz           NOT NULL DEFAULT now()
);

-- events
CREATE TABLE IF NOT EXISTS public.events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  image_url   text,
  location    text,
  kind        text        NOT NULL DEFAULT 'event',
  allow_join  boolean     NOT NULL DEFAULT false,
  is_active   boolean     NOT NULL DEFAULT true,
  event_at    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- event_registrations
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL,
  full_name  text        NOT NULL,
  phone      text        NOT NULL,
  message    text,
  status     text        NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- jan_ki_awaaz_posts
CREATE TABLE IF NOT EXISTS public.jan_ki_awaaz_posts (
  id            uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text              NOT NULL,
  description   text              NOT NULL,
  category      text              NOT NULL,
  area          text,
  photo_url     text,
  video_url     text,
  latitude      float8,
  longitude     float8,
  is_anonymous  boolean           NOT NULL DEFAULT false,
  is_featured   boolean           NOT NULL DEFAULT false,
  reporter_name text,
  admin_notes   text,
  status        public.jka_status NOT NULL DEFAULT 'pending',
  user_id       uuid,
  town_id       uuid              REFERENCES public.towns(id) ON DELETE SET NULL,
  created_at    timestamptz       NOT NULL DEFAULT now(),
  updated_at    timestamptz       NOT NULL DEFAULT now()
);

-- jan_ki_awaaz_status_history
CREATE TABLE IF NOT EXISTS public.jan_ki_awaaz_status_history (
  id         uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid              NOT NULL REFERENCES public.jan_ki_awaaz_posts(id) ON DELETE CASCADE,
  status     public.jka_status NOT NULL,
  note       text,
  changed_by uuid,
  created_at timestamptz       NOT NULL DEFAULT now()
);

-- live_streams
CREATE TABLE IF NOT EXISTS public.live_streams (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title_hi      text        NOT NULL,
  title_en      text,
  stream_url    text        NOT NULL,
  thumbnail_url text,
  is_live       boolean     NOT NULL DEFAULT false,
  scheduled_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                 uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name          text,
  email              text,
  phone              text,
  town_id            uuid        REFERENCES public.towns(id) ON DELETE SET NULL,
  preferred_language text        NOT NULL DEFAULT 'hi',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- reels
CREATE TABLE IF NOT EXISTS public.reels (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcode  text        NOT NULL UNIQUE,
  video_url  text,
  caption    text,
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid           NOT NULL,
  role    public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- videos
CREATE TABLE IF NOT EXISTS public.videos (
  id            uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  title_hi      text                  NOT NULL,
  title_en      text,
  video_url     text                  NOT NULL,
  thumbnail_url text,
  duration      text,
  category_id   uuid                  REFERENCES public.categories(id) ON DELETE SET NULL,
  town_id       uuid                  REFERENCES public.towns(id) ON DELETE SET NULL,
  status        public.content_status NOT NULL DEFAULT 'draft',
  is_featured   boolean               NOT NULL DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz           NOT NULL DEFAULT now()
);

-- villages
CREATE TABLE IF NOT EXISTS public.villages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hi    text        NOT NULL,
  name_en    text        NOT NULL,
  town_id    uuid        NOT NULL REFERENCES public.towns(id) ON DELETE CASCADE,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- admin_activity_logs
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   uuid,
  entity     text        NOT NULL,
  entity_id  uuid,
  action     text        NOT NULL,
  details    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS articles_slug_idx        ON public.articles(slug);
CREATE INDEX IF NOT EXISTS articles_status_idx      ON public.articles(status);
CREATE INDEX IF NOT EXISTS articles_published_at_idx ON public.articles(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS articles_town_id_idx     ON public.articles(town_id);
CREATE INDEX IF NOT EXISTS articles_category_id_idx ON public.articles(category_id);

CREATE INDEX IF NOT EXISTS advertisements_is_active_idx ON public.advertisements(is_active);
CREATE INDEX IF NOT EXISTS advertisements_placement_idx  ON public.advertisements(placement);

CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx    ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS bookmarks_article_id_idx ON public.bookmarks(article_id);

CREATE INDEX IF NOT EXISTS jka_posts_status_idx  ON public.jan_ki_awaaz_posts(status);
CREATE INDEX IF NOT EXISTS jka_posts_town_id_idx ON public.jan_ki_awaaz_posts(town_id);

CREATE INDEX IF NOT EXISTS videos_status_idx      ON public.videos(status);
CREATE INDEX IF NOT EXISTS videos_town_id_idx     ON public.videos(town_id);
CREATE INDEX IF NOT EXISTS videos_published_at_idx ON public.videos(published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS live_streams_is_live_idx ON public.live_streams(is_live);
CREATE INDEX IF NOT EXISTS reels_sort_order_idx     ON public.reels(sort_order);
CREATE INDEX IF NOT EXISTS reels_is_active_idx      ON public.reels(is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- jka_public: public-facing view of Jan Ki Awaaz posts (hides reporter identity)
CREATE OR REPLACE VIEW public.jka_public AS
SELECT
  p.id,
  p.title,
  p.description,
  p.category,
  p.area,
  p.photo_url,
  p.video_url,
  p.is_featured,
  p.status,
  p.town_id,
  p.created_at,
  p.updated_at,
  CASE WHEN p.is_anonymous THEN NULL ELSE p.reporter_name END AS reporter_name
FROM public.jan_ki_awaaz_posts p
WHERE p.status IN ('approved', 'resolved', 'in_progress');

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- has_role(_role, _user_id): returns true if user has the given role
CREATE OR REPLACE FUNCTION public.has_role(
  _role    public.app_role,
  _user_id uuid
) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- is_staff(_user_id): returns true if user is super_admin, admin, editor, or moderator
CREATE OR REPLACE FUNCTION public.is_staff(
  _user_id uuid
) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin', 'editor', 'moderator')
  );
$$;

-- record_campaign_event(_campaign_id, _event): atomically increments
-- impressions or clicks on an advertisement via a validated API route.
CREATE OR REPLACE FUNCTION public.record_campaign_event(
  _campaign_id uuid,
  _event       text
) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _event = 'impression' THEN
    UPDATE public.advertisements
      SET impressions = impressions + 1
    WHERE id = _campaign_id AND is_active = true;
  ELSIF _event = 'click' THEN
    UPDATE public.advertisements
      SET clicks = clicks + 1
    WHERE id = _campaign_id AND is_active = true;
  ELSE
    RETURN false;
  END IF;
  RETURN FOUND;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on articles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_updated_at ON public.articles;
CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS jka_posts_updated_at ON public.jan_ki_awaaz_posts;
CREATE TRIGGER jka_posts_updated_at
  BEFORE UPDATE ON public.jan_ki_awaaz_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.articles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epapers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jan_ki_awaaz_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jan_ki_awaaz_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.towns             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.villages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- ── articles ─────────────────────────────────────────────────────────────────
CREATE POLICY "articles_public_read" ON public.articles
  FOR SELECT USING (status = 'published');

CREATE POLICY "articles_staff_all" ON public.articles
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── advertisements ───────────────────────────────────────────────────────────
CREATE POLICY "ads_public_read" ON public.advertisements
  FOR SELECT USING (is_active = true);

CREATE POLICY "ads_staff_all" ON public.advertisements
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── bookmarks ────────────────────────────────────────────────────────────────
CREATE POLICY "bookmarks_own" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- ── categories ───────────────────────────────────────────────────────────────
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "categories_staff_all" ON public.categories
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── epapers ──────────────────────────────────────────────────────────────────
CREATE POLICY "epapers_public_read" ON public.epapers
  FOR SELECT USING (status = 'published');

CREATE POLICY "epapers_staff_all" ON public.epapers
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── events ───────────────────────────────────────────────────────────────────
CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (is_active = true);

CREATE POLICY "events_staff_all" ON public.events
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── event_registrations ──────────────────────────────────────────────────────
CREATE POLICY "event_reg_own" ON public.event_registrations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "event_reg_staff_read" ON public.event_registrations
  FOR SELECT USING (public.is_staff(auth.uid()));

-- ── jan_ki_awaaz_posts ───────────────────────────────────────────────────────
CREATE POLICY "jka_public_read" ON public.jan_ki_awaaz_posts
  FOR SELECT USING (status IN ('approved', 'resolved', 'in_progress'));

CREATE POLICY "jka_own_insert" ON public.jan_ki_awaaz_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "jka_own_read" ON public.jan_ki_awaaz_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "jka_staff_all" ON public.jan_ki_awaaz_posts
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── jan_ki_awaaz_status_history ──────────────────────────────────────────────
CREATE POLICY "jka_history_public_read" ON public.jan_ki_awaaz_status_history
  FOR SELECT USING (true);

CREATE POLICY "jka_history_staff_all" ON public.jan_ki_awaaz_status_history
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── live_streams ─────────────────────────────────────────────────────────────
CREATE POLICY "live_public_read" ON public.live_streams
  FOR SELECT USING (true);

CREATE POLICY "live_staff_all" ON public.live_streams
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "profiles_staff_read" ON public.profiles
  FOR SELECT USING (public.is_staff(auth.uid()));

-- ── reels ────────────────────────────────────────────────────────────────────
CREATE POLICY "reels_public_read" ON public.reels
  FOR SELECT USING (is_active = true);

CREATE POLICY "reels_staff_all" ON public.reels
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── towns ────────────────────────────────────────────────────────────────────
CREATE POLICY "towns_public_read" ON public.towns
  FOR SELECT USING (is_active = true);

CREATE POLICY "towns_staff_all" ON public.towns
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── user_roles ───────────────────────────────────────────────────────────────
CREATE POLICY "user_roles_own_read" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_roles_staff_all" ON public.user_roles
  FOR ALL USING (public.has_role('super_admin', auth.uid()));

-- ── videos ───────────────────────────────────────────────────────────────────
CREATE POLICY "videos_public_read" ON public.videos
  FOR SELECT USING (status = 'published');

CREATE POLICY "videos_staff_all" ON public.videos
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── villages ─────────────────────────────────────────────────────────────────
CREATE POLICY "villages_public_read" ON public.villages
  FOR SELECT USING (is_active = true);

CREATE POLICY "villages_staff_all" ON public.villages
  FOR ALL USING (public.is_staff(auth.uid()));

-- ── admin_activity_logs ──────────────────────────────────────────────────────
CREATE POLICY "logs_staff_read" ON public.admin_activity_logs
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "logs_staff_insert" ON public.admin_activity_logs
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
