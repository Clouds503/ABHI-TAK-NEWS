import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Complete your profile — Abhi Tak" },
      { name: "description", content: "Tell us your name, mobile number and town to personalise Abhi Tak news." },
      { property: "og:title", content: "Complete your profile — Abhi Tak" },
      { property: "og:description", content: "Personalise your Abhi Tak experience." },
    ],
  }),
  component: Onboarding,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  email: z.string().trim().email("Invalid email").max(255),
  town_id: z.string().uuid("Please select your town"),
  preferred_language: z.enum(["hi", "en"]),
});

function Onboarding() {
  const { user, profile, needsOnboarding, refreshProfile, loading } = useAuth();
  const { t, lang, pick } = useI18n();
  const navigate = useNavigate();
  const [towns, setTowns] = useState<{ id: string; name_hi: string; name_en: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", town_id: "", preferred_language: (lang ?? "hi") as "hi" | "en" });

  useEffect(() => {
    supabase.from("towns").select("id, name_hi, name_en").eq("is_active", true).order("sort_order").then(({ data }) => setTowns(data ?? []));
  }, []);
  useEffect(() => {
    if (profile || user) setForm((f) => ({
      ...f,
      full_name: f.full_name || profile?.full_name || "",
      phone: f.phone || profile?.phone || "",
      email: f.email || profile?.email || user?.email || "",
      town_id: f.town_id || profile?.town_id || "",
    }));
  }, [profile, user]);
  useEffect(() => { if (!loading && user && !needsOnboarding) navigate({ to: "/", replace: true }); }, [loading, user, needsOnboarding, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const p = schema.safeParse(form);
    if (!p.success) { toast.error(p.error.issues[0]?.message); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...p.data, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("स्वागत है! Welcome to Abhi Tak");
    await refreshProfile();
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 pb-10 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div className="flex flex-col items-center text-center">
        <Logo className="h-16 w-16" />
        <h1 className="mt-4 text-2xl font-bold">{lang === "en" ? "Tell us about yourself" : "अपने बारे में बताएं"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lang === "en" ? "Just a few details to get started" : "शुरू करने के लिए कुछ जानकारी"}</p>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div><Label htmlFor="n">{t("name")}</Label><Input id="n" className="mt-1.5 h-12" value={form.full_name} onChange={set("full_name")} autoComplete="name" /></div>
        <div><Label htmlFor="ph">{t("mobile")}</Label><Input id="ph" type="tel" inputMode="tel" placeholder="98XXXXXXXX" className="mt-1.5 h-12" value={form.phone} onChange={set("phone")} autoComplete="tel" /></div>
        <div><Label htmlFor="em">Email</Label><Input id="em" type="email" className="mt-1.5 h-12" value={form.email} onChange={set("email")} autoComplete="email" /></div>
        <div>
          <Label htmlFor="tw">{t("town")}</Label>
          <select id="tw" value={form.town_id} onChange={set("town_id")} className="mt-1.5 h-12 w-full rounded-md border border-input bg-background px-3 text-[15px]">
            <option value="">{lang === "en" ? "Select your town" : "अपना कस्बा चुनें"}</option>
            {towns.map((tw) => <option key={tw.id} value={tw.id}>{pick(tw.name_hi, tw.name_en)}</option>)}
          </select>
        </div>
        <div>
          <Label>{t("language")}</Label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(["hi", "en"] as const).map((l) => (
              <button type="button" key={l} onClick={() => setForm({ ...form, preferred_language: l })}
                className={`h-11 rounded-md border text-sm font-medium ${form.preferred_language === l ? "border-primary bg-primary/10 text-primary" : "border-input"}`}>
                {l === "hi" ? "हिन्दी" : "English"}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={busy} className="h-12 w-full text-[16px] font-semibold">{lang === "en" ? "Continue" : "आगे बढ़ें"}</Button>
      </form>
    </div>
  );
}
