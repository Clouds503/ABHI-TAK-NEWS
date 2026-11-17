import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const search = z.object({ redirect: z.string().optional() });

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
  const { redirect } = Route.useSearch();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: safePath(redirect), replace: true });
  }, [user, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = creds.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message);
      return;
    }
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: window.location.origin + safePath(redirect),
          data: { full_name: parsed.data.name },
        },
      });
      if (error) toast.error(error.message);
      else toast.success("प्रोफ़ाइल बन गई! Welcome to Abhitak.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) toast.error(error.message);
    }
    setBusy(false);
  };

  const google = async () => {
    if (redirect) sessionStorage.setItem("abhitak.redirect", safePath(redirect));
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  };
  useEffect(() => {
    if (user) {
      const saved = sessionStorage.getItem("abhitak.redirect");
      if (saved) {
        sessionStorage.removeItem("abhitak.redirect");
        navigate({ to: saved, replace: true });
      }
    }
  }, [user, navigate]);

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
      <Button variant="outline" onClick={google} className="mt-8 h-12 text-[15px]">
        Continue with Google
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
