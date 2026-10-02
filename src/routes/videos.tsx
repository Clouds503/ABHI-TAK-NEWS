import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Youtube } from "lucide-react";
import { YOUTUBE_CHANNEL } from "@/components/AppShell";
import { useI18n, timeAgo } from "@/lib/i18n";
import { Empty } from "@/components/news";
import { getChannelVideoPage } from "@/lib/youtube.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: [
      { title: "Video Galaxy — Abhi Tak" },
      { name: "description", content: "Latest video news and ground reports from Abhi Tak's YouTube channel, District Bijnor." },
      { property: "og:title", content: "Video Galaxy — Abhi Tak" },
      { property: "og:description", content: "Latest video news and ground reports from Abhi Tak's YouTube channel, District Bijnor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Videos,
});

function Videos() {
  const { t, lang } = useI18n();
  const fetchVideoPage = useServerFn(getChannelVideoPage);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery({
    queryKey: ["yt-video-pages"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchVideoPage({ data: { continuation: pageParam } }),
    getNextPageParam: (lastPage) => lastPage.continuation ?? undefined,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
  const data = useMemo(() => {
    const unique = new Map<string, NonNullable<typeof query.data>["pages"][number]["videos"][number]>();
    query.data?.pages.forEach((page) => page.videos.forEach((video) => unique.set(video.id, unique.get(video.id) ?? video)));
    return [...unique.values()];
  }, [query.data]);
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !query.hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !query.isFetchingNextPage) void query.fetchNextPage();
    }, { rootMargin: "600px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);
  const [active, setActive] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const current = data?.find((v) => v.id === active) ?? data?.[0];
  return (
    <div className="bg-ink pb-8 text-ink-foreground">
      <div className="px-4 pb-3 pt-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Abhi Tak</div>
        <h1 className="text-3xl font-bold">{t("videoGalaxy")}</h1>
        <Button asChild className="mt-3 h-11 rounded-full bg-youtube px-4 text-[15px] font-semibold text-primary-foreground hover:bg-youtube/90">
          <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer"><Youtube className="h-5 w-5" /> {t("ytChannel")}</a>
        </Button>
      </div>
      {query.isLoading && <div className="mx-4 aspect-video animate-pulse rounded-sm bg-ink-foreground/10" />}
      {!query.isLoading && !data.length && <Empty text={t("noContent")} />}
      {current && (
        <div>
          <div className="relative aspect-video w-full bg-ink">
            {playing === current.id ? (
              <iframe
                key={current.id}
                src={`https://www.youtube-nocookie.com/embed/${current.id}?playsinline=1&rel=0&autoplay=1`}
                title={current.title}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPlaying(current.id)}
                aria-label={`${current.title} चलाएँ`}
                className="group relative h-full w-full rounded-none p-0 hover:bg-transparent"
              >
                <img src={current.thumb} alt="" width={480} height={270} decoding="async" fetchPriority="high" onError={(event) => { event.currentTarget.src = "/pwa-192.png"; event.currentTarget.classList.add("object-contain"); }} className="h-full w-full object-cover opacity-90" />
                <span className="absolute inset-0 grid place-items-center bg-ink/10">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg group-active:scale-95">
                    <Play className="ml-1 h-6 w-6" fill="currentColor" />
                  </span>
                </span>
              </Button>
            )}
          </div>
          <h2 className="px-4 pt-3 text-xl font-bold leading-snug">{current.title}</h2>
          <div className="px-4 pt-1 text-[12px] text-ink-foreground/55">{timeAgo(current.published, lang)}</div>
        </div>
      )}
      <div className="mt-5 space-y-1">
        {data?.map((v) => (
          <button
            key={v.id}
            onClick={() => { setActive(v.id); setPlaying(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className={`grid w-full grid-cols-[140px_minmax(0,1fr)] gap-3 px-4 py-2 text-left active:bg-ink-foreground/5 ${current?.id === v.id ? "bg-ink-foreground/5" : ""}`}
          >
            <div className="relative aspect-video overflow-hidden rounded-sm">
               <img src={v.thumb} alt="" width={320} height={180} loading="lazy" decoding="async" fetchPriority="low" onError={(event) => { event.currentTarget.src = "/pwa-192.png"; event.currentTarget.classList.add("object-contain"); }} className="h-full w-full object-cover" />
              <Play className="absolute bottom-1.5 left-1.5 h-4 w-4 text-ink-foreground" fill="currentColor" />
            </div>
            <div className="min-w-0">
              <div className="line-clamp-3 text-[15px] font-semibold leading-snug">{v.title}</div>
              <div className="mt-1 text-[12px] text-ink-foreground/55">{timeAgo(v.published, lang)}</div>
            </div>
          </button>
        ))}
        <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
        {query.isFetchingNextPage && <div className="px-4 py-5 text-center text-sm text-ink-foreground/55">{lang === "hi" ? "और वीडियो लोड हो रहे हैं…" : "Loading more videos…"}</div>}
      </div>
    </div>
  );
}
