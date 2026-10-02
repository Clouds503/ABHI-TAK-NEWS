-- =============================================================================
-- Migration: 20241001000000_initial_schema.sql (Hardened & Idempotent)
-- Source: Completely aligned with src/integrations/supabase/types.ts & App Runtime
-- Project: xhxjroxdgdftsngfkggi (Abhi Tak — District Bijnor News)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ENUMS (IDEMPOTENT CREATION & VALUE SYNCHRONIZATION)
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1 app_role
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'super_admin', 'admin', 'editor', 'moderator', 'reporter', 'user'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reporter';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

-- 2.2 content_status
DO $$ BEGIN
  CREATE TYPE public.content_status AS ENUM (
    'draft', 'pending', 'review', 'published', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'published';
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'archived';

-- 2.3 jka_status
DO $$ BEGIN
  CREATE TYPE public.jka_status AS ENUM (
    'pending', 'submitted', 'under_review', 'approved', 'verified', 'in_progress', 'forwarded', 'resolved', 'rejected', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TYPE public.jka_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.jka_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE public.jka_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE public.jka_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.jka_status ADD VALUE IF NOT EXISTS 'verified';
ALTER TYPE public.jka_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.jka_status ADD VALUE IF NOT EXISTS 'forwarded';
ALTER TYPE public.jka_status ADD VALUE IF NOT EXISTS 'resolved';
ALTER TYPE public.jka_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.jka_status ADD VALUE IF NOT EXISTS 'archived';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLES (TOPOLOGICAL DEPENDENCY ORDER)
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1 towns (Level 0)
CREATE TABLE IF NOT EXISTS public.towns (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hi     text        NOT NULL,
  name_en     text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3.2 categories (Level 0)
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hi     text        NOT NULL,
  name_en     text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  kind        text        NOT NULL DEFAULT 'news',
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true
);

-- 3.3 epapers (Level 0)
CREATE TABLE IF NOT EXISTS public.epapers (
  id           uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text                  NOT NULL,
  pdf_url      text                  NOT NULL,
  cover_url    text,
  edition_date date                  NOT NULL,
  status       public.content_status NOT NULL DEFAULT 'published',
  created_at   timestamptz           NOT NULL DEFAULT now()
);

-- 3.4 events (Level 0)
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

-- 3.5 live_streams (Level 0)
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

-- 3.6 reels (Level 0)
CREATE TABLE IF NOT EXISTS public.reels (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcode  text        NOT NULL UNIQUE,
  video_url  text,
  caption    text,
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.7 admin_activity_logs (Level 0)
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   uuid,
  entity     text        NOT NULL,
  entity_id  uuid,
  action     text        NOT NULL,
  details    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.8 articles (Level 1: depends on categories, towns)
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

-- 3.9 advertisements (Level 1: depends on towns)
CREATE TABLE IF NOT EXISTS public.advertisements (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text        NOT NULL,
  image_url     text        NOT NULL,
  video_url     text,
  link_url      text,
  advertiser    text,
  placement     text        NOT NULL DEFAULT 'home',
  campaign_type text        NOT NULL DEFAULT 'banner',
  media_type    text        NOT NULL DEFAULT 'image',
  is_active     boolean     NOT NULL DEFAULT true,
  impressions   integer     NOT NULL DEFAULT 0,
  clicks        integer     NOT NULL DEFAULT 0,
  town_id       uuid        REFERENCES public.towns(id) ON DELETE SET NULL,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3.10 event_registrations (Level 1: depends on events)
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

-- 3.11 jan_ki_awaaz_posts (Level 1: depends on towns)
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

-- 3.12 profiles (Level 1: depends on auth.users, towns)
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

-- 3.13 user_roles (Level 1: auth.users role assignments)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid           NOT NULL,
  role    public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 3.14 videos (Level 1: depends on categories, towns)
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

-- 3.15 villages (Level 1: depends on towns)
CREATE TABLE IF NOT EXISTS public.villages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hi    text        NOT NULL,
  name_en    text        NOT NULL,
  town_id    uuid        NOT NULL REFERENCES public.towns(id) ON DELETE CASCADE,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.16 bookmarks (Level 2: depends on articles)
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  article_id uuid        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);

-- 3.17 jan_ki_awaaz_status_history (Level 2: depends on jan_ki_awaaz_posts)
CREATE TABLE IF NOT EXISTS public.jan_ki_awaaz_status_history (
  id         uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid              NOT NULL REFERENCES public.jan_ki_awaaz_posts(id) ON DELETE CASCADE,
  status     public.jka_status NOT NULL,
  note       text,
  changed_by uuid,
  created_at timestamptz       NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS articles_slug_idx         ON public.articles(slug);
CREATE INDEX IF NOT EXISTS articles_status_idx       ON public.articles(status);
CREATE INDEX IF NOT EXISTS articles_published_at_idx ON public.articles(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS articles_town_id_idx      ON public.articles(town_id);
CREATE INDEX IF NOT EXISTS articles_category_id_idx  ON public.articles(category_id);

CREATE INDEX IF NOT EXISTS advertisements_is_active_idx ON public.advertisements(is_active);
CREATE INDEX IF NOT EXISTS advertisements_placement_idx  ON public.advertisements(placement);
CREATE INDEX IF NOT EXISTS advertisements_town_id_idx   ON public.advertisements(town_id);

CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx     ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS bookmarks_article_id_idx  ON public.bookmarks(article_id);

CREATE INDEX IF NOT EXISTS jka_posts_status_idx      ON public.jan_ki_awaaz_posts(status);
CREATE INDEX IF NOT EXISTS jka_posts_town_id_idx     ON public.jan_ki_awaaz_posts(town_id);
CREATE INDEX IF NOT EXISTS jka_posts_user_id_idx     ON public.jan_ki_awaaz_posts(user_id);

CREATE INDEX IF NOT EXISTS jka_history_post_id_idx   ON public.jan_ki_awaaz_status_history(post_id);

CREATE INDEX IF NOT EXISTS videos_status_idx         ON public.videos(status);
CREATE INDEX IF NOT EXISTS videos_town_id_idx        ON public.videos(town_id);
CREATE INDEX IF NOT EXISTS videos_published_at_idx   ON public.videos(published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS live_streams_is_live_idx  ON public.live_streams(is_live);
CREATE INDEX IF NOT EXISTS reels_sort_order_idx      ON public.reels(sort_order);
CREATE INDEX IF NOT EXISTS reels_is_active_idx       ON public.reels(is_active);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx    ON public.user_roles(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- jka_public: public-facing view of citizen grievances (redacts anonymous identity)
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
WHERE p.status IN ('approved', 'resolved', 'in_progress', 'verified');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC FUNCTIONS (SECURITY DEFINER)
-- ─────────────────────────────────────────────────────────────────────────────

-- 6.1 has_role (accepts role_name as text with default check_user_id)
CREATE OR REPLACE FUNCTION public.has_role(
  role_name     text,
  check_user_id uuid DEFAULT auth.uid()
) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role::text = role_name
  );
$$;

-- 6.2 is_staff (checks staff roles with default check_user_id)
CREATE OR REPLACE FUNCTION public.is_staff(
  check_user_id uuid DEFAULT auth.uid()
) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id
      AND role::text IN ('super_admin', 'admin', 'editor', 'moderator')
  );
$$;

-- 6.3 record_campaign_event (supports both runtime API signature & audit parameter naming)
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

CREATE OR REPLACE FUNCTION public.record_campaign_event(
  p_advertisement_id uuid,
  p_event_type       text,
  p_user_agent       text DEFAULT NULL,
  p_referrer         text DEFAULT NULL
) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN public.record_campaign_event(_campaign_id => p_advertisement_id, _event => p_event_type);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TRIGGER FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- 7.1 handle_new_user: Auto-provision profile and default role
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

-- 7.2 set_updated_at: Maintain updated_at timestamp
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

-- 7.3 handle_jka_status_change: Audit history tracking on status transition
CREATE OR REPLACE FUNCTION public.handle_jka_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.jan_ki_awaaz_status_history (
      post_id,
      status,
      note,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.status,
      CASE
        WHEN TG_OP = 'INSERT' THEN 'Issue submitted'
        ELSE NEW.admin_notes
      END,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Alias for backwards compatibility
CREATE OR REPLACE FUNCTION public.log_jka_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN public.handle_jka_status_change();
END;
$$;

DROP TRIGGER IF EXISTS jka_status_history_trigger ON public.jan_ki_awaaz_posts;
CREATE TRIGGER jka_status_history_trigger
  AFTER INSERT OR UPDATE OF status ON public.jan_ki_awaaz_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_jka_status_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS) - IDEMPOTENT POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.articles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epapers                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jan_ki_awaaz_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jan_ki_awaaz_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.towns                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.villages                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs         ENABLE ROW LEVEL SECURITY;

-- 8.1 articles
DROP POLICY IF EXISTS "articles_public_read" ON public.articles;
CREATE POLICY "articles_public_read" ON public.articles
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "articles_staff_all" ON public.articles;
CREATE POLICY "articles_staff_all" ON public.articles
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.2 advertisements
DROP POLICY IF EXISTS "ads_public_read" ON public.advertisements;
CREATE POLICY "ads_public_read" ON public.advertisements
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "ads_staff_all" ON public.advertisements;
CREATE POLICY "ads_staff_all" ON public.advertisements
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.3 bookmarks
DROP POLICY IF EXISTS "bookmarks_own" ON public.bookmarks;
CREATE POLICY "bookmarks_own" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- 8.4 categories
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "categories_staff_all" ON public.categories;
CREATE POLICY "categories_staff_all" ON public.categories
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.5 epapers
DROP POLICY IF EXISTS "epapers_public_read" ON public.epapers;
CREATE POLICY "epapers_public_read" ON public.epapers
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "epapers_staff_all" ON public.epapers;
CREATE POLICY "epapers_staff_all" ON public.epapers
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.6 events
DROP POLICY IF EXISTS "events_public_read" ON public.events;
CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "events_staff_all" ON public.events;
CREATE POLICY "events_staff_all" ON public.events
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.7 event_registrations (HARDENED: Staff granted ALL to allow registration status approval/update)
DROP POLICY IF EXISTS "event_reg_own" ON public.event_registrations;
CREATE POLICY "event_reg_own" ON public.event_registrations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "event_reg_staff_read" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_staff_all" ON public.event_registrations;
CREATE POLICY "event_reg_staff_all" ON public.event_registrations
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.8 jan_ki_awaaz_posts
DROP POLICY IF EXISTS "jka_public_read" ON public.jan_ki_awaaz_posts;
CREATE POLICY "jka_public_read" ON public.jan_ki_awaaz_posts
  FOR SELECT USING (status IN ('approved', 'resolved', 'in_progress', 'verified'));

DROP POLICY IF EXISTS "jka_own_insert" ON public.jan_ki_awaaz_posts;
CREATE POLICY "jka_own_insert" ON public.jan_ki_awaaz_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "jka_own_read" ON public.jan_ki_awaaz_posts;
CREATE POLICY "jka_own_read" ON public.jan_ki_awaaz_posts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "jka_staff_all" ON public.jan_ki_awaaz_posts;
CREATE POLICY "jka_staff_all" ON public.jan_ki_awaaz_posts
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.9 jan_ki_awaaz_status_history
DROP POLICY IF EXISTS "jka_history_public_read" ON public.jan_ki_awaaz_status_history;
CREATE POLICY "jka_history_public_read" ON public.jan_ki_awaaz_status_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "jka_history_staff_all" ON public.jan_ki_awaaz_status_history;
CREATE POLICY "jka_history_staff_all" ON public.jan_ki_awaaz_status_history
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.10 live_streams
DROP POLICY IF EXISTS "live_public_read" ON public.live_streams;
CREATE POLICY "live_public_read" ON public.live_streams
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "live_staff_all" ON public.live_streams;
CREATE POLICY "live_staff_all" ON public.live_streams
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.11 profiles
DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_staff_read" ON public.profiles;
CREATE POLICY "profiles_staff_read" ON public.profiles
  FOR SELECT USING (public.is_staff(auth.uid()));

-- 8.12 reels
DROP POLICY IF EXISTS "reels_public_read" ON public.reels;
CREATE POLICY "reels_public_read" ON public.reels
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "reels_staff_all" ON public.reels;
CREATE POLICY "reels_staff_all" ON public.reels
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.13 towns
DROP POLICY IF EXISTS "towns_public_read" ON public.towns;
CREATE POLICY "towns_public_read" ON public.towns
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "towns_staff_all" ON public.towns;
CREATE POLICY "towns_staff_all" ON public.towns
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.14 user_roles (HARDENED: Staff granted SELECT to view role badges in admin user list)
DROP POLICY IF EXISTS "user_roles_own_read" ON public.user_roles;
CREATE POLICY "user_roles_own_read" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_roles_staff_read" ON public.user_roles;
CREATE POLICY "user_roles_staff_read" ON public.user_roles
  FOR SELECT USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "user_roles_staff_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_super_admin_all" ON public.user_roles;
CREATE POLICY "user_roles_super_admin_all" ON public.user_roles
  FOR ALL USING (public.has_role('super_admin', auth.uid()));

-- 8.15 videos
DROP POLICY IF EXISTS "videos_public_read" ON public.videos;
CREATE POLICY "videos_public_read" ON public.videos
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "videos_staff_all" ON public.videos;
CREATE POLICY "videos_staff_all" ON public.videos
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.16 villages
DROP POLICY IF EXISTS "villages_public_read" ON public.villages;
CREATE POLICY "villages_public_read" ON public.villages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "villages_staff_all" ON public.villages;
CREATE POLICY "villages_staff_all" ON public.villages
  FOR ALL USING (public.is_staff(auth.uid()));

-- 8.17 admin_activity_logs
DROP POLICY IF EXISTS "logs_staff_read" ON public.admin_activity_logs;
CREATE POLICY "logs_staff_read" ON public.admin_activity_logs
  FOR SELECT USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "logs_staff_insert" ON public.admin_activity_logs;
CREATE POLICY "logs_staff_insert" ON public.admin_activity_logs
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. STORAGE INITIALIZATION & RLS (media bucket)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_auth_insert" ON storage.objects;
CREATE POLICY "media_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "media_staff_all" ON storage.objects;
CREATE POLICY "media_staff_all" ON storage.objects
  FOR ALL USING (bucket_id = 'media' AND public.is_staff(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. BASELINE SEED DATA (Active Towns and Categories)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.towns (slug, name_hi, name_en, sort_order, is_active) VALUES
  ('bijnor', 'बिजनौर', 'Bijnor', 1, true),
  ('chandpur', 'चांदपुर', 'Chandpur', 2, true),
  ('dhampur', 'धामपुर', 'Dhampur', 3, true),
  ('najibabad', 'नजीबाबाद', 'Najibabad', 4, true),
  ('nagina', 'नगीना', 'Nagina', 5, true),
  ('kiratpur', 'कीरतपुर', 'Kiratpur', 6, true),
  ('seohara', 'स्योहारा', 'Seohara', 7, true),
  ('noorpur', 'नूरपुर', 'Noorpur', 8, true),
  ('haldaur', 'हल्दौर', 'Haldaur', 9, true)
ON CONFLICT (slug) DO UPDATE
  SET is_active = true,
      name_hi = EXCLUDED.name_hi,
      name_en = EXCLUDED.name_en;

INSERT INTO public.categories (slug, name_hi, name_en, kind, sort_order, is_active) VALUES
  ('news', 'ख़बरें', 'News', 'news', 1, true),
  ('politics', 'राजनीति', 'Politics', 'news', 2, true),
  ('crime', 'अपराध', 'Crime', 'news', 3, true),
  ('sports', 'खेल', 'Sports', 'news', 4, true),
  ('business', 'व्यापार', 'Business', 'news', 5, true),
  ('entertainment', 'मनोरंजन', 'Entertainment', 'news', 6, true)
ON CONFLICT (slug) DO UPDATE
  SET is_active = true,
      name_hi = EXCLUDED.name_hi,
      name_en = EXCLUDED.name_en,
      kind = EXCLUDED.kind;
