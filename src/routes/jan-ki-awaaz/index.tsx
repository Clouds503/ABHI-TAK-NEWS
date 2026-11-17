import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Megaphone, MapPin, LogIn } from "lucide-react";
import { jkaPublicQuery, townsQuery } from "@/lib/queries";
import { useI18n, timeAgo, JKA_CATEGORIES } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { img } from "@/lib/media";
import { Empty, StatusPill } from "@/components/news";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/jan-ki-awaaz/")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.pathname },
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Jan Ki Awaaz — आपकी समस्या, आपकी आवाज़ | Abhi Tak" },
      {
        name: "description",
        content:
          "Citizens of District Bijnor report local problems — roads, water, electricity, sanitation — and track their resolution.",
      },
      { property: "og:title", content: "Jan Ki Awaaz — Abhi Tak" },
      {
        property: "og:description",
        content: "Report and track public-welfare issues across District Bijnor.",
      },
    ],
  }),
  component: JkaHome,
});

function JkaHome() {
  const { t, pick, lang, jkaCat } = useI18n();
  const { user, loading } = useAuth();
  const [town, setTown] = useState<string | undefined>();
  const [cat, setCat] = useState<string | undefined>();
  const { data: towns } = useQuery(townsQuery);
  const { data, isLoading } = useQuery({
    ...jkaPublicQuery({ town, category: cat }),
    enabled: !!user,
  });
  const featured = data?.filter((p) => p.is_featured) ?? [];
  const townName = (id: string | null) => {
    const tw = towns?.find((x) => x.id === id);
    return tw ? pick(tw.name_hi, tw.name_en) : "";
  };
  const chip = (on: boolean) =>
    cn(
      "h-9 shrink-0 rounded-full border px-3 text-[13px] font-medium transition-colors",
      on
        ? "border-primary bg-primary text-primary-foreground"
        : "border-input bg-card text-foreground",
    );

  if (!loading && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <Megaphone className="h-16 w-16 text-primary/40" />
        <h2 className="mt-4 text-2xl font-bold">
          {lang === "en" ? "Sign In to Access Jan Ki Awaaz" : "जन की आवाज़ के लिए साइन इन करें"}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {lang === "en"
            ? "Sign in or create an account to view citizen reports, track local issues, and raise your voice."
            : "नागरिकों की समस्याएं देखने, क्षेत्र के मुद्दे ट्रैक करने और अपनी आवाज़ उठाने के लिए साइन इन करें।"}
        </p>
        <Button asChild size="lg" className="mt-6 font-semibold">
          <Link to="/auth" search={{ redirect: "/jan-ki-awaaz" }}>
            <LogIn className="mr-2 h-4 w-4" />
            {lang === "en" ? "Sign In / Sign Up" : "साइन इन / साइन अप करें"}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* MOBILE VIEW (< 1024px) - 100% UNCHANGED */}
      <div className="lg:hidden">
        <section className="relative overflow-hidden bg-deep px-4 pb-7 pt-8 text-primary-foreground">
          <Megaphone className="absolute -right-6 -top-4 h-40 w-40 rotate-[-12deg] opacity-10" />
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-80">
            Abhi Tak
          </div>
          <h1 className="mt-1 text-4xl font-extrabold">{t("jka")}</h1>
          <p className="mt-2 font-serif text-xl opacity-90">“{t("jkaTagline")}”</p>
          <Button
            asChild
            size="lg"
            className="mt-6 h-12 w-full rounded-2xl bg-info text-[16px] font-bold text-info-foreground shadow-lg hover:bg-info/90"
          >
            <Link to="/report">
              <Megaphone className="h-5 w-5" /> {t("reportIssue")}
            </Link>
          </Button>
        </section>

        <div className="sticky top-[3.5rem] z-30 mt-3 space-y-2 border-y bg-background py-3">
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
            <button onClick={() => setCat(undefined)} className={chip(!cat)}>
              {t("all")}
            </button>
            {JKA_CATEGORIES.map((c) => (
              <button key={c.slug} onClick={() => setCat(c.slug)} className={chip(cat === c.slug)}>
                {lang === "en" ? c.en : c.hi}
              </button>
            ))}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
            <button onClick={() => setTown(undefined)} className={chip(!town)}>
              <MapPin className="mr-1 inline h-3.5 w-3.5" />
              {t("all")}
            </button>
            {towns?.map((tw) => (
              <button key={tw.id} onClick={() => setTown(tw.id)} className={chip(town === tw.id)}>
                {pick(tw.name_hi, tw.name_en)}
              </button>
            ))}
          </div>
        </div>

        {!town && !cat && featured[0] && (
          <Link to="/jan-ki-awaaz/$id" params={{ id: featured[0].id! }} className="block border-b">
            {featured[0].photo_url && (
              <img
                src={img(featured[0].photo_url)}
                alt=""
                width={640}
                height={360}
                decoding="async"
                className="aspect-[16/9] w-full object-cover"
              />
            )}
            <div className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  {t("featured")}
                </span>
                <StatusPill status={featured[0].status!} />
              </div>
              <h2 className="mt-2 text-2xl font-bold leading-snug">{featured[0].title}</h2>
              <p className="mt-2 line-clamp-2 text-muted-foreground">{featured[0].description}</p>
            </div>
          </Link>
        )}

        {!isLoading && !data?.length && <Empty text={t("noContent")} />}
        <ol>
          {data?.map((p) => (
            <li key={p.id} className="border-b">
              <Link
                to="/jan-ki-awaaz/$id"
                params={{ id: p.id! }}
                className="block px-4 py-4 active:bg-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-primary">
                    {jkaCat(p.category!)}
                  </span>
                  <StatusPill status={p.status!} />
                </div>
                <h3 className="mt-1.5 text-[17px] font-bold leading-snug">{p.title}</h3>
                <div suppressHydrationWarning className="mt-2 text-[12px] text-muted-foreground">
                  {[p.area, townName(p.town_id)].filter(Boolean).join(", ")} ·{" "}
                  {p.reporter_name ?? t("anonymous")} · {timeAgo(p.created_at, lang)}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {/* DESKTOP VIEW (>= 1024px) - BROADSHEET CIVIC PORTAL */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-8">
        {/* Civic Grand Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-deep px-8 py-10 text-primary-foreground shadow-xl">
          <Megaphone className="absolute -right-8 -top-8 h-64 w-64 rotate-[-12deg] opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] opacity-80">
                <span className="inline-block h-2 w-2 rounded-full bg-info" />
                Abhi Tak Civic Desk · जन की आवाज़
              </div>
              <h1 className="mt-2 font-serif text-4xl font-extrabold tracking-tight">{t("jka")}</h1>
              <p className="mt-2 font-serif text-xl italic opacity-95 text-amber-200">
                “{t("jkaTagline")}”
              </p>
              <p className="mt-3 text-sm text-primary-foreground/80 leading-relaxed max-w-xl">
                {lang === "hi"
                  ? "बिजनौर ज़िले की सड़कें, बिजली, पानी, स्वास्थ्य और सफ़ाई से जुड़े जन-मुद्दों को सीधे प्रशासन और जनप्रतिनिधियों तक पहुँचाने का सशक्त मंच।"
                  : "A dedicated civic platform connecting District Bijnor citizens directly with local administration to solve public-welfare problems."}
              </p>
            </div>
            <div className="shrink-0">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-xl bg-info px-8 text-base font-bold text-info-foreground shadow-2xl hover:bg-info/90 transition-transform hover:scale-105"
              >
                <Link to="/report">
                  <Megaphone className="mr-2 h-5 w-5" /> {t("reportIssue")}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Desktop Filter Toolbar */}
        <div className="mt-8 rounded-xl border bg-card p-4 shadow-sm space-y-4">
          {/* Category Pills */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">
              {lang === "hi" ? "विषय श्रेणी:" : "Category:"}
            </span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCat(undefined)} className={chip(!cat)}>
                {t("all")}
              </button>
              {JKA_CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => setCat(c.slug)}
                  className={chip(cat === c.slug)}
                >
                  {lang === "en" ? c.en : c.hi}
                </button>
              ))}
            </div>
          </div>

          {/* Town Pills */}
          <div className="flex items-center gap-2 border-t pt-3">
            <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">
              {lang === "hi" ? "तहसील / कस्बा:" : "Town / Tehsil:"}
            </span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setTown(undefined)} className={chip(!town)}>
                <MapPin className="mr-1 inline h-3.5 w-3.5" />
                {t("all")}
              </button>
              {towns?.map((tw) => (
                <button key={tw.id} onClick={() => setTown(tw.id)} className={chip(town === tw.id)}>
                  {pick(tw.name_hi, tw.name_en)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Spotlight Card */}
        {!town && !cat && featured[0] && (
          <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="grid grid-cols-12 gap-8 items-center">
              {featured[0].photo_url ? (
                <div className="col-span-5 overflow-hidden rounded-xl">
                  <img
                    src={img(featured[0].photo_url)}
                    alt=""
                    width={640}
                    height={360}
                    decoding="async"
                    className="aspect-video w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ) : null}
              <div className={cn(featured[0].photo_url ? "col-span-7" : "col-span-12")}>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    {t("featured")}
                  </span>
                  <StatusPill status={featured[0].status!} />
                  <span className="text-xs text-muted-foreground">
                    {[featured[0].area, townName(featured[0].town_id)].filter(Boolean).join(", ")}
                  </span>
                </div>
                <h2 className="mt-3 font-serif text-2xl font-bold leading-snug">
                  <Link
                    to="/jan-ki-awaaz/$id"
                    params={{ id: featured[0].id! }}
                    className="hover:text-primary transition-colors"
                  >
                    {featured[0].title}
                  </Link>
                </h2>
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground leading-relaxed">
                  {featured[0].description}
                </p>
                <div className="mt-5 flex items-center justify-between border-t pt-4">
                  <span suppressHydrationWarning className="text-xs text-muted-foreground">
                    {featured[0].reporter_name ?? t("anonymous")} ·{" "}
                    {timeAgo(featured[0].created_at, lang)}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/jan-ki-awaaz/$id" params={{ id: featured[0].id! }}>
                      {lang === "hi" ? "पूरी रिपोर्ट देखें →" : "View Full Report →"}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !data?.length && (
          <div className="mt-8 rounded-2xl border bg-card p-12 text-center">
            <Empty text={t("noContent")} />
          </div>
        )}

        {/* 3-Column Issues Grid */}
        <div className="mt-8 grid grid-cols-3 gap-6">
          {data?.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col justify-between overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md transition-all hover:border-primary/40"
            >
              <div>
                {p.photo_url && (
                  <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                    <img
                      src={img(p.photo_url)}
                      alt=""
                      width={480}
                      height={300}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {jkaCat(p.category!)}
                    </span>
                    <StatusPill status={p.status!} />
                  </div>
                  <h3 className="mt-2.5 font-serif text-lg font-bold leading-snug line-clamp-2">
                    <Link
                      to="/jan-ki-awaaz/$id"
                      params={{ id: p.id! }}
                      className="hover:text-primary transition-colors"
                    >
                      {p.title}
                    </Link>
                  </h3>
                  {p.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t bg-muted/20 px-5 py-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium truncate max-w-[60%]">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    {[p.area, townName(p.town_id)].filter(Boolean).join(", ") || "बिजनौर"}
                  </span>
                  <span suppressHydrationWarning className="shrink-0">
                    {timeAgo(p.created_at, lang)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
