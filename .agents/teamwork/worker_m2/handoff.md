# Handoff Report: Milestone 2 — Web Build & Capacitor Native Integration

**Agent**: Worker 2 (`worker_m2`)  
**Parent Orchestrator**: `58d264c9-da3b-4e10-8d65-18c146dda3d2`  
**Date**: 2026-10-02  
**Type**: Hard Handoff (Milestone 2 Complete)  

---

## 1. Observation

1. **Push Notification Permission Handling (`src/main.capacitor.tsx`)**:
   - Lines 34–40 were updated from:
     ```typescript
     const permStatus = await PushNotifications.checkPermissions();
     if (permStatus.receive === 'prompt') {
       await PushNotifications.requestPermissions();
     }
     if (permStatus.receive === 'granted') {
       await PushNotifications.register();
     }
     ```
     to:
     ```typescript
     let permStatus = await PushNotifications.checkPermissions();
     if (permStatus.receive === 'prompt') {
       permStatus = await PushNotifications.requestPermissions();
     }
     if (permStatus.receive === 'granted') {
       await PushNotifications.register();
     }
     ```
   - Direct verification confirmed: `let permStatus` enables reassignment, and `PushNotifications.register()` will execute on the same session when permission is granted.

2. **Capacitor Configuration (`capacitor.config.ts`)**:
   - Lines 11–13 added under `plugins`:
     ```typescript
     PushNotifications: {
       presentationOptions: ['badge', 'sound', 'alert'],
     },
     ```
   - Direct verification of generated `android/app/src/main/assets/capacitor.config.json` confirmed `PushNotifications.presentationOptions` is serialized as `["badge", "sound", "alert"]`.

3. **Android Application Manifest (`android/app/src/main/AndroidManifest.xml`)**:
   - Permissions verified:
     - `android.permission.INTERNET` (Line 5)
     - `android.permission.ACCESS_NETWORK_STATE` (Line 6)
     - `android.permission.POST_NOTIFICATIONS` (Line 8)
     - `android.permission.VIBRATE` (Line 9)
   - Metadata added inside `<application>` (Lines 22–27):
     ```xml
     <!-- Push Notifications metadata -->
     <meta-data
         android:name="com.google.firebase.messaging.default_notification_icon"
         android:resource="@mipmap/ic_launcher" />
     <meta-data
         android:name="com.google.firebase.messaging.default_notification_color"
         android:resource="@color/ic_launcher_background" />
     ```
   - Verified that `@mipmap/ic_launcher` and `@color/ic_launcher_background` physically exist in `android/app/src/main/res/`.

4. **AppShell Logo WebView Fallback (`src/components/AppShell.tsx`)**:
   - Added `onError` fallback on `Logo` (Lines 27–29):
     ```tsx
     onError={(e) => {
       e.currentTarget.src = "/pwa-192.png";
     }}
     ```
   - Prevents broken image when `/ __l5e/` reverse-proxy asset fails in mobile WebView context.

5. **Campaign Event Tracking URL Handling (`src/components/news.tsx`)**:
   - Added import `import { Capacitor } from "@capacitor/core";` (Line 4) and helper function (Lines 10–15):
     ```typescript
     function getCampaignEventEndpoint(): string {
       if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
         return "https://abhitak.in/api/public/campaign-event";
       }
       return "/api/public/campaign-event";
     }
     ```
   - Both impression (Line 109) and click (Line 124) `fetch` invocations now use `getCampaignEventEndpoint()`.

6. **Build & Capacitor Sync Execution**:
   - Executed `npm run build:mobile`:
     - Exited with code `0`.
     - Output bundle generated in `dist/client/`.
     - `dist/client/index.html` size: 1,262 bytes.
   - Executed `npx cap copy android`:
     - Exited with code `0`.
     - Synchronized assets to `android/app/src/main/assets/public/`.
     - `android/app/src/main/assets/public/index.html` size: 1,262 bytes (byte-for-byte identical to `dist/client/index.html`).
   - Verified JavaScript bundle (`dist/client/assets/index-CuK73DHZ.js` and `android/app/src/main/assets/public/assets/index-CuK73DHZ.js`):
     - `Contains campaign-event URL`: `true` (`https://abhitak.in/api/public/campaign-event`)
     - `Contains pwa-192 fallback`: `true` (`/pwa-192.png`)
     - `Contains Supabase URL`: `true` (`https://xhxjroxdgdftsngfkggi.supabase.co`)

---

## 2. Logic Chain

1. **Step 1 (Push Notification Registration Reliability)**:
   In `src/main.capacitor.tsx`, reassigning `permStatus` from `await PushNotifications.requestPermissions()` guarantees that if the user grants notification permissions at prompt, the following condition `if (permStatus.receive === 'granted')` immediately evaluates to `true`, triggering `PushNotifications.register()`.

2. **Step 2 (Foreground Notification Presentation)**:
   By declaring `PushNotifications: { presentationOptions: ["badge", "sound", "alert"] }` in `capacitor.config.ts`, Capacitor's native push plugin instructs the Android OS notification manager to show banner alerts, play notification sounds, and badge the app launcher icon when foreground notifications arrive.

3. **Step 3 (Android OS Notification Icon & Color Styling)**:
   On Android 12+, FCM background messages require explicit default notification icon and tint color metadata tags in `AndroidManifest.xml`. Declaring `@mipmap/ic_launcher` and `@color/ic_launcher_background` ensures consistent, non-blank notification rendering.

4. **Step 4 (Mobile WebView Offline/Proxy Asset Fault-Tolerance)**:
   `/__l5e/...` asset endpoints are only reachable through Lovable web preview proxies. In Capacitor Android WebView (`https://localhost/`), requests to `/__l5e/...` fail with 404. The `onError` handler on `Logo` catches this error and switches the image source to local `/pwa-192.png`.

5. **Step 5 (Campaign Event Attribution Compliance)**:
   AGENTS.md mandates: *"Record public campaign metrics only through the validated public API route and narrow database function, never public table updates."*
   In mobile WebView, a relative `/api/public/campaign-event` fetch resolves to `https://localhost/api/public/campaign-event`, which fails because no Nitro server runs locally. By checking `Capacitor.isNativePlatform()`, the mobile client automatically routes metrics to `https://abhitak.in/api/public/campaign-event`, maintaining strict compliance with the rule while recording impressions and clicks reliably.

6. **Step 6 (Static Bundle Compilation & Asset Synchronization)**:
   `npm run build:mobile` compiled the React SPA into `dist/client/`, and `npx cap copy android` mirrored it into `android/app/src/main/assets/public/`. Both operations completed with return code `0`. Both `dist/client/index.html` and `android/app/src/main/assets/public/index.html` are confirmed valid, non-empty, and identical.

---

## 3. Caveats

1. **`google-services.json` Requirement for Live Device FCM**:
   While the manifest metadata and push permissions are fully established, native push token delivery from Google Play Services requires `google-services.json` to be placed in `android/app/` by the application owner. As confirmed in `android/app/build.gradle`, builds proceed cleanly without crashing when this file is absent.
2. **Exclusion of Gradle/Supabase Edits**:
   In strict compliance with write ownership boundaries, no files in `android/*.gradle`, `android/app/*.gradle`, or `supabase/` were touched.

---

## 4. Conclusion

Milestone 2 (Web Build & Capacitor Native Integration) is 100% complete and fully verified.
- Push notification permission defect is resolved in `src/main.capacitor.tsx`.
- `capacitor.config.ts` plugins configuration includes `PushNotifications` presentation options.
- `android/app/src/main/AndroidManifest.xml` contains all required permissions and FCM metadata tags.
- `src/components/AppShell.tsx` includes `onError` logo fallback to `/pwa-192.png`.
- `src/components/news.tsx` dispatches campaign telemetry to `https://abhitak.in/api/public/campaign-event` when on Capacitor native platform.
- `dist/client/` and `android/app/src/main/assets/public/` are fully compiled, synchronized, and verified.

---

## 5. Verification Method

To independently verify the deliverables:

1. **Verify Web Build**:
   ```powershell
   npm run build:mobile
   ```
   *Expected*: Exits with code 0. Generates `dist/client/index.html` and bundles in `dist/client/assets/`.

2. **Verify Capacitor Sync**:
   ```powershell
   npx cap copy android
   ```
   *Expected*: Exits with code 0. Synchronizes `dist/client` to `android/app/src/main/assets/public/`.

3. **Verify Bundle Contents & Synchronization**:
   ```powershell
   node -e "const fs = require('fs'); const a = fs.readFileSync('dist/client/index.html', 'utf8'); const b = fs.readFileSync('android/app/src/main/assets/public/index.html', 'utf8'); console.log('Identical:', a === b, 'Size:', a.length); const cap = JSON.parse(fs.readFileSync('android/app/src/main/assets/capacitor.config.json', 'utf8')); console.log('Push options:', cap.plugins?.PushNotifications?.presentationOptions);"
   ```
   *Expected Output*:
   `Identical: true Size: 1262`
   `Push options: [ 'badge', 'sound', 'alert' ]`

4. **Invalidation Conditions**:
   - Modifying `capacitor.config.ts` without re-running `npx cap copy android`.
   - Modifying `src/` without re-running `npm run build:mobile && npx cap copy android`.
