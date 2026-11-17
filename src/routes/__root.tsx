import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppShell, Logo } from "@/components/AppShell";
import { LanguageGate } from "@/components/LanguageGate";
import { Toaster } from "@/components/ui/sonner";
import { AndroidBackButtonHandler } from "@/components/AndroidBackButtonHandler";
import { useSiteSettings } from "@/lib/site-settings";

function SiteBrandingSync() {
  const { settings } = useSiteSettings();

  useEffect(() => {
    if (typeof document === "undefined" || !settings) return;

    if (settings.icon_url) {
      const iconUrl = settings.icon_url;
      let iconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!iconLink) {
        iconLink = document.createElement("link");
        iconLink.rel = "icon";
        document.head.appendChild(iconLink);
      }
      if (iconLink.href !== iconUrl) {
        iconLink.href = iconUrl;
      }

      let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement("link");
        appleLink.rel = "apple-touch-icon";
        document.head.appendChild(appleLink);
      }
      if (appleLink.href !== iconUrl) {
        appleLink.href = iconUrl;
      }
    }
  }, [settings?.icon_url]);

  return null;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          पेज नहीं मिला · Page not found
        </h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#D40000" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Abhitak" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "Abhitak — सच, समय पर, सबसे पहले" },
      {
        name: "description",
        content:
          "Abhitak: local news, live TV, video and Jan Ki Awaaz for Uttar Pradesh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://i.ytimg.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://i.ytimg.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@600;700;800&display=swap",
      },
    ],
    scripts: [
      {
        children: `try{if(localStorage.getItem('abhitak.theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="hi">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, needsOnboarding } = useAuth();
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const onOnboarding = path.startsWith("/onboarding");

  useEffect(() => {
    if (loading) return;
    if (user && needsOnboarding && !onOnboarding) {
      router.navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, user, needsOnboarding, onOnboarding, router]);

  const blocked = !loading && user && needsOnboarding && !onOnboarding;
  if (blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Logo className="h-20 w-20 animate-pulse" />
      </div>
    );
  }
  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const bare =
    path.startsWith("/admin") || path.startsWith("/auth") || path.startsWith("/onboarding");
  return (
    <QueryClientProvider client={queryClient}>
      <SiteBrandingSync />
      <LanguageProvider>
        <AuthProvider>
          <AuthGate>
            {bare ? (
              <Outlet />
            ) : (
              <LanguageGate>
                <AppShell>
                  <Outlet />
                </AppShell>
              </LanguageGate>
            )}
          </AuthGate>
          <AndroidBackButtonHandler />
          <Toaster position="top-center" />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
