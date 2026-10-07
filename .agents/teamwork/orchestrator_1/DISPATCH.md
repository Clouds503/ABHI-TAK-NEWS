# Dispatch Log

## 2026-10-02T07:18:03Z

Sender: 6f2dd27e-d854-42b7-bbbb-e4ef9e98488b (parent)
Objective:
Convert the existing Abhi Tak News progressive web application (PWA) into installable Android binaries (debug APK and signed release AAB) using Capacitor, resolve all underlying Android Gradle / JVM build pipeline failures, and establish reproducible Supabase database migrations.

Requirements:

### R1. Android Package Generation (APK and AAB)

- Produce a working, installable Android debug APK (app-debug.apk) for device testing.
- Produce a production-ready signed Android App Bundle (app-release.aab) configured for Google Play Store distribution using the release keystore (android/app/abhitak-release.keystore).
- Ensure application ID is com.abhitak.news with minSdkVersion 23 and targetSdkVersion 34.
- Diagnose and resolve the Android Gradle build pipeline errors, specifically desugaring/DEX transform conflicts (mergeDebugGlobalSynthetics), resource compilation errors, and file lock issues under Windows.

### R2. Native & Web Application Integration

- Build and bundle the client web application as a standalone static bundle inside the Capacitor Android assets directory.
- Ensure the app maintains functional client routing, Supabase backend connectivity, and styling within the Android WebView container.
- Enable push notification readiness with Capacitor Push Notifications plugin and required Android manifest permissions (POST_NOTIFICATIONS, INTERNET, ACCESS_NETWORK_STATE).

### R3. Supabase Database Migrations

- Provide a clean, versioned SQL migration file in supabase/migrations/ accurately reflecting the complete database schema (all 17 tables, views, RLS policies, functions, enums, and triggers).

Acceptance Criteria:

- Binary Deliverables:
  - An .apk file exists in android/app/build/outputs/ (or designated output directory) and is verified to be non-zero in size.
  - An .aab file exists in android/app/build/outputs/ (or designated output directory) signed with the release keystore and verified to be non-zero in size.
  - Running the Android build command (gradlew assembleDebug and gradlew bundleRelease) exits cleanly with return code 0.
- Database Deliverables:
  - supabase/migrations/ contains valid PostgreSQL migration scripts defining all schema objects present in src/integrations/supabase/types.ts.
