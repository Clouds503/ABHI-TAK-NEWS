## 2026-10-02T07:50:20Z
You are Worker 1 for Milestone 1 (Supabase Database Migrations).
Your working directory is: c:\Users\Rudra\Desktop\Git\ABHI TAK NEWS\.agents\teamwork\worker_m1

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md: c:\Users\Rudra\Desktop\Git\ABHI TAK NEWS\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\Users\Rudra\Desktop\Git\ABHI TAK NEWS\.agents\teamwork\orchestrator_1\PROJECT.md
Also read Explorer 3's report: c:\Users\Rudra\Desktop\Git\ABHI TAK NEWS\.agents\teamwork\explorer_survey_3\survey_report.md

WRITE OWNERSHIP:
You EXCLUSIVELY own files in: supabase/migrations/
Do NOT modify files outside supabase/migrations/.

Task:
Implement a clean, robust, versioned, idempotent PostgreSQL migration file in supabase/migrations/ accurately and completely reflecting the database schema required by src/integrations/supabase/types.ts and runtime queries.
Specifically ensure:
1. All 17 tables are completely defined with proper columns, data types, primary keys, and foreign key constraints:
   admin_activity_logs, advertisements, articles, bookmarks, categories, epapers, event_registrations, events, jan_ki_awaaz_posts, jan_ki_awaaz_status_history, live_streams, profiles, reels, towns, user_roles, videos, villages.
2. Idempotent enum creation (DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN null; END $$;) for:
   - app_role ('super_admin', 'editor', 'moderator', 'reporter', 'user')
   - content_status ('draft', 'review', 'published', 'archived')
   - jka_status ('submitted', 'under_review', 'verified', 'in_progress', 'resolved', 'rejected')
3. RPC functions with SECURITY DEFINER:
   - has_role(role_name text, check_user_id uuid DEFAULT auth.uid())
   - is_staff(check_user_id uuid DEFAULT auth.uid())
   - record_campaign_event(p_advertisement_id uuid, p_event_type text, p_user_agent text DEFAULT NULL, p_referrer text DEFAULT NULL)
4. View:
   - jka_public view querying safe columns from jan_ki_awaaz_posts.
5. RLS policies on all tables, with idempotency (DROP POLICY IF EXISTS before CREATE POLICY), specifically fixing:
   - event_registrations: allow staff UPDATE (e.g. FOR ALL USING (public.is_staff(auth.uid())))
   - user_roles: allow staff SELECT (e.g. FOR SELECT USING (public.is_staff(auth.uid())))
6. Automatic status history trigger:
   - CREATE OR REPLACE FUNCTION public.handle_jka_status_change() ... trigger AFTER INSERT OR UPDATE OF status ON public.jan_ki_awaaz_posts.
7. Media storage bucket & policies:
   - Insert 'media' bucket into storage.buckets if not exists, and add storage.objects policies.
8. Active baseline seed data:
   - INSERT initial active records for towns and categories if empty so queries with is_active = true return data.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Verification:
Inspect and validate the migration SQL file for syntax, completeness against types.ts, and idempotency.

Write handoff.md in your working directory and notify the parent orchestrator via send_message when done.
