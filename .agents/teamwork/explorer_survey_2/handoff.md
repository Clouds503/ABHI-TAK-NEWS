# Handoff Report: Web Client Build & Capacitor Native Integration

**Agent**: Explorer 2 (`explorer_survey_2`)  
**Parent Orchestrator**: `58d264c9-da3b-4e10-8d65-18c146dda3d2`  
**Date**: 2026-10-02  
**Type**: Hard Handoff (Investigation & Survey Complete)

---

## 1. Observation

1. **`package.json` Dependencies and Scripts**:
   - Lines 24–29 define:
     ```json
     "@capacitor/android": "^6.2.2",
     "@capacitor/cli": "^6.2.2",
     "@capacitor/core": "^6.2.2",
     "@capacitor/push-notifications": "^6.0.5",
     "@capacitor/splash-screen": "^6.0.4",
     "@capacitor/status-bar": "^6.0.3",
     ```
   - Lines 13–18 define:
     ```json
     "build:mobile": "vite build --config vite.config.capacitor.ts && node -e \"const fs=require('fs');const p='dist/client/index.capacitor.html';if(fs.existsSync(p))fs.renameSync(p,'dist/client/index.html');\"",
     "cap:sync": "npx cap sync android",
     "cap:copy": "npx cap copy android",
     "cap:open": "npx cap open android",
     "android:apk": "npm run build:mobile && npx cap copy android",
     "android:aab": "npm run build:mobile && npx cap copy android"
     ```
   - Observed command execution: `npm run build:mobile` completed with return code `0` in 41.03s, generating `dist/client/index.html` (1.26 kB), `dist/client/assets/styles-Cfl5V9o-.css` (103.74 kB), and `dist/client/assets/index-C_My003f.js` (899.38 kB).
   - Observed command execution: `npx cap copy android` completed with return code `0` in 3.73s, copying web assets into `android\app\src\main\assets\public`.
   - Observed gap: Neither `android:apk` nor `android:aab` runs `./gradlew assembleDebug` or `./gradlew bundleRelease`.

2. **Capacitor Configuration (`capacitor.config.ts`)**:
   - Lines 3–23 define:
     ```typescript
     const config: CapacitorConfig = {
       appId: "com.abhitak.news",
       appName: "Abhi Tak",
       webDir: "dist/client",
       server: {
         androidScheme: "https",
       },
       plugins: {
         SplashScreen: {
           launchAutoHide: true,
           launchShowDuration: 1200,
           backgroundColor: "#ffffff",
           androidSplashResourceName: "splash",
           showSpinner: false,
         },
         StatusBar: {
           style: "DEFAULT",
           backgroundColor: "#D40000",
         },
       },
     };
     ```
   - Observed: `appId` matches requirement `com.abhitak.news`. `server.androidScheme` is `https`. No `PushNotifications` plugin entry in `plugins`.

3. **Android Manifest (`android/app/src/main/AndroidManifest.xml`)**:
   - Lines 5–11 define:
     ```xml
     <uses-permission android:name="android.permission.INTERNET" />
     <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
     <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
     <uses-permission android:name="android.permission.VIBRATE" />
     <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
     ```
   - Observed: All required network and notification permissions are present.
   - Lines 22–45: `MainActivity` has `launchMode="singleTask"`, `exported="true"`, and intent filters for `MAIN`/`LAUNCHER` and `https://abhitak.in`.
   - Observed gap: Missing `<meta-data android:name="com.google.firebase.messaging.default_notification_icon" ... />` and `default_notification_color`.

4. **Capacitor Android Assets Directory (`android/app/src/main/assets/`)**:
   - Contains `capacitor.config.json`, `capacitor.plugins.json`, and `public/`.
   - `public/index.html` references `/assets/index-C_My003f.js` and `/assets/styles-Cfl5V9o-.css`.
   - All bundled files in `dist/client/assets/` are mirrored byte-for-byte in `android/app/src/main/assets/public/assets/`.

5. **Client Routing & Supabase Client**:
   - `src/router.tsx` lines 17–23: uses `createRouter` with `routeTree` and default browser history (`createBrowserHistory()`).
   - `src/integrations/supabase/client.ts` lines 34–35:
     ```typescript
     const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
     const SUPABASE_PUBLISHABLE_KEY =
       import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];
     ```
   - Verified in bundle `dist/client/assets/index-C_My003f.js`: Vite statically inlines `VITE_SUPABASE_URL: "https://xhxjroxdgdftsngfkggi.supabase.co"` and `VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_EiyprYhAi2XiwC-cbWBb3w_KJQPd37p"`.
   - `src/integrations/supabase/previewAuthStorage.ts` line 18: `if (!projectId || !framed) return localStorage;` evaluates to `localStorage` in Capacitor WebView (`localhost`).

6. **Push Notifications Integration in `src/main.capacitor.tsx`**:
   - Lines 34–40:
     ```typescript
     const permStatus = await PushNotifications.checkPermissions();
     if (permStatus.receive === "prompt") {
       await PushNotifications.requestPermissions();
     }
     if (permStatus.receive === "granted") {
       await PushNotifications.register();
     }
     ```
   - Observed bug: `permStatus` is declared `const`. When status is `prompt`, `requestPermissions()` runs but its return value is discarded; `permStatus.receive` remains `'prompt'`, so `register()` is never reached on initial grant.

---

## 2. Logic Chain

1. **Step 1 (Web Client Build Validity)**:
   From Observation 1, `npm run build:mobile` ran `vite build --config vite.config.capacitor.ts` and exited with return code 0.
   Therefore, the mobile SPA bundle compilation is working properly without syntax or packaging errors.

2. **Step 2 (Capacitor Sync Validity)**:
   From Observations 1 and 4, `npx cap copy android` successfully copied the web output from `dist/client` to `android/app/src/main/assets/public`.
   Therefore, the web-to-native asset pipeline is fully functional and currently in sync.

3. **Step 3 (Supabase Client Inlining & Connectivity)**:
   From Observation 5, inspection of `index-C_My003f.js` verified that Vite has baked `https://xhxjroxdgdftsngfkggi.supabase.co` and `sb_publishable_...` directly into the bundle.
   From Observation 3, `INTERNET` and `ACCESS_NETWORK_STATE` permissions exist in `AndroidManifest.xml`.
   From Observation 5, `brokeredPreviewStorage()` falls back to standard `localStorage`.
   Therefore, the mobile app will connect to Supabase and persist user auth sessions in Android WebView without requiring external environment configuration at runtime.

4. **Step 4 (Routing & WebView Compatibility)**:
   From Observations 2 and 5, `capacitor.config.ts` sets `androidScheme: 'https'`, and TanStack Router uses browser history.
   Capacitor's internal WebView server serves `index.html` as the SPA fallback for all sub-routes under `https://localhost/`.
   Therefore, client-side routing is compatible with Android WebView. However, hardware back button navigation is currently unhandled due to lack of `@capacitor/app`.

5. **Step 5 (Push Notification Defect)**:
   From Observation 6, the unassigned return value of `requestPermissions()` prevents `PushNotifications.register()` from executing during the first session when a user allows notifications.
   Therefore, fixing this to `let permStatus` and reassigning `permStatus = await PushNotifications.requestPermissions()` is necessary for push notifications to initialize properly.

---

## 3. Caveats

1. **FCM Project Key / `google-services.json`**:
   `android/app/google-services.json` is not present in the repository. While `android/app/build.gradle` safely guards against build crashes when it is absent, real device FCM token generation requires this file to be placed into `android/app/` by the application owner.
2. **Lovable Proxy Assets (`/__l5e/...`)**:
   `src/assets/abhi-tak-logo-256.webp.asset.json` references `/__l5e/assets-v1/...`. In the mobile WebView at `https://localhost`, this proxy does not exist, so an `onError` fallback to `/pwa-192.png` is necessary in `src/components/AppShell.tsx`.
3. **Relative `/api/public/campaign-event`**:
   In `src/components/news.tsx`, relative fetches to `/api/...` will 404 in the mobile WebView because there is no local Nitro server. Directing these calls to `https://abhitak.in` satisfies the project requirement while ensuring mobile metric logging.

---

## 4. Conclusion

The Web Client build (`vite.config.capacitor.ts`) and Capacitor asset pipeline (`npx cap copy android`) are structurally sound, operational, and in full synchronization.

To achieve complete production readiness for R2:

1. Fix the `PushNotifications.requestPermissions()` bug in `src/main.capacitor.tsx`.
2. Add foreground notification presentation options to `capacitor.config.ts`.
3. Add missing Firebase default notification icon/color `<meta-data>` to `android/app/src/main/AndroidManifest.xml`.
4. Shield `Logo` image loading in `src/components/AppShell.tsx` with an `onError` fallback to `/pwa-192.png`.
5. Prepend `https://abhitak.in` to the public campaign event tracking endpoint in `src/components/news.tsx`.
6. Add `@capacitor/app` to handle Android hardware back button events.

---

## 5. Verification Method

1. **Web Build Verification**:
   ```powershell
   npm run build:mobile
   ```
   _Expected_: Exit code 0, generates `dist/client/index.html` and bundled assets.
2. **Capacitor Copy Verification**:
   ```powershell
   npx cap copy android
   ```
   _Expected_: Exit code 0, mirrors `dist/client/` to `android/app/src/main/assets/public/`.
3. **Environment Inlining Check**:
   ```powershell
   node -e "const f = require('fs').readFileSync('dist/client/assets/index-C_My003f.js', 'utf8'); console.log(f.includes('xhxjroxdgdftsngfkggi'));"
   ```
   _Expected_: Outputs `true`.
4. **Invalidation Conditions**:
   - Any modification to `vite.config.capacitor.ts` or `src/router.tsx` that breaks client-side SPA routing.
   - Deletion of `.env` before running `build:mobile` that leaves Supabase credentials empty.
