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
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

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

  // 3. Deep link and OAuth callback handling (returns Google Sign-In directly to app)
  const handleDeepLink = async (rawUrl: string) => {
    console.log("[DeepLink] Processing URL:", rawUrl);
    try {
      // Close in-app browser tab immediately if active
      await Browser.close().catch(() => {});

      // Helper to route to the appropriate post-login screen
      const navigatePostLogin = async () => {
        try {
          const { data } = await supabase.auth.getUser();
          const user = data?.user;
          const savedTarget =
            sessionStorage.getItem("abhitak.post_onboarding_redirect") ||
            sessionStorage.getItem("abhitak.redirect") ||
            localStorage.getItem("abhitak.redirect");

          sessionStorage.removeItem("abhitak.post_onboarding_redirect");
          sessionStorage.removeItem("abhitak.redirect");
          localStorage.removeItem("abhitak.redirect");

          if (user) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name, phone")
              .eq("id", user.id)
              .maybeSingle();

            if (!prof || !prof.full_name || !prof.phone) {
              await router.navigate({ to: "/onboarding", replace: true }).catch(() => {});
              return;
            }
          }

          const destination =
            savedTarget && savedTarget.startsWith("/") && !savedTarget.startsWith("//")
              ? savedTarget
              : "/";
          await router.navigate({ to: destination as "/", replace: true }).catch(() => {});
        } catch (e) {
          console.warn("[DeepLink] Navigation error:", e);
          await router.navigate({ to: "/", replace: true }).catch(() => {});
        }
      };

      // 1. Check for OAuth errors in callback
      if (rawUrl.includes("error=") || rawUrl.includes("error_description=")) {
        console.warn("[DeepLink] OAuth returned an error parameter");
        await router.navigate({ to: "/auth" }).catch(() => {});
        return;
      }

      // 2. Extract OAuth access_token and refresh_token from hash (implicit flow)
      if (rawUrl.includes("access_token")) {
        const hashPart = rawUrl.split("#")[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (!error) {
              await navigatePostLogin();
              return;
            } else {
              console.error("[DeepLink] setSession error:", error);
            }
          }
        }
      }

      // 3. Extract OAuth code from query parameters (PKCE flow)
      if (rawUrl.includes("code=")) {
        const queryPart = rawUrl.split("?")[1]?.split("#")[0];
        if (queryPart) {
          const params = new URLSearchParams(queryPart);
          const code = params.get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
              await navigatePostLogin();
              return;
            } else {
              console.error("[DeepLink] exchangeCodeForSession error:", error);
            }
          }
        }
      }

      // 4. Route regular internal deep link paths
      try {
        const parsed = new URL(rawUrl);
        const pathname = parsed.pathname;
        if (pathname && pathname.startsWith("/") && pathname !== "/") {
          await router.navigate({ to: pathname as "/" }).catch(() => {});
          return;
        }
      } catch {
        if (rawUrl.startsWith("com.abhitak.news://")) {
          const routePath = rawUrl.replace("com.abhitak.news://", "/").split("?")[0].split("#")[0];
          if (routePath && routePath.startsWith("/") && routePath !== "/") {
            await router.navigate({ to: routePath as "/" }).catch(() => {});
            return;
          }
        }
      }
    } catch (err) {
      console.warn("[DeepLink] Error handling URL:", err);
    }
  };

  // Listen for deep link events while the app is active
  App.addListener("appUrlOpen", async (event) => {
    if (event?.url) {
      await handleDeepLink(event.url);
    }
  });

  // Also check if app was opened/cold-started via a deep link URL
  try {
    const launchUrl = await App.getLaunchUrl();
    if (launchUrl?.url) {
      await handleDeepLink(launchUrl.url);
    }
  } catch (e) {
    console.warn("[DeepLink] getLaunchUrl check skipped:", e);
  }

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
