import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, type ArticleCard } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { ArticleRow, Empty } from "@/components/news";
import { Input } from "@/components/ui/input";
import {
  FilterDrawer,
  ActiveFilterChips,
  type FilterState,
  getDateRangeFromPreset,
} from "@/components/FilterDrawer";
import { cn } from "@/lib/utils";

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
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(term.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [term]);

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

  return (
    <div className="pb-16 min-h-screen">
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

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={lang === "en" ? "Search news, topics, keywords…" : "ख़बरें खोजें…"}
            className="h-10 pl-9 pr-3 text-sm rounded-lg"
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

      {/* Infinite Scroll Indicator */}
      <div ref={loadMoreRef} className="py-6 text-center text-sm text-muted-foreground">
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
