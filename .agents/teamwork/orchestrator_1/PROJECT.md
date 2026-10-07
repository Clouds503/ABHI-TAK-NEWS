# Project: Abhi Tak News Android & Supabase Migration

## Architecture

- **Web Client (Frontend)**: React 18, Vite SPA (`vite.config.capacitor.ts`), TanStack Router (browser history), Tailwind CSS. Inlines Supabase URL and Publishable Key from `.env`. Assets bundled into `dist/client/`.
- **Capacitor Mobile Container (Bridge)**: Capacitor 6 (`@capacitor/core`, `@capacitor/android`, `@capacitor/push-notifications`). Web assets mirrored to `android/app/src/main/assets/public/`. Android scheme configured to `https://localhost`.
- **Android Native Platform**: Gradle 8.2.1, AGP 8.2.1, compileSdk 34, targetSdk 34, minSdk 23. Application ID: `com.abhitak.news`. Signed release bundle (`app-release.aab`) signed via PKCS12 keystore (`android/app/abhitak-release.keystore`, alias `abhitak`).
- **Database (Supabase PostgreSQL)**: 17 tables, 1 view (`jka_public`), 3 RPC functions (`has_role`, `is_staff`, `record_campaign_event`), 3 enums (`app_role`, `content_status`, `jka_status`), RLS security policies, automated status audit trigger, and `media` storage bucket.

## Feature Inventory

| #   | Feature                                      | Description                                                                                                | Milestone | Source                               | Status |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------ | ------ |
| 1   | Supabase 17-Table Schema DDL                 | Complete table definitions, foreign keys, columns, types matching types.ts                                 | M1        | ORIGINAL_REQUEST §R3                 | DONE   |
| 2   | Enums & Views DDL                            | Idempotent creation of app_role, content_status, jka_status, and jka_public view                           | M1        | ORIGINAL_REQUEST §R3                 | DONE   |
| 3   | RPC Functions & Security                     | has_role, is_staff, and record_campaign_event security definer functions                                   | M1        | ORIGINAL_REQUEST §R3                 | DONE   |
| 4   | RLS Policies & Staff Fixes                   | Idempotent RLS policies including staff UPDATE on event_registrations and staff SELECT on user_roles       | M1        | Explorer 3 Survey                    | DONE   |
| 5   | Jan Ki Awaaz Status Trigger                  | Automated AFTER INSERT OR UPDATE OF status trigger populating jan_ki_awaaz_status_history                  | M1        | Explorer 3 Survey                    | DONE   |
| 6   | Storage Bucket & Policies                    | Initialize 'media' storage bucket and public/authenticated upload/read RLS policies                        | M1        | Explorer 3 Survey                    | DONE   |
| 7   | Active Baseline Seed Data                    | Initial active records for towns and categories required by queries.ts                                     | M1        | Explorer 3 Survey                    | DONE   |
| 8   | Push Notifications Permission Flow           | Fix const permStatus re-assignment in src/main.capacitor.tsx so register() fires on initial grant          | M2        | ORIGINAL_REQUEST §R2                 | DONE   |
| 9   | Capacitor Web App Build                      | vite build via vite.config.capacitor.ts into dist/client/index.html and assets                             | M2        | ORIGINAL_REQUEST §R2                 | DONE   |
| 10  | Capacitor Android Asset Sync                 | npx cap copy android mirroring dist/client to android/app/src/main/assets/public                           | M2        | ORIGINAL_REQUEST §R2                 | DONE   |
| 11  | Android Manifest Permissions & Metadata      | Ensure POST_NOTIFICATIONS, INTERNET, ACCESS_NETWORK_STATE, VIBRATE and FCM notification metadata           | M2        | ORIGINAL_REQUEST §R2                 | DONE   |
| 12  | WebView Routing & Asset Resiliency           | Logo fallback onError in AppShell.tsx and production API prefix for campaign event metrics                 | M2        | Explorer 2 Survey                    | DONE   |
| 13  | Android SDK Environment Config               | android/local.properties pointing to Android SDK directory                                                 | M3        | ORIGINAL_REQUEST §R1                 | DONE   |
| 14  | Desugaring & Synthetic DEX Configuration     | Enable coreLibraryDesugaring with desugar_jdk_libs:2.0.4 and multiDexEnabled true                          | M3        | ORIGINAL_REQUEST §R1                 | DONE   |
| 15  | Gradle Daemon & Memory Tuning                | android/gradle.properties configured with -Xmx3072m, UTF-8, and vfs.watch=false                            | M3        | ORIGINAL_REQUEST §R1                 | DONE   |
| 16  | Release Keystore & Signing Config            | android/app/build.gradle signingConfigs.release referencing abhitak-release.keystore                       | M3        | ORIGINAL_REQUEST §R1                 | DONE   |
| 17  | Debug APK Binary Generation                  | assembleDebug generating verified non-zero android/app/build/outputs/apk/debug/app-debug.apk               | M3        | ORIGINAL_REQUEST Acceptance Criteria | DONE   |
| 18  | Signed Release AAB Generation                | bundleRelease generating verified non-zero signed android/app/build/outputs/bundle/release/app-release.aab | M3        | ORIGINAL_REQUEST Acceptance Criteria | DONE   |
| 19  | Dual Track & Forensic Integrity Verification | Reviewers, Challengers, and Forensic Auditor verification across all deliverables                          | M4        | ORIGINAL_REQUEST Acceptance Criteria | DONE   |

## Milestones

| #   | Name                                            | Scope                                                                                                                                   | Dependencies | Status |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| M1  | Supabase Database Migrations                    | Idempotent, complete SQL migrations in supabase/migrations/ covering all 17 tables, views, functions, RLS, triggers, storage, seed data | None         | DONE   |
| M2  | Web Build & Capacitor Native Integration        | Push notification permission fix, asset build, manifest metadata, logo fallback, cap copy                                               | None         | DONE   |
| M3  | Android Gradle Build & Binary Generation        | local.properties, desugaring/DEX fix, gradle memory tuning, gradlew assembleDebug & bundleRelease                                       | M2           | DONE   |
| M4  | Final Verification, Challenger & Integrity Gate | Multi-agent review, empirical challenger checks, forensic audit, gate approval                                                          | M1, M2, M3   | DONE   |

## Interface Contracts

### Web Application ↔ Capacitor Android

- Web directory: `dist/client/` output copied to `android/app/src/main/assets/public/`.
- Entry point: `android/app/src/main/assets/public/index.html` (1,262 bytes, verified).
- Permissions: `POST_NOTIFICATIONS`, `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE` (verified in AndroidManifest.xml and binary badging).
- Plugins: `@capacitor/push-notifications` configured and registered.

### Client Application ↔ Supabase Database

- Backend URL: `https://xhxjroxdgdftsngfkggi.supabase.co`.
- Tables (17): `admin_activity_logs`, `advertisements`, `articles`, `bookmarks`, `categories`, `epapers`, `event_registrations`, `events`, `jan_ki_awaaz_posts`, `jan_ki_awaaz_status_history`, `live_streams`, `profiles`, `reels`, `towns`, `user_roles`, `videos`, `villages` (100% parity across 154 columns).
- Enums: `app_role`, `content_status`, `jka_status`.
- Views: `jka_public`.
- Functions: `has_role`, `is_staff`, `record_campaign_event`.
