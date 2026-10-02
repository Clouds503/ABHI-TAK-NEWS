# Handoff Report — Explorer 3 (Supabase Database & Migrations Survey)

## 1. Observation
- **Schema Type Definition (`src/integrations/supabase/types.ts`)**:
  - Contains exactly 17 tables in `Database["public"]["Tables"]` (lines 16–725): `admin_activity_logs`, `advertisements`, `articles`, `bookmarks`, `categories`, `epapers`, `event_registrations`, `events`, `jan_ki_awaaz_posts`, `jan_ki_awaaz_status_history`, `live_streams`, `profiles`, `reels`, `towns`, `user_roles`, `videos`, `villages`.
  - Defines 1 view in `Database["public"]["Views"]` (lines 727–782): `jka_public`.
  - Defines 3 RPC functions in `Database["public"]["Functions"]` (lines 784–797): `has_role`, `is_staff`, `record_campaign_event`.
  - Defines 3 enums in `Database["public"]["Enums"]` (lines 798–815): `app_role`, `content_status`, `jka_status`.
  - Defines composite types (lines 816–818): None (`[_ in never]: never`).
- **Configuration & Migrations (`supabase/`)**:
  - `supabase/config.toml` specifies `project_id = "xhxjroxdgdftsngfkggi"`.
  - `supabase/migrations/20241001000000_initial_schema.sql` (574 lines) exists.
- **Observed Deficiencies & Gaps in `20241001000000_initial_schema.sql`**:
  - *Non-idempotent enums* (lines 17–41): Calls `CREATE TYPE public.app_role AS ENUM (...)` directly. In PostgreSQL, executing this on a database where the enum exists raises `ERROR: type "app_role" already exists`.
  - *Non-idempotent RLS policies* (lines 454–573): Calls `CREATE POLICY "articles_public_read" ON public.articles ...` without prior drop. Re-running throws `ERROR: policy already exists`.
  - *Staff update permission denied on `event_registrations`* (lines 496–498):
    Policy is `CREATE POLICY "event_reg_staff_read" ON public.event_registrations FOR SELECT USING (public.is_staff(auth.uid()));`.
    In `src/routes/_authenticated/admin.events.tsx` line 60: `await supabase.from("event_registrations").update({ status }).eq("id", id);`. Staff is prevented from updating application status.
  - *Staff read permission denied on `user_roles`* (lines 551–553):
    Policy is `CREATE POLICY "user_roles_staff_all" ON public.user_roles FOR ALL USING (public.has_role('super_admin', auth.uid()));`.
    In `src/routes/_authenticated/admin.users.tsx` line 21: `supabase.from("user_roles").select("user_id, role")`. Staff without `super_admin` cannot view user role badges.
  - *Orphaned status history in Jan Ki Awaaz*:
    In `src/routes/_authenticated/my-issues.tsx` line 22: queries `jan_ki_awaaz_status_history(status, created_at)`.
    Neither `src/routes/_authenticated/report.tsx` (line 71) nor `src/routes/_authenticated/admin.moderation.tsx` (line 51) inserts into `jan_ki_awaaz_status_history`. Without a trigger on `jan_ki_awaaz_posts`, `jan_ki_awaaz_status_history` remains completely empty.
  - *Missing storage bucket configuration*:
    `src/routes/_authenticated/report.tsx` (line 34), `admin.articles.tsx` (line 53), `admin.reels.tsx` (line 65), `admin.ads.tsx` (line 133), and `admin.events.tsx` (line 44) upload files to bucket `'media'`, but no storage bucket insertion or storage RLS policies exist in migrations.
  - *Missing seed data*:
    `src/lib/queries.ts` lines 11 and 21 require active `towns` and `categories` (`is_active = true`), but no initial seed rows exist in `supabase/`.

## 2. Logic Chain
1. *From schema types to database requirements*: `src/integrations/supabase/types.ts` is the single source of truth for TypeScript types used by the client application. The database schema must provide all 17 tables, 1 view, 3 functions, and 3 enums with matching field names, nullability, and relations.
2. *From client mutations to RLS requirements*:
   - `admin.events.tsx:60` performs an UPDATE on `event_registrations`. Because RLS is enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`), PostgreSQL checks UPDATE policies. Since the existing migration only has a SELECT policy for staff, this operation fails at runtime. Therefore, the policy must be updated to `FOR ALL USING (public.is_staff(auth.uid()))`.
   - `admin.users.tsx:21` performs a SELECT on `user_roles`. Restricting SELECT to `super_admin` causes normal newsroom editors/moderators to see blank roles. Therefore, a `user_roles_staff_read` policy is required.
3. *From UI expectation to database automation*: `my-issues.tsx` displays a timeline based on `jan_ki_awaaz_status_history`. Because no application code writes to this table, the only reliable way to keep the audit trail intact without adding application network round-trips is a database trigger (`AFTER INSERT OR UPDATE OF status ON public.jan_ki_awaaz_posts`).
4. *From runtime stability to idempotency*: Migrations must be reproducible across clean databases, CI/CD, and existing environments. `CREATE TYPE` and `CREATE POLICY` must be wrapped in exception blocks or preceded by `DROP POLICY IF EXISTS`.

## 3. Caveats
- Read-only survey: No SQL statements were executed against a live Supabase remote database during this investigation.
- Storage schema assumes standard Supabase Storage extension (`storage.buckets` and `storage.objects`).
- `auth.users` is managed by Supabase GoTrue; local migrations without the Supabase CLI environment require GoTrue schema initialization.

## 4. Conclusion
The database structure is well-architected around 17 tables, 1 view, and 3 enums, but the current migration file `supabase/migrations/20241001000000_initial_schema.sql` requires hardening for idempotency, RLS bug fixes on `event_registrations` and `user_roles`, an automatic status history trigger, storage bucket setup, and baseline seed data.

A complete, self-contained, idempotent DDL specification has been generated in:
`c:\Users\Rudra\Desktop\Git\ABHI TAK NEWS\.agents\teamwork\explorer_survey_3\survey_report.md`

## 5. Verification Method
1. **File Verification**:
   Inspect `c:\Users\Rudra\Desktop\Git\ABHI TAK NEWS\.agents\teamwork\explorer_survey_3\survey_report.md` and verify that all 17 tables, 1 view, 3 functions, 3 enums, triggers, RLS policies, and seed data match `src/integrations/supabase/types.ts`.
2. **Defect Verification in Source**:
   - Check `src/routes/_authenticated/admin.events.tsx:60` to confirm status update on `event_registrations`.
   - Check `src/routes/_authenticated/admin.users.tsx:21` to confirm select on `user_roles`.
   - Check `src/routes/_authenticated/my-issues.tsx:22` to confirm select on `jan_ki_awaaz_status_history`.
   - Check `src/routes/_authenticated/report.tsx:34` to confirm upload to `media` bucket.
3. **DDL Syntax and Idempotency Test**:
   When implementing, apply the hardened DDL to `supabase/migrations/20241001000000_initial_schema.sql` and run `npx supabase db lint` or execute against a Postgres test database twice in succession to confirm zero errors on re-execution.
