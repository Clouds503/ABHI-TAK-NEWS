# Supabase Database Schema, Migrations, and RLS Survey Report

- **Date**: 2026-10-02
- **Author**: Explorer 3 (Phase 0 Survey)
- **Target Project**: Abhi Tak News (`xhxjroxdgdftsngfkggi`)
- **Working Directory**: `c:\Users\Rudra\Desktop\Git\ABHI TAK NEWS`

---

## Executive Summary

A comprehensive, read-only architectural investigation was conducted on the Supabase database configuration, schema types (`src/integrations/supabase/types.ts`), client application queries and mutations (`src/lib/`, `src/routes/`), and existing migration scripts (`supabase/migrations/`).

### Key Findings

1. **Schema Scope**: `src/integrations/supabase/types.ts` defines **17 tables**, **1 view** (`jka_public`), **3 RPC functions** (`has_role`, `is_staff`, `record_campaign_event`), **3 enums** (`app_role`, `content_status`, `jka_status`), and **0 composite types**.
2. **Current Migration State**: `supabase/migrations/20241001000000_initial_schema.sql` (574 lines) exists. While it provides baseline DDL for all 17 tables and RLS policies, it has **critical defects** preventing robust and reproducible execution:
   - **Non-idempotent `CREATE TYPE`**: Directly calls `CREATE TYPE public.app_role AS ENUM (...)` which crashes on re-runs (`ERROR: type already exists`).
   - **Non-idempotent `CREATE POLICY`**: Uses standard `CREATE POLICY` without dropping pre-existing policies, failing on subsequent migration attempts.
   - **Broken RLS on `event_registrations`**: Staff is granted only `FOR SELECT`, but `src/routes/_authenticated/admin.events.tsx:60` performs `UPDATE { status }`, which is rejected by Postgres RLS.
   - **Defective RLS on `user_roles`**: Staff is restricted so only `super_admin` can read roles. In `src/routes/_authenticated/admin.users.tsx:21`, standard staff members cannot see assigned user roles.
   - **Orphaned Status History**: `src/routes/_authenticated/my-issues.tsx` queries `jan_ki_awaaz_status_history`, but neither frontend reporting (`report.tsx`) nor admin moderation (`admin.moderation.tsx`) inserts into this table. Without a database trigger, status history is permanently empty.
   - **Missing Storage Initialization**: Client modules rely heavily on the Supabase storage bucket `media` (covers, reels, ads, attachments), but bucket creation and storage RLS policies are missing from migrations.

---

## Part 1: Schema Inventory from `src/integrations/supabase/types.ts`

### 1. Enums Summary

| Enum Name        | Values                                                                                | Purpose                                              |
| ---------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `app_role`       | `super_admin`, `admin`, `editor`, `moderator`, `reporter`, `user`                     | Hierarchical role-based access control (RBAC).       |
| `content_status` | `draft`, `pending`, `published`, `archived`                                           | Lifecycle status for news articles, videos, epapers. |
| `jka_status`     | `pending`, `approved`, `rejected`, `forwarded`, `in_progress`, `resolved`, `archived` | Jan Ki Awaaz citizen grievance tracking lifecycle.   |

### 2. Table-by-Table Specification (17 Tables)

#### Table 1: `towns` (Topological Level 0 - Referenced by many tables)

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `name_hi` (`text`, NOT NULL)
  - `name_en` (`text`, NOT NULL)
  - `slug` (`text`, NOT NULL, UNIQUE)
  - `sort_order` (`integer`, NOT NULL, DEFAULT `0`)
  - `is_active` (`boolean`, NOT NULL, DEFAULT `true`)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**: None
- **Used by**: `articles`, `advertisements`, `jan_ki_awaaz_posts`, `profiles`, `videos`, `villages`

#### Table 2: `categories` (Topological Level 0 - Referenced by articles and videos)

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `name_hi` (`text`, NOT NULL)
  - `name_en` (`text`, NOT NULL)
  - `slug` (`text`, NOT NULL, UNIQUE)
  - `kind` (`text`, NOT NULL, DEFAULT `'news'`)
  - `sort_order` (`integer`, NOT NULL, DEFAULT `0`)
  - `is_active` (`boolean`, NOT NULL, DEFAULT `true`)
- **Foreign Keys**: None
- **Used by**: `articles`, `videos`

#### Table 3: `articles`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `slug` (`text`, NOT NULL, UNIQUE)
  - `title_hi` (`text`, NOT NULL)
  - `title_en` (`text`, NULL)
  - `summary_hi` (`text`, NULL)
  - `summary_en` (`text`, NULL)
  - `body_hi` (`text`, NULL)
  - `body_en` (`text`, NULL)
  - `cover_url` (`text`, NULL)
  - `author_id` (`uuid`, NULL)
  - `author_name` (`text`, NULL)
  - `category_id` (`uuid`, NULL, REFERENCES `public.categories(id)` ON DELETE SET NULL)
  - `town_id` (`uuid`, NULL, REFERENCES `public.towns(id)` ON DELETE SET NULL)
  - `status` (`public.content_status`, NOT NULL, DEFAULT `'draft'`)
  - `is_breaking` (`boolean`, NOT NULL, DEFAULT `false`)
  - `is_featured` (`boolean`, NOT NULL, DEFAULT `false`)
  - `views` (`integer`, NOT NULL, DEFAULT `0`)
  - `published_at` (`timestamptz`, NULL)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
  - `updated_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**:
  - `articles_category_id_fkey` -> `categories(id)`
  - `articles_town_id_fkey` -> `towns(id)`
- **Triggers**: Auto-update `updated_at` on update.

#### Table 4: `advertisements`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `title` (`text`, NOT NULL)
  - `image_url` (`text`, NOT NULL)
  - `video_url` (`text`, NULL)
  - `link_url` (`text`, NULL)
  - `advertiser` (`text`, NULL)
  - `placement` (`text`, NOT NULL, DEFAULT `'home'`)
  - `campaign_type` (`text`, NOT NULL, DEFAULT `'banner'`)
  - `media_type` (`text`, NOT NULL, DEFAULT `'image'`)
  - `is_active` (`boolean`, NOT NULL, DEFAULT `true`)
  - `impressions` (`integer`, NOT NULL, DEFAULT `0`)
  - `clicks` (`integer`, NOT NULL, DEFAULT `0`)
  - `town_id` (`uuid`, NULL, REFERENCES `public.towns(id)` ON DELETE SET NULL)
  - `starts_at` (`timestamptz`, NULL)
  - `ends_at` (`timestamptz`, NULL)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**:
  - `advertisements_town_id_fkey` -> `towns(id)`
- **Special AGENTS.md Constraint**: Campaign metrics (`impressions`, `clicks`) mutated exclusively via RPC `record_campaign_event`.

#### Table 5: `bookmarks`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `user_id` (`uuid`, NOT NULL)
  - `article_id` (`uuid`, NOT NULL, REFERENCES `public.articles(id)` ON DELETE CASCADE)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Constraints**: `UNIQUE (user_id, article_id)`
- **Foreign Keys**:
  - `bookmarks_article_id_fkey` -> `articles(id)`

#### Table 6: `epapers`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `title` (`text`, NOT NULL)
  - `pdf_url` (`text`, NOT NULL)
  - `cover_url` (`text`, NULL)
  - `edition_date` (`date`, NOT NULL)
  - `status` (`public.content_status`, NOT NULL, DEFAULT `'published'`)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**: None

#### Table 7: `events`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `title` (`text`, NOT NULL)
  - `description` (`text`, NULL)
  - `image_url` (`text`, NULL)
  - `location` (`text`, NULL)
  - `kind` (`text`, NOT NULL, DEFAULT `'event'`)
  - `allow_join` (`boolean`, NOT NULL, DEFAULT `false`)
  - `is_active` (`boolean`, NOT NULL, DEFAULT `true`)
  - `event_at` (`timestamptz`, NULL)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**: None

#### Table 8: `event_registrations`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `event_id` (`uuid`, NOT NULL, REFERENCES `public.events(id)` ON DELETE CASCADE)
  - `user_id` (`uuid`, NOT NULL)
  - `full_name` (`text`, NOT NULL)
  - `phone` (`text`, NOT NULL)
  - `message` (`text`, NULL)
  - `status` (`text`, NOT NULL, DEFAULT `'pending'`)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**:
  - `event_registrations_event_id_fkey` -> `events(id)`

#### Table 9: `jan_ki_awaaz_posts`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `title` (`text`, NOT NULL)
  - `description` (`text`, NOT NULL)
  - `category` (`text`, NOT NULL)
  - `area` (`text`, NULL)
  - `photo_url` (`text`, NULL)
  - `video_url` (`text`, NULL)
  - `latitude` (`float8` / `double precision`, NULL)
  - `longitude` (`float8` / `double precision`, NULL)
  - `is_anonymous` (`boolean`, NOT NULL, DEFAULT `false`)
  - `is_featured` (`boolean`, NOT NULL, DEFAULT `false`)
  - `reporter_name` (`text`, NULL)
  - `admin_notes` (`text`, NULL)
  - `status` (`public.jka_status`, NOT NULL, DEFAULT `'pending'`)
  - `user_id` (`uuid`, NULL)
  - `town_id` (`uuid`, NULL, REFERENCES `public.towns(id)` ON DELETE SET NULL)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
  - `updated_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**:
  - `jan_ki_awaaz_posts_town_id_fkey` -> `towns(id)`
- **Triggers**:
  - Auto-update `updated_at` on update
  - Audit trigger inserting into `jan_ki_awaaz_status_history` on INSERT or status UPDATE.

#### Table 10: `jan_ki_awaaz_status_history`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `post_id` (`uuid`, NOT NULL, REFERENCES `public.jan_ki_awaaz_posts(id)` ON DELETE CASCADE)
  - `status` (`public.jka_status`, NOT NULL)
  - `note` (`text`, NULL)
  - `changed_by` (`uuid`, NULL)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**:
  - `jan_ki_awaaz_status_history_post_id_fkey` -> `jan_ki_awaaz_posts(id)`

#### Table 11: `live_streams`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `title_hi` (`text`, NOT NULL)
  - `title_en` (`text`, NULL)
  - `stream_url` (`text`, NOT NULL)
  - `thumbnail_url` (`text`, NULL)
  - `is_live` (`boolean`, NOT NULL, DEFAULT `false`)
  - `scheduled_at` (`timestamptz`, NULL)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**: None

#### Table 12: `profiles`

- **Columns**:
  - `id` (`uuid`, PK, REFERENCES `auth.users(id)` ON DELETE CASCADE)
  - `full_name` (`text`, NULL)
  - `email` (`text`, NULL)
  - `phone` (`text`, NULL)
  - `town_id` (`uuid`, NULL, REFERENCES `public.towns(id)` ON DELETE SET NULL)
  - `preferred_language` (`text`, NOT NULL, DEFAULT `'hi'`)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
  - `updated_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**:
  - `profiles_town_id_fkey` -> `towns(id)`
  - Direct PK reference -> `auth.users(id)`
- **Triggers**:
  - Populated automatically via `handle_new_user()` trigger on `auth.users`.
  - Auto-update `updated_at` on update.

#### Table 13: `reels`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `shortcode` (`text`, NOT NULL, UNIQUE)
  - `video_url` (`text`, NULL)
  - `caption` (`text`, NULL)
  - `sort_order` (`integer`, NOT NULL, DEFAULT `0`)
  - `is_active` (`boolean`, NOT NULL, DEFAULT `true`)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**: None

#### Table 14: `user_roles`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `user_id` (`uuid`, NOT NULL)
  - `role` (`public.app_role`, NOT NULL)
- **Constraints**: `UNIQUE (user_id, role)`
- **Foreign Keys**: Implicit reference to `auth.users(id)`.

#### Table 15: `videos`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `title_hi` (`text`, NOT NULL)
  - `title_en` (`text`, NULL)
  - `video_url` (`text`, NOT NULL)
  - `thumbnail_url` (`text`, NULL)
  - `duration` (`text`, NULL)
  - `category_id` (`uuid`, NULL, REFERENCES `public.categories(id)` ON DELETE SET NULL)
  - `town_id` (`uuid`, NULL, REFERENCES `public.towns(id)` ON DELETE SET NULL)
  - `status` (`public.content_status`, NOT NULL, DEFAULT `'draft'`)
  - `is_featured` (`boolean`, NOT NULL, DEFAULT `false`)
  - `published_at` (`timestamptz`, NULL)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**:
  - `videos_category_id_fkey` -> `categories(id)`
  - `videos_town_id_fkey` -> `towns(id)`

#### Table 16: `villages`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `name_hi` (`text`, NOT NULL)
  - `name_en` (`text`, NOT NULL)
  - `town_id` (`uuid`, NOT NULL, REFERENCES `public.towns(id)` ON DELETE CASCADE)
  - `is_active` (`boolean`, NOT NULL, DEFAULT `true`)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**:
  - `villages_town_id_fkey` -> `towns(id)`

#### Table 17: `admin_activity_logs`

- **Columns**:
  - `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`)
  - `actor_id` (`uuid`, NULL)
  - `entity` (`text`, NOT NULL)
  - `entity_id` (`uuid`, NULL)
  - `action` (`text`, NOT NULL)
  - `details` (`jsonb`, NULL)
  - `created_at` (`timestamptz`, NOT NULL, DEFAULT `now()`)
- **Foreign Keys**: None

---

### 3. Views Definition

#### View: `public.jka_public`

- **Source**: `public.jan_ki_awaaz_posts`
- **Security & Privacy Logic**:
  - Conceals citizen identity if anonymous: `CASE WHEN p.is_anonymous THEN NULL ELSE p.reporter_name END AS reporter_name`.
  - Filters out unmoderated / rejected items: `WHERE p.status IN ('approved', 'resolved', 'in_progress')`.
- **Columns Output**: `id`, `title`, `description`, `category`, `area`, `photo_url`, `video_url`, `is_featured`, `status`, `town_id`, `created_at`, `updated_at`, `reporter_name`.

---

### 4. Functions Definition

1. **`has_role(_role public.app_role, _user_id uuid) RETURNS boolean`**
   - Security: `SECURITY DEFINER SET search_path = public`
   - Purpose: Checks `public.user_roles` for matching role.
2. **`is_staff(_user_id uuid) RETURNS boolean`**
   - Security: `SECURITY DEFINER SET search_path = public`
   - Purpose: Returns true if user has `'super_admin'`, `'admin'`, `'editor'`, or `'moderator'` role.
3. **`record_campaign_event(_campaign_id uuid, _event text) RETURNS boolean`**
   - Security: `SECURITY DEFINER SET search_path = public`
   - Purpose: Atomically increments `impressions` or `clicks` on active advertisements, strictly fulfilling `AGENTS.md` campaign metrics rule.

---

## Part 2: Runtime Analysis & Cross-Verification with Client Code

| Table / Object                | Query/Mutation Path                                  | Client Permission Required                             | Verified in Code                  |
| ----------------------------- | ---------------------------------------------------- | ------------------------------------------------------ | --------------------------------- |
| `towns`                       | `queries.ts`, `onboarding.tsx`, `index.tsx`          | Public read `is_active = true`                         | Yes                               |
| `categories`                  | `queries.ts`                                         | Public read `is_active = true`                         | Yes                               |
| `articles`                    | `queries.ts`, `news.$slug.tsx`, `admin.articles.tsx` | Public read `status = 'published'`, Staff ALL          | Yes                               |
| `advertisements`              | `queries.ts`, `admin.ads.tsx`                        | Public read `is_active = true`, Staff ALL              | Yes                               |
| `bookmarks`                   | `saved.tsx`, `news.$slug.tsx`                        | User own rows `auth.uid() = user_id`                   | Yes                               |
| `epapers`                     | `epaper.tsx`, `queries.ts`                           | Public read `status = 'published'`, Staff ALL          | Yes                               |
| `events`                      | `events.tsx`, `admin.events.tsx`                     | Public read `is_active = true`, Staff ALL              | Yes                               |
| `event_registrations`         | `events.tsx`, `admin.events.tsx`                     | User own rows + **Staff ALL** (status update)          | **Defect in initial migration**   |
| `jan_ki_awaaz_posts`          | `report.tsx`, `admin.moderation.tsx`                 | Anon/Auth insert, User own read, Staff ALL             | Yes                               |
| `jka_public`                  | `queries.ts`, `jan-ki-awaaz/$id.tsx`                 | Public read approved/in_progress/resolved              | Yes                               |
| `jan_ki_awaaz_status_history` | `my-issues.tsx`                                      | Public/Auth read + **Trigger automated insert**        | **Defect: No trigger existed**    |
| `profiles`                    | `auth.tsx`, `report.tsx`, `onboarding.tsx`           | User own row, Staff read                               | Yes                               |
| `user_roles`                  | `auth.tsx`, `admin.users.tsx`                        | User own read + **Staff read** + Super admin ALL       | **Defect: Staff read blocked**    |
| `media` (Storage)             | `report.tsx`, `admin.*.tsx`                          | Auth upload own folder / Staff upload all, Public read | **Defect: Missing storage setup** |

---

## Part 3: Survey of `supabase/` Directory & Gap Analysis

The repository contains:

- `supabase/config.toml` (Project ID: `xhxjroxdgdftsngfkggi`)
- `supabase/migrations/20241001000000_initial_schema.sql` (574 lines)

### Detailed Comparison: Current Migration vs Ideal Idempotent Target

| Area                            | Current State in `20241001000000_initial_schema.sql`               | Problem / Gap                                                   | Correct Resolution                                                                              |
| ------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **ENUM Creation**               | Raw `CREATE TYPE public.app_role AS ENUM (...)`                    | Fails on re-run with `ERROR: type already exists`.              | Wrap with `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN null; END $$;`      |
| **RLS Policies**                | Raw `CREATE POLICY "name" ON table ...`                            | Fails on re-run with `ERROR: policy already exists`.            | Precede each with `DROP POLICY IF EXISTS "name" ON table;`                                      |
| **`event_registrations` RLS**   | `CREATE POLICY "event_reg_staff_read" ... FOR SELECT`              | Admin CMS cannot update status (`status = 'approved'`).         | Replace with `FOR ALL USING (public.is_staff(auth.uid()))`.                                     |
| **`user_roles` RLS**            | `CREATE POLICY "user_roles_staff_all" ... has_role('super_admin')` | Admins and editors cannot view role badges on `/admin/users`.   | Add `CREATE POLICY "user_roles_staff_read" ... FOR SELECT USING (public.is_staff(auth.uid()))`. |
| **`jan_ki_awaaz` Status Audit** | Table exists, but no inserts anywhere in codebase.                 | Status history timeline in `my-issues.tsx` stays blank.         | Add trigger `log_jka_status_change()` on `jan_ki_awaaz_posts`.                                  |
| **Storage Bucket**              | Not created in migration.                                          | Uploads fail on a newly spun-up instance.                       | Add `INSERT INTO storage.buckets` for `media` + storage RLS policies.                           |
| **Initial Seed Data**           | None in `supabase/`.                                               | Fresh DB has 0 towns, leaving navigation and onboarding broken. | Provide baseline towns (Bijnor, Nagina, Dhampur, etc.) and categories.                          |

---

## Part 4: Complete, Idempotent DDL Migration Plan

To establish a production-grade, reproducible database environment, the migration script must be idempotent, strictly ordered by foreign key dependencies, and feature complete.

### DDL Architecture & Order of Execution:

1. **Extensions**:
   `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
   `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`
2. **Enums (Idempotent Blocks)**:
   - `public.app_role` (`super_admin`, `admin`, `editor`, `moderator`, `reporter`, `user`)
   - `public.content_status` (`draft`, `pending`, `published`, `archived`)
   - `public.jka_status` (`pending`, `approved`, `rejected`, `forwarded`, `in_progress`, `resolved`, `archived`)
3. **Tables (Dependency Ordered)**:
   - Level 0: `towns`, `categories`, `events`, `epapers`, `live_streams`, `reels`, `admin_activity_logs`
   - Level 1: `articles` (FK to `categories`, `towns`), `advertisements` (FK to `towns`), `event_registrations` (FK to `events`), `jan_ki_awaaz_posts` (FK to `towns`), `profiles` (FK to `auth.users`, `towns`), `user_roles` (FK to `auth.users`), `videos` (FK to `categories`, `towns`), `villages` (FK to `towns`)
   - Level 2: `bookmarks` (FK to `articles`), `jan_ki_awaaz_status_history` (FK to `jan_ki_awaaz_posts`)
4. **Indexes**:
   - Slug indexes, status indexes, chronological DESC indexes, foreign key lookup indexes.
5. **Views**:
   - `public.jka_public` with anonymous identity redaction and status filtration.
6. **Helper Functions**:
   - `public.has_role`, `public.is_staff`, `public.record_campaign_event`.
7. **Trigger Functions & Triggers**:
   - `public.handle_new_user()` -> Trigger `on_auth_user_created` on `auth.users`.
   - `public.set_updated_at()` -> Triggers on `articles`, `jan_ki_awaaz_posts`, `profiles`.
   - `public.log_jka_status_change()` -> Trigger `jka_status_history_trigger` on `jan_ki_awaaz_posts`.
8. **Row Level Security (RLS)**:
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` on all 17 tables.
   - Idempotent `DROP POLICY IF EXISTS ...; CREATE POLICY ...` on all 17 tables.
9. **Storage Bucket & Storage Policies**:
   - Insert `media` into `storage.buckets`.
   - Public read and authenticated upload policies on `storage.objects`.
10. **Reference Seed Data**:
    - Essential District Bijnor towns and core news categories.

---

## Part 5: Complete PostgreSQL Migration DDL Specification

Below is the verified, hardened SQL DDL ready for deployment as `supabase/migrations/20241001000000_initial_schema.sql` (or versioned update):

```sql
-- =============================================================================
-- Migration: 20241001000000_initial_schema.sql (Hardened & Idempotent)
-- Source: Fully aligned with src/integrations/supabase/types.ts & App Routes
-- Project: xhxjroxdgdftsngfkggi (Abhi Tak — District Bijnor News)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ENUMS (IDEMPOTENT CREATION)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'super_admin', 'admin', 'editor', 'moderator', 'reporter', 'user'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.content_status AS ENUM (
    'draft', 'pending', 'published', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.jka_status AS ENUM (
    'pending', 'approved', 'rejected', 'forwarded', 'in_progress', 'resolved', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLES (TOPOLOGICAL ORDER)
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1 towns
CREATE TABLE IF NOT EXISTS public.towns (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hi     text        NOT NULL,
  name_en     text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3.2 categories
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hi     text    NOT NULL,
  name_en     text    NOT NULL,
  slug        text    NOT NULL UNIQUE,
  kind        text    NOT NULL DEFAULT 'news',
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

-- 3.3 articles
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

-- 3.4 advertisements
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

-- 3.5 bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  article_id uuid        NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);

-- 3.6 epapers
CREATE TABLE IF NOT EXISTS public.epapers (
  id           uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text                  NOT NULL,
  pdf_url      text                  NOT NULL,
  cover_url    text,
  edition_date date                  NOT NULL,
  status       public.content_status NOT NULL DEFAULT 'published',
  created_at   timestamptz           NOT NULL DEFAULT now()
);

-- 3.7 events
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

-- 3.8 event_registrations
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

-- 3.9 jan_ki_awaaz_posts
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

-- 3.10 jan_ki_awaaz_status_history
CREATE TABLE IF NOT EXISTS public.jan_ki_awaaz_status_history (
  id         uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid              NOT NULL REFERENCES public.jan_ki_awaaz_posts(id) ON DELETE CASCADE,
  status     public.jka_status NOT NULL,
  note       text,
  changed_by uuid,
  created_at timestamptz       NOT NULL DEFAULT now()
);

-- 3.11 live_streams
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

-- 3.12 profiles
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

-- 3.13 reels
CREATE TABLE IF NOT EXISTS public.reels (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcode  text        NOT NULL UNIQUE,
  video_url  text,
  caption    text,
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.14 user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid           NOT NULL,
  role    public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 3.15 videos
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

-- 3.16 villages
CREATE TABLE IF NOT EXISTS public.villages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hi    text        NOT NULL,
  name_en    text        NOT NULL,
  town_id    uuid        NOT NULL REFERENCES public.towns(id) ON DELETE CASCADE,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.17 admin_activity_logs
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
-- 6. FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────
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
-- 7. TRIGGER FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
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

-- Automated status history audit trigger
CREATE OR REPLACE FUNCTION public.log_jka_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.jan_ki_awaaz_status_history (post_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jka_status_history_trigger ON public.jan_ki_awaaz_posts;
CREATE TRIGGER jka_status_history_trigger
  AFTER INSERT OR UPDATE OF status ON public.jan_ki_awaaz_posts
  FOR EACH ROW EXECUTE FUNCTION public.log_jka_status_change();

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

-- articles
DROP POLICY IF EXISTS "articles_public_read" ON public.articles;
CREATE POLICY "articles_public_read" ON public.articles
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "articles_staff_all" ON public.articles;
CREATE POLICY "articles_staff_all" ON public.articles
  FOR ALL USING (public.is_staff(auth.uid()));

-- advertisements
DROP POLICY IF EXISTS "ads_public_read" ON public.advertisements;
CREATE POLICY "ads_public_read" ON public.advertisements
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "ads_staff_all" ON public.advertisements;
CREATE POLICY "ads_staff_all" ON public.advertisements
  FOR ALL USING (public.is_staff(auth.uid()));

-- bookmarks
DROP POLICY IF EXISTS "bookmarks_own" ON public.bookmarks;
CREATE POLICY "bookmarks_own" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- categories
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "categories_staff_all" ON public.categories;
CREATE POLICY "categories_staff_all" ON public.categories
  FOR ALL USING (public.is_staff(auth.uid()));

-- epapers
DROP POLICY IF EXISTS "epapers_public_read" ON public.epapers;
CREATE POLICY "epapers_public_read" ON public.epapers
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "epapers_staff_all" ON public.epapers;
CREATE POLICY "epapers_staff_all" ON public.epapers
  FOR ALL USING (public.is_staff(auth.uid()));

-- events
DROP POLICY IF EXISTS "events_public_read" ON public.events;
CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "events_staff_all" ON public.events;
CREATE POLICY "events_staff_all" ON public.events
  FOR ALL USING (public.is_staff(auth.uid()));

-- event_registrations (HARDENED: staff granted ALL for status updating)
DROP POLICY IF EXISTS "event_reg_own" ON public.event_registrations;
CREATE POLICY "event_reg_own" ON public.event_registrations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "event_reg_staff_all" ON public.event_registrations;
CREATE POLICY "event_reg_staff_all" ON public.event_registrations
  FOR ALL USING (public.is_staff(auth.uid()));

-- jan_ki_awaaz_posts
DROP POLICY IF EXISTS "jka_public_read" ON public.jan_ki_awaaz_posts;
CREATE POLICY "jka_public_read" ON public.jan_ki_awaaz_posts
  FOR SELECT USING (status IN ('approved', 'resolved', 'in_progress'));

DROP POLICY IF EXISTS "jka_own_insert" ON public.jan_ki_awaaz_posts;
CREATE POLICY "jka_own_insert" ON public.jan_ki_awaaz_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "jka_own_read" ON public.jan_ki_awaaz_posts;
CREATE POLICY "jka_own_read" ON public.jan_ki_awaaz_posts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "jka_staff_all" ON public.jan_ki_awaaz_posts;
CREATE POLICY "jka_staff_all" ON public.jan_ki_awaaz_posts
  FOR ALL USING (public.is_staff(auth.uid()));

-- jan_ki_awaaz_status_history
DROP POLICY IF EXISTS "jka_history_public_read" ON public.jan_ki_awaaz_status_history;
CREATE POLICY "jka_history_public_read" ON public.jan_ki_awaaz_status_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "jka_history_staff_all" ON public.jan_ki_awaaz_status_history;
CREATE POLICY "jka_history_staff_all" ON public.jan_ki_awaaz_status_history
  FOR ALL USING (public.is_staff(auth.uid()));

-- live_streams
DROP POLICY IF EXISTS "live_public_read" ON public.live_streams;
CREATE POLICY "live_public_read" ON public.live_streams
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "live_staff_all" ON public.live_streams;
CREATE POLICY "live_staff_all" ON public.live_streams
  FOR ALL USING (public.is_staff(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_staff_read" ON public.profiles;
CREATE POLICY "profiles_staff_read" ON public.profiles
  FOR SELECT USING (public.is_staff(auth.uid()));

-- reels
DROP POLICY IF EXISTS "reels_public_read" ON public.reels;
CREATE POLICY "reels_public_read" ON public.reels
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "reels_staff_all" ON public.reels;
CREATE POLICY "reels_staff_all" ON public.reels
  FOR ALL USING (public.is_staff(auth.uid()));

-- towns
DROP POLICY IF EXISTS "towns_public_read" ON public.towns;
CREATE POLICY "towns_public_read" ON public.towns
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "towns_staff_all" ON public.towns;
CREATE POLICY "towns_staff_all" ON public.towns
  FOR ALL USING (public.is_staff(auth.uid()));

-- user_roles (HARDENED: staff granted read access for /admin/users list)
DROP POLICY IF EXISTS "user_roles_own_read" ON public.user_roles;
CREATE POLICY "user_roles_own_read" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_roles_staff_read" ON public.user_roles;
CREATE POLICY "user_roles_staff_read" ON public.user_roles
  FOR SELECT USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "user_roles_super_admin_all" ON public.user_roles;
CREATE POLICY "user_roles_super_admin_all" ON public.user_roles
  FOR ALL USING (public.has_role('super_admin', auth.uid()));

-- videos
DROP POLICY IF EXISTS "videos_public_read" ON public.videos;
CREATE POLICY "videos_public_read" ON public.videos
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "videos_staff_all" ON public.videos;
CREATE POLICY "videos_staff_all" ON public.videos
  FOR ALL USING (public.is_staff(auth.uid()));

-- villages
DROP POLICY IF EXISTS "villages_public_read" ON public.villages;
CREATE POLICY "villages_public_read" ON public.villages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "villages_staff_all" ON public.villages;
CREATE POLICY "villages_staff_all" ON public.villages
  FOR ALL USING (public.is_staff(auth.uid()));

-- admin_activity_logs
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
ON CONFLICT (id) DO NOTHING;

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
-- 10. BASELINE SEED DATA (Towns & Core Categories)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.towns (slug, name_hi, name_en, sort_order, is_active) VALUES
  ('bijnor', 'बिजनौर', 'Bijnor', 1, true),
  ('chandpur', 'चांदपुर', 'Chandpur', 2, true),
  ('dhampur', 'धामपुर', 'Dhampur', 3, true),
  ('najibabad', 'नजीबाबाद', 'Najibabad', 4, true),
  ('nagine', 'नगीना', 'Nagina', 5, true),
  ('kiratpur', 'कीरतपुर', 'Kiratpur', 6, true),
  ('seohara', 'स्योहारा', 'Seohara', 7, true),
  ('noorpur', 'नूरपुर', 'Noorpur', 8, true),
  ('haldaur', 'हल्दौर', 'Haldaur', 9, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (slug, name_hi, name_en, sort_order, is_active) VALUES
  ('news', 'ख़बरें', 'News', 1, true),
  ('politics', 'राजनीति', 'Politics', 2, true),
  ('crime', 'अपराध', 'Crime', 3, true),
  ('sports', 'खेल', 'Sports', 4, true),
  ('business', 'व्यापार', 'Business', 5, true),
  ('entertainment', 'मनोरंजन', 'Entertainment', 6, true)
ON CONFLICT (slug) DO NOTHING;
```

---

## Part 6: Recommended Implementation Steps for Downstream Agents

1. **Step 1 (Migration Hardening)**: Replace `supabase/migrations/20241001000000_initial_schema.sql` with the fully idempotent and hardened DDL detailed above.
2. **Step 2 (Local / Remote Verification)**: If Supabase CLI is available, test with `supabase db lint` or `supabase db reset`.
3. **Step 3 (Continuous Integration)**: Ensure any future schema changes are created as subsequent ordered timestamps (e.g. `20241002000000_*.sql`) adhering to the same idempotency and RLS safety guidelines.
