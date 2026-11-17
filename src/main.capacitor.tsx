/**
 * Capacitor / mobile SPA entry point.
 *
 * This file is only used for the Android build (npm run build:mobile).
 * The SSR / web build continues to use @tanstack/react-start's own entry.
 *
 * KEY DIFFERENCES from the web entry:
 * - No StrictMode (prevents double Supabase auth subscriptions on Android)
 * - shellComponent stripped from root route (prevents html/body inside #root)
 * - QueryClientProvider is omitted here; RootComponent already provides it
 */
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

// Capacitor core — must be imported before plugins
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { PushNotifications } from "@capacitor/push-notifications";

import "./styles.css";

// ── Router & QueryClient ─────────────────────────────────────────────────────
const router = getRouter();

// CRITICAL FIX: Strip `shellComponent` from the root route.
// In SSR (web), shellComponent renders <html><body> around the app.
// In Capacitor SPA, RouterProvider mounts into <div id="root"> — if shellComponent
// fires it creates <html>/<body> *inside* #root. Browsers silently move them to
// document root, detaching the React tree from the DOM: all event listeners are
// lost and the UI becomes completely unresponsive.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rootRoute = router.routeTree as any;
if (rootRoute?.options) {
  rootRoute.options.shellComponent = undefined;
}

// ── Native initialisation (runs only on real devices) ───────────────────────
async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  // 1. Immediately dismiss SplashScreen so WebView gets full touch events right away
  try {
    await SplashScreen.hide();
  } catch (e) {
    console.warn("[SplashScreen] hide failed:", e);
  }

  // 2. Status bar: match app theme colour #D40000
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  await StatusBar.setBackgroundColor({ color: "#D40000" }).catch(() => {});

  // 3. Asynchronously register push notifications without blocking the UI thread
  setTimeout(async () => {
    try {
      PushNotifications.addListener("registration", (token) => {
        console.info("[Push] FCM token:", token.value);
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.warn("[Push] Registration error:", err.error);
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.info("[Push] Foreground notification:", notification);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const path: unknown = action.notification.data?.["path"];
        if (typeof path === "string" && path.startsWith("/")) {
          router.navigate({ to: path as "/" }).catch(() => {});
        }
      });

      const permStatus = await PushNotifications.checkPermissions().catch(() => ({
        receive: "denied" as const,
      }));
      if (permStatus.receive === "granted") {
        await PushNotifications.register().catch((err) => {
          console.warn("[Push] Background register deferred:", err);
        });
      }
    } catch (err) {
      console.warn("[Push] Background setup skipped:", err);
    }
  }, 2000);
}

// ── Mount React ───────────────────────────────────────────────────────────────
const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found");

const preloader = document.getElementById("app-preloader");
if (preloader) preloader.remove();

// No StrictMode: prevents React from running effects twice on Android,
// which would create duplicate Supabase auth listeners and router state thrash.
createRoot(rootEl).render(<RouterProvider router={router} />);

// Init native features immediately after React mounts
initNative().catch(console.error);
