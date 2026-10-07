import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Search, Loader2, X, SlidersHorizontal, RotateCcw, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, townsQuery, villagesQuery, type ArticleCard } from "@/lib/queries";
import { useI18n, timeAgo } from "@/lib/i18n";
import { img } from "@/lib/media";
import { ArticleRow, Empty } from "@/components/news";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FilterDrawer,
  ActiveFilterChips,
  type FilterState,
  getDateRangeFromPreset,
  getActiveFilterCount,
} from "@/components/FilterDrawer";
import { cn } from "@/lib/utils";

function ArchiveDesktopCard({ a }: { a: ArticleCard }) {
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
          <span>· {timeAgo(a.published_at, lang)}</span>
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

export const Route = createFileRoute("/news/")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: (search["category"] as string) || undefined,
    town: (search["town"] as string) || undefined,
    q: (search["q"] as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "All News — Abhi Tak | सभी ख़बरें" },
      {
        name: "description",
        content: "Complete archive of breaking and local news from District Bijnor.",
      },
      { property: "og:title", content: "All News — Abhi Tak" },
      {
        property: "og:description",
        content: "Complete archive of breaking and local news from District Bijnor.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: NewsArchivePage,
});

const PAGE_SIZE = 20;

const ARTICLE_COLS =
  "id, slug, title_hi, title_en, summary_hi, summary_en, cover_url, is_breaking, is_featured, published_at, author_name, town:towns(slug,name_hi,name_en), category:categories(slug,name_hi,name_en)";

function NewsArchivePage() {
  const searchParams = Route.useSearch();
  const { lang, pick, t } = useI18n();

  const [term, setTerm] = useState(searchParams.q ?? "");
  const [debouncedTerm, setDebouncedTerm] = useState(searchParams.q ?? "");
  const [filters, setFilters] = useState<FilterState>({
    category: searchParams.category,
    town: searchParams.town,
    datePreset: "all",
  });

  const { data: categories } = useQuery(categoriesQuery);
  const { data: towns } = useQuery(townsQuery);
  const selectedTownObj = towns?.find((t) => t.slug === filters.town);
  const { data: villages } = useQuery(villagesQuery(selectedTownObj?.id));

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(term.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [term]);

  // Synchronize route search parameters when navigating from Desktop Header dropdowns/search
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      category: searchParams.category,
      town: searchParams.town,
    }));
    if (searchParams.q !== undefined) {
      setTerm(searchParams.q);
    }
  }, [searchParams.category, searchParams.town, searchParams.q]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["news-archive", filters, debouncedTerm],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      let q = supabase
        .from("articles")
        .select(
          ARTICLE_COLS.replace(
            "town:towns(",
            filters.town ? "town:towns!inner(" : "town:towns(",
          ).replace(
            "category:categories(",
            filters.category ? "category:categories!inner(" : "category:categories(",
          ),
        )
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (filters.town) q = q.eq("town.slug", filters.town);
      if (filters.category) q = q.eq("category.slug", filters.category);
      if (filters.village) q = q.eq("village_id", filters.village);
      if (filters.fromDate) q = q.gte("published_at", filters.fromDate);
      if (filters.toDate) q = q.lte("published_at", filters.toDate);

      if (debouncedTerm) {
        q = q.or(
          `title_hi.ilike.%${debouncedTerm}%,title_en.ilike.%${debouncedTerm}%,summary_hi.ilike.%${debouncedTerm}%,summary_en.ilike.%${debouncedTerm}%`,
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as ArticleCard[]) ?? [];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    staleTime: 60_000,
  });

  // Infinite scroll intersection observer
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allArticles = data?.pages.flatMap((page) => page) ?? [];
  const activeCount = getActiveFilterCount(filters);

  const applyDatePreset = (preset: "all" | "today" | "week" | "month") => {
    const dates = getDateRangeFromPreset(preset);
    setFilters((p) => ({
      ...p,
      datePreset: preset,
      fromDate: dates.fromDate,
      toDate: dates.toDate,
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      category: undefined,
      town: undefined,
      village: undefined,
      datePreset: "all",
      fromDate: undefined,
      toDate: undefined,
    });
    setTerm("");
    setDebouncedTerm("");
  };

  return (
    <div className="pb-16 min-h-screen">
      {/* ======================================================== */}
      {/* MOBILE ARCHIVE (lg:hidden) - STRICT 100% INVARIANCE      */}
      {/* ======================================================== */}
      <div className="lg:hidden">
        {/* Title & Search Bar */}
        <div className="border-b bg-card px-4 pt-4 pb-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {lang === "en" ? "All News" : "सभी ख़बरें"}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lang === "en"
              ? "Explore news across all categories, towns, and dates."
              : "बिजनौर की सभी श्रेणियों, कस्बों और दिनांक की ख़बरें।"}
          </p>

          {/* Search Bar with Integrated Filter Button */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={lang === "en" ? "Search news, topics, keywords…" : "ख़बरें खोजें…"}
                className="h-10 pl-9 pr-8 text-sm rounded-lg"
              />
              {term && (
                <button
                  type="button"
                  onClick={() => setTerm("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <FilterDrawer
              filters={filters}
              onFiltersChange={setFilters}
              triggerClassName="h-10 rounded-lg"
            />
          </div>
        </div>

        {/* Sticky Category Pill Bar + Filter Drawer Button */}
        <div className="sticky top-[max(3.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-30 flex items-center gap-2 border-b bg-background/95 px-4 py-2.5 backdrop-blur-md">
          <FilterDrawer filters={filters} onFiltersChange={setFilters} />

          <div className="no-scrollbar flex flex-1 snap-x gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilters((p) => ({ ...p, category: undefined }))}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                !filters.category
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

        {/* News Feed */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : allArticles.length === 0 ? (
          <Empty text={t("noContent")} />
        ) : (
          <div className="divide-y border-t">
            {allArticles.map((a, i) => (
              <ArticleRow key={a.id} a={a} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* DESKTOP ARCHIVE (hidden lg:block) - 12-COL EDITORIAL     */}
      {/* ======================================================== */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-8">
        {/* Header Breadcrumb & Title */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Link to="/" className="hover:text-primary transition-colors">
              {t("home")}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">
              {lang === "en" ? "News Archive" : "समाचार आर्काइव"}
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-serif text-3xl font-extrabold text-foreground">
                {lang === "en" ? "All News Archive" : "सम्पूर्ण समाचार आर्काइव"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "en"
                  ? "Explore all published ground reports across District Bijnor's towns and villages."
                  : "जनपद बिजनौर के सभी कस्बों, गांवों और श्रेणियों से प्रकाशित सभी ताज़ा व विस्तृत ख़बरें।"}
              </p>
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              {allArticles.length} {lang === "en" ? "articles loaded" : "ख़बरें प्रदर्शित"}
            </div>
          </div>
        </div>

        {/* 12-Column Grid */}
        <div className="grid grid-cols-12 gap-8 mt-8">
          {/* Left Column (3/12 cols): In-Page Sticky Filter Sidebar */}
          <aside className="col-span-3 sticky top-20 self-start space-y-6 rounded-2xl border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span>{lang === "en" ? "Filters" : "फ़िल्टर"}</span>
              </span>
              {(activeCount > 0 || debouncedTerm) && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{lang === "en" ? "Reset" : "रीसेट"}</span>
                </button>
              )}
            </div>

            {/* Towns Filter */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{lang === "en" ? "Town / Tehsil" : "कस्बा / तहसील"}</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilters((p) => ({ ...p, town: undefined, village: undefined }))}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    !filters.town
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-foreground hover:bg-muted",
                  )}
                >
                  {lang === "en" ? "All Towns" : "सभी कस्बे"}
                </button>
                {towns?.map((tw) => (
                  <button
                    key={tw.id}
                    type="button"
                    onClick={() =>
                      setFilters((p) => ({
                        ...p,
                        town: p.town === tw.slug ? undefined : tw.slug,
                        village: undefined,
                      }))
                    }
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                      filters.town === tw.slug
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/60 text-foreground hover:bg-muted",
                    )}
                  >
                    {pick(tw.name_hi, tw.name_en)}
                  </button>
                ))}
              </div>
            </div>

            {/* Village Selector (if town selected & has villages) */}
            {villages && villages.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {lang === "en" ? "Village / Sector" : "गांव / क्षेत्र"}
                </label>
                <select
                  value={filters.village ?? ""}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, village: e.target.value || undefined }))
                  }
                  className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{lang === "en" ? "All Villages" : "सभी गांव"}</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {pick(v.name_hi, v.name_en)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Categories Filter */}
            <div className="space-y-2.5 border-t pt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "en" ? "Categories" : "श्रेणियाँ"}
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilters((p) => ({ ...p, category: undefined }))}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    !filters.category
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-foreground hover:bg-muted",
                  )}
                >
                  {lang === "en" ? "All Categories" : "सभी"}
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
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                      filters.category === cat.slug
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/60 text-foreground hover:bg-muted",
                    )}
                  >
                    {pick(cat.name_hi, cat.name_en)}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Presets Filter */}
            <div className="space-y-2.5 border-t pt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>{lang === "en" ? "Date Range" : "दिनांक अनुसार"}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: "all", labelEn: "All Time", labelHi: "सभी समय" },
                    { id: "today", labelEn: "Today", labelHi: "आज" },
                    { id: "week", labelEn: "This Week", labelHi: "इस सप्ताह" },
                    { id: "month", labelEn: "This Month", labelHi: "इस महीने" },
                  ] as const
                ).map((dp) => (
                  <button
                    key={dp.id}
                    type="button"
                    onClick={() => applyDatePreset(dp.id)}
                    className={cn(
                      "rounded-lg py-1.5 px-2 text-xs font-medium text-center transition-colors",
                      (!filters.datePreset && dp.id === "all") || filters.datePreset === dp.id
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "bg-muted/60 text-foreground hover:bg-muted",
                    )}
                  >
                    {lang === "en" ? dp.labelEn : dp.labelHi}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Column (9/12 cols): Search Bar + Active Filters + 3-Col Article Grid */}
          <main className="col-span-9 space-y-6">
            {/* Desktop Search Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={
                    lang === "en"
                      ? "Search news by headline, keywords or topic…"
                      : "शीर्षक, मुख्य शब्द या विषय द्वारा समाचार खोजें…"
                  }
                  className="h-11 pl-10 pr-9 rounded-xl text-sm bg-card border-border shadow-xs"
                />
                {term && (
                  <button
                    type="button"
                    onClick={() => setTerm("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Filter Chips */}
            <ActiveFilterChips filters={filters} onFiltersChange={setFilters} />

            {/* 3-Column Desktop Grid */}
            {isLoading ? (
              <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((k) => (
                  <div key={k} className="space-y-3 rounded-xl border bg-card p-4">
                    <Skeleton className="aspect-[16/9] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : allArticles.length === 0 ? (
              <div className="rounded-2xl border bg-card p-12 text-center shadow-xs">
                <Empty text={t("noContent")} />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                {allArticles.map((a) => (
                  <ArchiveDesktopCard key={a.id} a={a} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Infinite Scroll Indicator (both mobile & desktop) */}
      <div ref={loadMoreRef} className="py-8 text-center text-sm text-muted-foreground">
        {isFetchingNextPage ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{lang === "en" ? "Loading more stories…" : "और ख़बरें लोड हो रही हैं…"}</span>
          </div>
        ) : hasNextPage ? (
          <span>
            {lang === "en" ? "Scroll down for more" : "और ख़बरों के लिए नीचे स्क्रॉल करें"}
          </span>
        ) : allArticles.length > 0 ? (
          <span className="text-xs opacity-75">
            {lang === "en" ? "You have reached the end" : "आपने सभी ताज़ा ख़बरें देख ली हैं"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
