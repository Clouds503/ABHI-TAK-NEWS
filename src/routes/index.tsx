import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Megaphone, Play, ArrowRight, Radio, Newspaper, MapPin } from "lucide-react";
import {
  articlesQuery,
  townsQuery,
  videosQuery,
  jkaPublicQuery,
  categoriesQuery,
  adsQuery,
  type ArticleCard,
} from "@/lib/queries";
import { useI18n, timeAgo } from "@/lib/i18n";
import { img, homeBanner } from "@/lib/media";
import { SectionHead } from "@/components/AppShell";
import {
  AdSlot,
  ArticleRow,
  FeatureCard,
  HeroStory,
  TopHomeBanner,
  StatusPill,
  Ticker,
  Empty,
} from "@/components/news";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  FilterDrawer,
  ActiveFilterChips,
  type FilterState,
  getActiveFilterCount,
} from "@/components/FilterDrawer";
import { cn } from "@/lib/utils";
import { useRealtimeVideos } from "@/lib/useRealtimeVideos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abhi Tak — बिजनौर की हर ख़बर, अभी तक" },
      {
        name: "description",
        content:
          "Breaking news, live TV, videos and citizen reports from every town of District Bijnor — Nagina, Dhampur, Najibabad, Chandpur and more.",
      },
      { property: "og:title", content: "Abhi Tak — District Bijnor News" },
      {
        property: "og:description",
        content: "Local news network for District Bijnor with Jan Ki Awaaz citizen reporting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function DesktopArticleCard({ a }: { a: ArticleCard }) {
  const { pick, lang } = useI18n();
  return (
    <Link
      to="/news/$slug"
      params={{ slug: a.slug }}
      className="group flex flex-col rounded-xl border bg-card overflow-hidden shadow-xs hover:shadow-md hover:border-primary/50 transition-all"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <img
          src={img(a.cover_url) ?? "/pwa-512.png"}
          alt=""
          width={480}
          height={270}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.src = "/pwa-512.png";
            event.currentTarget.classList.add("object-contain");
          }}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {a.is_breaking && (
          <span className="absolute top-2 left-2 rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            Breaking
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {a.category && (
            <span className="font-bold text-primary uppercase tracking-wider">
              {pick(a.category.name_hi, a.category.name_en)}
            </span>
          )}
          {a.town && <span>· {pick(a.town.name_hi, a.town.name_en)}</span>}
          <span suppressHydrationWarning>· {timeAgo(a.published_at, lang)}</span>
        </div>
        <h3 className="mt-2 font-serif text-base font-bold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {pick(a.title_hi, a.title_en)}
        </h3>
        {pick(a.summary_hi, a.summary_en) && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {pick(a.summary_hi, a.summary_en)}
          </p>
        )}
      </div>
    </Link>
  );
}

function Home() {
  const { t, pick, lang } = useI18n();
  useRealtimeVideos();

  const [filters, setFilters] = useState<FilterState>({ datePreset: "all" });
  const activeCount = getActiveFilterCount(filters);
  const isFiltered = activeCount > 0;

  // Base queries
  const { data: standardArticles, isLoading: standardLoading } = useQuery({
    ...articlesQuery({ limit: 20 }),
    enabled: !isFiltered,
  });

  // Filtered queries (only run when filters active)
  const { data: filteredArticles, isLoading: filteredLoading } = useQuery({
    ...articlesQuery({
      category: filters.category,
      town: filters.town,
      village: filters.village,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      limit: 25,
    }),
    enabled: isFiltered,
  });

  const { data: categories } = useQuery(categoriesQuery);
  const { data: towns } = useQuery(townsQuery);
  const { data: videos } = useQuery(videosQuery);
  const { data: issues } = useQuery(jkaPublicQuery({ limit: 6 }));
  const { data: topBanners } = useQuery(adsQuery("home_top"));
  const topBanner = topBanners?.[0];

  const articles = isFiltered ? filteredArticles : standardArticles;
  const isLoading = isFiltered ? filteredLoading : standardLoading;

  const breaking = standardArticles?.filter((a) => a.is_breaking) ?? [];
  const hero = standardArticles?.find((a) => a.is_featured) ?? standardArticles?.[0];
  const rest = standardArticles?.filter((a) => a.id !== hero?.id) ?? [];
  const featured = rest.filter((a) => a.is_featured);

  const counts = new Map<string, number>();
  standardArticles?.forEach(
    (a) => a.town && counts.set(a.town.slug, (counts.get(a.town.slug) ?? 0) + 1),
  );

  return (
    <div className="pb-12">
      <Ticker items={breaking} />

      {/* Main Container - constrained to max-w-7xl on desktop */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* Sticky Category Pill Bar (mobile only) */}
        <div className="sticky top-[max(3.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-30 flex items-center gap-2 border-b bg-background/95 px-2 py-2.5 backdrop-blur-md lg:hidden">
          <FilterDrawer filters={filters} onFiltersChange={setFilters} />

          <div className="no-scrollbar flex flex-1 snap-x gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() =>
                setFilters({
                  town: undefined,
                  village: undefined,
                  category: undefined,
                  datePreset: "all",
                  fromDate: undefined,
                  toDate: undefined,
                })
              }
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                !filters.category &&
                  !filters.town &&
                  !filters.village &&
                  (!filters.datePreset || filters.datePreset === "all")
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-foreground hover:bg-muted/80",
              )}
            >
              {lang === "en" ? "All" : "सभी"}
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setFilters((p) => ({
                    ...p,
                    category: p.category === cat.slug ? undefined : cat.slug,
                  }))
                }
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  filters.category === cat.slug
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-foreground hover:bg-muted/80",
                )}
              >
                {pick(cat.name_hi, cat.name_en)}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filter Chips */}
        <ActiveFilterChips filters={filters} onFiltersChange={setFilters} />

        {/* ======================================================== */}
        {/* MOBILE VIEW (lg:hidden) - STRICT 100% MOBILE INVARIANCE  */}
        {/* ======================================================== */}
        <div className="lg:hidden">
          {isFiltered ? (
            <div className="mt-2">
              <SectionHead
                title={
                  filters.category
                    ? categories?.find((c) => c.slug === filters.category)
                      ? pick(
                          categories.find((c) => c.slug === filters.category)!.name_hi,
                          categories.find((c) => c.slug === filters.category)!.name_en,
                        )
                      : t("latest")
                    : t("latest")
                }
                to="/news"
                action={t("seeAll")}
              />
              {isLoading ? (
                <div className="space-y-4 px-4 py-6">
                  <Skeleton className="h-24 w-full rounded-md" />
                  <Skeleton className="h-24 w-full rounded-md" />
                  <Skeleton className="h-24 w-full rounded-md" />
                </div>
              ) : !articles?.length ? (
                <Empty text={t("noContent")} />
              ) : (
                <div className="divide-y border-t">
                  {articles.map((a, i) => (
                    <ArticleRow key={a.id} a={a} index={i} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {isLoading ? (
                <Skeleton className="aspect-[16/9] w-full rounded-none" />
              ) : (
                <TopHomeBanner banner={topBanner} fallbackImage={homeBanner} />
              )}

              {/* District Radar */}
              <SectionHead title={t("districtRadar")} />
              <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-4">
                {towns?.map((tw) => {
                  const n = counts.get(tw.slug) ?? 0;
                  return (
                    <Link
                      key={tw.id}
                      to="/town/$slug"
                      params={{ slug: tw.slug }}
                      className="relative flex h-[74px] w-[112px] shrink-0 snap-start flex-col justify-between rounded-sm border bg-card p-3 active:border-primary shadow-xs"
                    >
                      <span className="text-[15px] font-semibold leading-none">
                        {pick(tw.name_hi, tw.name_en)}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span
                          className={
                            n
                              ? "h-1.5 w-1.5 rounded-full bg-primary"
                              : "h-1.5 w-1.5 rounded-full bg-border"
                          }
                        />
                        {n} {t("stories")}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <SectionHead title={t("latest")} to="/news" action={t("seeAll")} />
              <div className="border-t">
                {rest.slice(0, 4).map((a, i) => (
                  <ArticleRow key={a.id} a={a} index={i} />
                ))}
              </div>

              <AdSlot placement="home_inline" />

              {/* Jan Ki Awaaz strip */}
              <section className="mt-2 bg-ink py-6 text-ink-foreground">
                <div className="flex items-start justify-between gap-4 px-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
                      <Megaphone className="h-4 w-4" /> {t("jka")}
                    </div>
                    <div className="mt-1 font-serif text-2xl font-bold">{t("jkaTagline")}</div>
                  </div>
                  <Button asChild className="shrink-0 rounded-xl text-sm font-semibold shadow-lg">
                    <Link to="/report">{t("reportIssue")}</Link>
                  </Button>
                </div>
                <div className="no-scrollbar mt-5 flex snap-x gap-3 overflow-x-auto px-4">
                  {issues?.slice(0, 6).map((p) => (
                    <Link
                      key={p.id}
                      to="/jan-ki-awaaz/$id"
                      params={{ id: p.id! }}
                      className="w-[70%] shrink-0 snap-start border-l-2 border-primary bg-ink-foreground/5 p-3"
                    >
                      <StatusPill status={p.status!} />
                      <div className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug">
                        {p.title}
                      </div>
                      <div className="mt-2 text-[12px] text-ink-foreground/60">{p.area}</div>
                    </Link>
                  ))}
                </div>
              </section>

              {featured.length > 0 && (
                <>
                  <SectionHead title={t("featured")} />
                  <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto px-4">
                    {featured.map((a) => (
                      <FeatureCard key={a.id} a={a} />
                    ))}
                  </div>
                </>
              )}

              <SectionHead title={t("videoGalaxy")} to="/videos" action={t("seeAll")} />
              <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4">
                {videos?.map((v) => (
                  <Link key={v.id} to="/videos" className="w-[60%] shrink-0 snap-start">
                    <div className="relative aspect-video overflow-hidden rounded-md bg-ink">
                      <img
                        src={img(v.thumbnail_url)}
                        alt=""
                        width={320}
                        height={180}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        onError={(event) => {
                          event.currentTarget.src = "/pwa-192.png";
                          event.currentTarget.classList.add("object-contain");
                        }}
                        className="h-full w-full object-cover opacity-90"
                      />
                      <span className="absolute inset-0 grid place-items-center">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
                          <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                        </span>
                      </span>
                      {v.duration && (
                        <span className="absolute bottom-1.5 right-1.5 bg-ink/80 px-1.5 text-[11px] text-ink-foreground rounded">
                          {v.duration}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug">
                      {pick(v.title_hi, v.title_en)}
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-6 border-t">
                {rest.slice(4).map((a) => (
                  <ArticleRow key={a.id} a={a} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ======================================================== */}
        {/* DESKTOP VIEW (hidden lg:block) - EDITORIAL BROADSHEET     */}
        {/* ======================================================== */}
        <div className="hidden lg:block">
          {isFiltered ? (
            <div className="py-6">
              <div className="flex items-center justify-between pb-3 border-b mb-6">
                <h1 className="font-serif text-2xl font-bold">
                  {filters.category
                    ? categories?.find((c) => c.slug === filters.category)
                      ? pick(
                          categories.find((c) => c.slug === filters.category)!.name_hi,
                          categories.find((c) => c.slug === filters.category)!.name_en,
                        )
                      : t("latest")
                    : t("latest")}
                </h1>
                <Link to="/news" className="text-sm font-semibold text-primary hover:underline">
                  {t("seeAll")} →
                </Link>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-3 gap-6">
                  <Skeleton className="h-64 rounded-xl" />
                  <Skeleton className="h-64 rounded-xl" />
                  <Skeleton className="h-64 rounded-xl" />
                </div>
              ) : !articles?.length ? (
                <Empty text={t("noContent")} />
              ) : (
                <div className="grid grid-cols-3 gap-6">
                  {articles.map((a) => (
                    <DesktopArticleCard key={a.id} a={a} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 1. Above-The-Fold 3-Column Newspaper Broadsheet (12 cols) */}
              <div className="grid grid-cols-12 gap-8 py-8 border-b">
                {/* Left Column (3/12 cols): ताज़ा बुलेटिन (Top Briefs) */}
                <div className="col-span-3 space-y-4 border-r pr-6">
                  <div className="flex items-center justify-between pb-3 border-b border-primary/40">
                    <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
                      <span className="h-4 w-1.5 rounded-full bg-primary" />
                      {lang === "en" ? "Fast Bulletins" : "ताज़ा बुलेटिन"}
                    </h2>
                    <Link to="/news" className="text-xs font-semibold text-primary hover:underline">
                      {lang === "en" ? "More" : "अधिक"} →
                    </Link>
                  </div>

                  <div className="divide-y divide-border/60">
                    {isLoading ? (
                      <div className="space-y-4 py-2">
                        <Skeleton className="h-14 w-full rounded-md" />
                        <Skeleton className="h-14 w-full rounded-md" />
                        <Skeleton className="h-14 w-full rounded-md" />
                        <Skeleton className="h-14 w-full rounded-md" />
                      </div>
                    ) : (
                      rest.slice(0, 5).map((a) => (
                        <Link
                          key={a.id}
                          to="/news/$slug"
                          params={{ slug: a.slug }}
                          className="group block py-3.5 first:pt-1 last:pb-1"
                        >
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                            {a.town && (
                              <span className="font-semibold text-primary">
                                {pick(a.town.name_hi, a.town.name_en)}
                              </span>
                            )}
                            <span suppressHydrationWarning>· {timeAgo(a.published_at, lang)}</span>
                          </div>
                          <h3 className="text-sm font-bold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {pick(a.title_hi, a.title_en)}
                          </h3>
                        </Link>
                      ))
                    )}
                  </div>
                </div>

                {/* Center Column (6/12 cols): Lead Hero Story + Feature Duo */}
                <div className="col-span-6 px-2">
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="aspect-[16/9] w-full rounded-xl" />
                      <Skeleton className="h-9 w-4/5" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="grid grid-cols-2 gap-5 pt-6 mt-6 border-t">
                        <Skeleton className="aspect-[16/9] w-full rounded-lg" />
                        <Skeleton className="aspect-[16/9] w-full rounded-lg" />
                      </div>
                    </div>
                  ) : hero ? (
                    <Link to="/news/$slug" params={{ slug: hero.slug }} className="group block">
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted shadow-sm">
                        <img
                          src={img(hero.cover_url) ?? "/pwa-512.png"}
                          alt=""
                          width={800}
                          height={450}
                          fetchPriority="high"
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {hero.is_breaking && (
                          <span className="absolute top-3 left-3 rounded bg-primary px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md">
                            BREAKING
                          </span>
                        )}
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {hero.category && (
                            <span className="font-bold text-primary uppercase tracking-wider">
                              {pick(hero.category.name_hi, hero.category.name_en)}
                            </span>
                          )}
                          {hero.town && <span>· {pick(hero.town.name_hi, hero.town.name_en)}</span>}
                          <span suppressHydrationWarning>· {timeAgo(hero.published_at, lang)}</span>
                        </div>
                        <h1 className="mt-2 font-serif text-3xl font-extrabold leading-tight text-foreground group-hover:text-primary transition-colors">
                          {pick(hero.title_hi, hero.title_en)}
                        </h1>
                        {pick(hero.summary_hi, hero.summary_en) && (
                          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                            {pick(hero.summary_hi, hero.summary_en)}
                          </p>
                        )}
                        {hero.author_name && (
                          <div className="mt-3 text-xs font-semibold text-foreground/80">
                            ब्यूरो रिपोर्ट: {hero.author_name}
                          </div>
                        )}
                      </div>
                    </Link>
                  ) : null}

                  {/* Feature Story Duo below Lead Story */}
                  {!isLoading && rest.length > 5 && (
                    <div className="grid grid-cols-2 gap-5 pt-6 mt-6 border-t">
                      {rest.slice(5, 7).map((a) => (
                        <Link
                          key={a.id}
                          to="/news/$slug"
                          params={{ slug: a.slug }}
                          className="group block"
                        >
                          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
                            <img
                              src={img(a.cover_url) ?? "/pwa-512.png"}
                              alt=""
                              width={360}
                              height={200}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="mt-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              {a.town && (
                                <span className="font-semibold text-primary">
                                  {pick(a.town.name_hi, a.town.name_en)}
                                </span>
                              )}
                              <span suppressHydrationWarning>
                                · {timeAgo(a.published_at, lang)}
                              </span>
                            </div>
                            <h3 className="mt-1 text-sm font-bold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                              {pick(a.title_hi, a.title_en)}
                            </h3>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column (3/12 cols): District Focus, Live TV Preview, E-Paper, Ads */}
                <div className="col-span-3 space-y-5 border-l pl-6">
                  {/* Live TV Preview Card */}
                  <div className="rounded-xl border bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                        </span>
                        {t("liveTv")}
                      </span>
                      <Link
                        to="/live"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {lang === "en" ? "Watch Live" : "लाइव देखें"} →
                      </Link>
                    </div>
                    <Link
                      to="/live"
                      className="group relative block aspect-video w-full rounded-lg overflow-hidden bg-ink shadow-inner"
                    >
                      <img
                        src="/pwa-512.png"
                        alt="Live TV"
                        className="h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-black/30">
                        <span className="h-11 w-11 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                        </span>
                      </span>
                    </Link>
                    <div className="mt-2.5 text-xs font-semibold text-foreground line-clamp-1">
                      {lang === "en"
                        ? "Live Telecast from District Bijnor"
                        : "जनपद बिजनौर से सीधा प्रसारण"}
                    </div>
                  </div>

                  {/* E-Paper Edition Card */}
                  <div className="rounded-xl border bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                        <Newspaper className="h-4 w-4" />
                        {t("epaper")}
                      </span>
                      <Link
                        to="/epaper"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {lang === "en" ? "Open" : "पढ़ें"} →
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {lang === "en"
                        ? "Read today's full digital newspaper edition for District Bijnor."
                        : "जनपद बिजनौर का आज का सम्पूर्ण डिजिटल ई-पेपर संस्करण देखें।"}
                    </p>
                  </div>

                  {/* Jan Ki Awaaz Quick Box */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                      <Megaphone className="h-4 w-4" />
                      {t("jka")}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      {lang === "en"
                        ? "Report civic issues (roads, water, electricity) to authorities."
                        : "सड़क, बिजली, पानी या प्रशासनिक समस्या सीधे दर्ज करें।"}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="mt-3 w-full rounded-full text-xs font-bold shadow-xs"
                    >
                      <Link to="/report">{t("reportIssue")}</Link>
                    </Button>
                  </div>

                  {/* Desktop Inline Ad */}
                  <AdSlot placement="home_inline" />
                </div>
              </div>

              {/* 2. Desktop 7-Column District Radar Grid */}
              <div className="my-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="flex items-center gap-2 font-serif text-2xl font-bold text-foreground">
                    <span className="h-5 w-1.5 rounded-full bg-primary" />
                    {t("districtRadar")}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {lang === "en"
                      ? "All major towns of District Bijnor"
                      : "जनपद बिजनौर के सभी प्रमुख 7 कस्बों की ख़बरें"}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-3.5">
                  {towns?.slice(0, 7).map((tw) => {
                    const n = counts.get(tw.slug) ?? 0;
                    return (
                      <Link
                        key={tw.id}
                        to="/town/$slug"
                        params={{ slug: tw.slug }}
                        className="group flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs hover:border-primary hover:shadow-md transition-all"
                      >
                        <span className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {pick(tw.name_hi, tw.name_en)}
                        </span>
                        <span className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            className={cn("h-2 w-2 rounded-full", n ? "bg-primary" : "bg-border")}
                          />
                          <span>
                            {n} {t("stories")}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* 3. District Highlights 3-Column Magazine Grid */}
              {rest.length > 7 && (
                <div className="my-10">
                  <div className="flex items-end justify-between pb-3 border-b mb-6">
                    <h2 className="flex items-center gap-2 font-serif text-2xl font-bold text-foreground">
                      <span className="h-5 w-1.5 rounded-full bg-primary" />
                      {lang === "en" ? "District Highlights" : "जनपद की प्रमुख ख़बरें"}
                    </h2>
                    <Link to="/news" className="text-sm font-semibold text-primary hover:underline">
                      {t("seeAll")} →
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    {rest.slice(7, 13).map((a) => (
                      <DesktopArticleCard key={a.id} a={a} />
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Desktop Split Jan Ki Awaaz Civic Section */}
              <div className="my-12 rounded-2xl bg-ink text-ink-foreground p-8 shadow-xl relative overflow-hidden">
                <div className="grid grid-cols-12 gap-8 items-center">
                  <div className="col-span-4 space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                      <Megaphone className="h-4 w-4" />
                      <span>{t("jka")}</span>
                    </div>
                    <h2 className="font-serif text-3xl font-extrabold leading-tight text-white">
                      “{t("jkaTagline")}”
                    </h2>
                    <p className="text-sm text-ink-foreground/75 leading-relaxed">
                      {lang === "en"
                        ? "Abhi Tak's dedicated public grievance redressing platform. Raise civic problems in your town and track their journey to resolution with local authorities."
                        : "जनपद बिजनौर के नागरिकों का निष्पक्ष समस्या निवारण मंच। सड़क, जलभराव, बिजली व स्वास्थ्य संबंधी समस्याओं को सीधे अधिकारियों तक पहुँचाएँ।"}
                    </p>
                    <Button
                      asChild
                      size="lg"
                      className="rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                    >
                      <Link to="/report">
                        <Megaphone className="h-4 w-4 mr-1.5" />
                        {t("reportIssue")}
                      </Link>
                    </Button>
                  </div>

                  <div className="col-span-8">
                    <div className="grid grid-cols-3 gap-4">
                      {issues?.slice(0, 3).map((p) => (
                        <Link
                          key={p.id}
                          to="/jan-ki-awaaz/$id"
                          params={{ id: p.id! }}
                          className="group flex flex-col justify-between rounded-xl border border-ink-foreground/15 bg-ink-foreground/5 p-4 hover:border-primary transition-colors"
                        >
                          <div>
                            <StatusPill status={p.status!} />
                            <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-white group-hover:text-primary transition-colors">
                              {p.title}
                            </h3>
                          </div>
                          <div className="mt-4 text-xs text-ink-foreground/60">{p.area}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Desktop 4-Column Video Galaxy Grid */}
              <div className="my-12">
                <div className="flex items-center justify-between pb-3 border-b mb-6">
                  <h2 className="flex items-center gap-2 font-serif text-2xl font-bold text-foreground">
                    <span className="h-5 w-1.5 rounded-full bg-primary" />
                    {t("videoGalaxy")}
                  </h2>
                  <Link to="/videos" className="text-sm font-semibold text-primary hover:underline">
                    {t("seeAll")} →
                  </Link>
                </div>
                <div className="grid grid-cols-4 gap-6">
                  {videos?.slice(0, 8).map((v) => (
                    <Link
                      key={v.id}
                      to="/videos"
                      className="group flex flex-col rounded-xl overflow-hidden border bg-card shadow-xs hover:shadow-md hover:border-primary/50 transition-all"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-ink">
                        <img
                          src={img(v.thumbnail_url)}
                          alt=""
                          width={320}
                          height={180}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute inset-0 grid place-items-center bg-black/20">
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-md group-hover:scale-110 transition-transform">
                            <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                          </span>
                        </span>
                        {v.duration && (
                          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {v.duration}
                          </span>
                        )}
                      </div>
                      <div className="p-3.5">
                        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
                          {pick(v.title_hi, v.title_en)}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Full-width "View All News" button at bottom */}
        <div className="p-4 pt-8 max-w-md mx-auto">
          <Button
            asChild
            size="lg"
            className="h-12 w-full gap-2 text-base font-bold shadow-md bg-primary hover:bg-primary/90"
          >
            <Link to="/news">
              <span>{lang === "en" ? "View All News" : "सभी ख़बरें देखें"}</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
