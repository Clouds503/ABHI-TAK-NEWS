# Google Play Android Vitals & Tablet Quality Specifications

**Application**: Abhi Tak News (`com.abhitak.news`)  
**Target SDK**: 34 (Android 14)  
**Min SDK**: 23 (Android 6.0)

---

## 1. Google Play Android Vitals Benchmarks

Google Play monitors your app's performance metrics through **Android Vitals**. If metrics exceed the "bad behavior threshold", Play Store visibility is throttled.

| Metric                          | Google Play Bad Behavior Threshold | Abhi Tak News Target   | Architecture Verification                                                                                                         |
| ------------------------------- | ---------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **User-Perceived Crash Rate**   | **> 1.09%**                        | **< 0.15%**            | Caught unhandled JS errors via `lovable-error-reporting`, native DEX desugaring enabled                                           |
| **User-Perceived ANR Rate**     | **> 0.47%**                        | **< 0.10%**            | Deferred push notifications to background timer, removed React StrictMode double-subscriptions, removed blocking `shellComponent` |
| **Cold Start Latency**          | **> 5.0 seconds**                  | **< 2.2 seconds**      | Splash launch duration set to 0, immediate WebView handoff, async Supabase session resolution with 5s safety timeout              |
| **Warm Start Latency**          | **> 2.0 seconds**                  | **< 0.8 seconds**      | Fast Activity resume without reloading assets                                                                                     |
| **Slow Rendering (Jank)**       | **> 8.0% of sessions**             | **< 2.0% of sessions** | Hardware accelerated WebView, CSS hardware transforms (`transform`, `opacity`), virtualized list rendering                        |
| **Frozen Frames (>700ms)**      | **> 0.10%**                        | **< 0.02%**            | Zero synchronous disk/network I/O on UI thread                                                                                    |
| **Stuck Background Wake Locks** | **> 0.10%**                        | **0.00%**              | App does not acquire partial wake locks                                                                                           |

---

## 2. Tablet & Large Screen Quality Guidelines (Tier 1 & Tier 2)

Google Play features apps on tablets, foldables, and Chromebooks that meet the **Large Screen Quality Guidelines**.

### A. Layout Adaptation & Responsive Scaling

- **7-inch Tablets (`sw600dp`) & 10-inch Tablets (`sw720dp`)**:
  - The web application uses responsive Tailwind containers (`max-w-lg mx-auto`) with responsive flex and grid layouts.
  - On wide screens, the newsfeed centers naturally with clean gutters, preventing text lines from becoming unreadably long (reading comfort standard: 60–80 characters per line).
  - The bottom navigation bar centers at `max-w-[30rem]` with floating pill geometry (`-translate-x-1/2 left-1/2`), remaining ergonomically reachable on large tablets.
  - Video players and reels scale smoothly with `object-contain` and aspect ratio locks.

### B. Orientation & Multi-Window Support

- **Portrait & Landscape Modes**:
  - In `AndroidManifest.xml`, the activity does not lock orientation to portrait (`android:screenOrientation` is unrestricted), allowing full 90° and 270° rotation on tablets and desktop docks.
- **Split-Screen & Multi-Window**:
  - App supports Android 7.0+ multi-window split-screen mode (`resizeableActivity="true"`). The WebView dynamically adjusts layout upon window resize events without activity restarts.

### C. Touch Target Accessibility

- Every interactive element (buttons, links, search pills, town chips) maintains at least **48x48 dp** physical touch target area to ensure effortless interaction on high-DPI tablets and touch monitors.

---

## 3. Play Console Data Safety Declaration Sheet

When submitting to Google Play Console under the **Data Safety** section, use the following verified answers:

### Data Collection & Purpose:

| Data Type                | Collected? | Shared?        | Purpose                                          | Optional or Required?                    |
| ------------------------ | ---------- | -------------- | ------------------------------------------------ | ---------------------------------------- |
| **Name**                 | Yes        | No             | Account management, Jan Ki Awaaz civic reporting | Optional (Anonymous reporting available) |
| **Phone Number**         | Yes        | No             | Account verification, grievance status alerts    | Optional                                 |
| **Email Address**        | Yes        | No             | Account login & communication                    | Optional                                 |
| **Photos & Videos**      | Yes        | No             | User-uploaded evidence for civic complaints      | Optional (User-selected only)            |
| **Approximate Location** | Yes        | No             | Town/region news filtering (District Bijnor)     | Optional                                 |
| **Device or other IDs**  | Yes        | Yes (Firebase) | Push notifications for breaking news alerts      | Required for alerts (can opt-out)        |

### Security Practices:

- **Data Encrypted in Transit**: Yes (HTTPS / TLS 1.3 enforced for all network calls via `androidScheme: "https"`).
- **Data Deletion Request Available**: Yes (Users can request account or submission deletion via phone/WhatsApp helpline).
- **Compliant with Families Policy**: Yes.
