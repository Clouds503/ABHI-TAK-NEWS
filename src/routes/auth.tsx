import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { autoConfirmUserFn } from "@/lib/auth.functions";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const search = z
  .object({
    redirect: z.string().optional(),
    code: z.string().optional(),
    error: z.string().optional(),
    error_code: z.string().optional(),
    error_description: z.string().optional(),
  })
  .passthrough();

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in — Abhitak" },
      {
        name: "description",
        content: "Create your Abhitak profile to raise your voice through Jan Ki Awaaz.",
      },
      { property: "og:title", content: "Sign in — Abhitak" },
      { property: "og:description", content: "Create your Abhitak profile." },
    ],
  }),
  component: AuthPage,
});

const creds = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  name: z.string().trim().max(100).optional(),
});

function safePath(p?: string) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/";
}

function AuthPage() {
  const searchParams = Route.useSearch();
  const redirect = searchParams.redirect;
  const { t } = useI18n();
  const { user, needsOnboarding, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    // Notify user if OAuth returned with an error parameter
    const err = searchParams.error || searchParams.error_description;
    if (err) {
      if (err.toLowerCase().includes("access_denied")) {
        toast.info("Google sign-in was canceled");
      } else {
        toast.error(searchParams.error_description || "Google sign-in failed. Please try again.");
      }
    }
  }, [searchParams.error, searchParams.error_description]);

  useEffect(() => {
    if (!loading && user) {
      if (needsOnboarding) {
        navigate({ to: "/onboarding", replace: true });
      } else {
        const saved =
          sessionStorage.getItem("abhitak.post_onboarding_redirect") ||
          sessionStorage.getItem("abhitak.redirect");
        if (saved) {
          sessionStorage.removeItem("abhitak.post_onboarding_redirect");
          sessionStorage.removeItem("abhitak.redirect");
          navigate({ to: saved, replace: true });
        } else {
          navigate({ to: safePath(redirect), replace: true });
        }
      }
    }
  }, [user, needsOnboarding, loading, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = creds.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message);
      return;
    }
    setBusy(true);

    try {
      if (mode === "up") {
        if (redirect) {
          sessionStorage.setItem("abhitak.post_onboarding_redirect", safePath(redirect));
        }

        // 1. Sign up the user
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: { full_name: parsed.data.name },
          },
        });

        if (error) {
          toast.error(error.message);
          setBusy(false);
          return;
        }

        // 2. Ensure user is immediately logged in
        if (data.session) {
          await supabase.auth.setSession(data.session);
        } else {
          // If session was not immediately returned, sign in directly with password
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });

          if (signInErr) {
            // If Supabase requires email confirmation, auto-confirm on server and retry
            if (signInErr.message.toLowerCase().includes("email not confirmed")) {
              try {
                const res = await autoConfirmUserFn({
                  data: { email: parsed.data.email, userId: data.user?.id },
                });
                if (res?.confirmed) {
                  const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({
                    email: parsed.data.email,
                    password: parsed.data.password,
                  });
                  if (retryErr) {
                    toast.error(retryErr.message);
                    setBusy(false);
                    return;
                  }
                  if (retryData?.session) {
                    await supabase.auth.setSession(retryData.session);
                  }
                }
              } catch (confirmErr) {
                console.warn("Auto-confirm fallback warning:", confirmErr);
              }
            } else {
              toast.error(signInErr.message);
              setBusy(false);
              return;
            }
          } else if (signInData?.session) {
            await supabase.auth.setSession(signInData.session);
          }
        }

        toast.success("Welcome! Let's complete your profile.");
        // Smoothly transition once user session is registered
        setTimeout(async () => {
          const { data: currentSess } = await supabase.auth.getSession();
          if (currentSess.session?.user) {
            navigate({ to: "/onboarding", replace: true });
          }
        }, 150);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Welcome back!");
          // Navigation handled by useEffect depending on needsOnboarding
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    try {
      setGoogleBusy(true);
      if (redirect) {
        sessionStorage.setItem("abhitak.redirect", safePath(redirect));
        sessionStorage.setItem("abhitak.post_onboarding_redirect", safePath(redirect));
      }

      // 1. If running inside Lovable editor iframe, attempt lovable cloud auth broker
      let isInIframe = false;
      try {
        isInIframe = window.self !== window.top;
      } catch {
        isInIframe = true;
      }

      if (isInIframe) {
        try {
          const r = await lovable.auth.signInWithOAuth("google", {
            redirect_uri: window.location.origin + "/auth",
          });
          if (r?.tokens) {
            setGoogleBusy(false);
            return;
          }
          if (r?.error) {
            console.warn("Lovable cloud OAuth notice:", r.error);
          }
        } catch (e) {
          console.warn("Lovable auth unavailable inside iframe, using Supabase direct:", e);
        }
      }

      // 2. Direct Supabase Google OAuth (adapted for both Web and Mobile Capacitor)
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative
        ? "com.abhitak.news://auth"
        : `${window.location.origin}/auth`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: isNative,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        if (
          error.message.includes("provider is not enabled") ||
          error.message.includes("Unsupported provider")
        ) {
          toast.error(
            "Google sign-in is not enabled yet in your Supabase project. Please enable Google provider in Supabase Dashboard (Authentication > Providers > Google).",
            { duration: 7000 }
          );
        } else {
          toast.error(error.message);
        }
        setGoogleBusy(false);
      } else if (data?.url) {
        if (isNative) {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: data.url, windowName: "_self" });
        } else {
          window.location.assign(data.url);
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to initiate Google sign-in");
      setGoogleBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 pb-10 pt-[max(env(safe-area-inset-top),1rem)]">
      <Link to="/" className="-ml-2 grid h-11 w-11 place-items-center" aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="mt-4 flex flex-col items-center text-center">
        <Logo className="h-20 w-20" />
        <h1 className="mt-5 text-2xl font-bold leading-snug">{t("createProfile")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("jkaTagline")}</p>
      </div>
      <Button
        variant="outline"
        type="button"
        onClick={google}
        disabled={googleBusy || busy}
        className="mt-8 h-12 w-full text-[15px] font-medium flex items-center justify-center gap-3 relative shadow-xs hover:bg-muted/60 transition-colors"
      >
        {googleBusy ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span>Connecting to Google...</span>
          </>
        ) : (
          <>
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </Button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === "up" && (
          <div>
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              className="mt-1.5 h-12"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            className="mt-1.5 h-12"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="pw">Password</Label>
          <Input
            id="pw"
            type="password"
            className="mt-1.5 h-12"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete={mode === "up" ? "new-password" : "current-password"}
          />
        </div>
        <Button type="submit" disabled={busy} className="h-12 w-full text-[16px] font-semibold">
          {mode === "up" ? "Create profile" : t("signIn")}
        </Button>
      </form>
      <button
        onClick={() => setMode(mode === "up" ? "in" : "up")}
        className="mt-5 text-center text-sm text-primary"
      >
        {mode === "up" ? "Already have an account? Sign in" : "New here? Create a profile"}
      </button>
    </div>
  );
}
