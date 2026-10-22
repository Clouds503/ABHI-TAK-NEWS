import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Play, Youtube, RefreshCw, Radio } from "lucide-react";
import { YOUTUBE_CHANNEL } from "@/components/AppShell";
import { useI18n, timeAgo } from "@/lib/i18n";
import { Empty } from "@/components/news";
import { videosQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { getLiveStatus, syncYouTubeVideosServerFn } from "@/lib/youtube.functions";
import { useRealtimeVideos } from "@/lib/useRealtimeVideos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: [
      { title: "Video Galaxy — Abhi Tak" },
      {
        name: "description",
        content:
          "Latest video news and ground reports from Abhi Tak's YouTube channel, District Bijnor.",
      },
      { property: "og:title", content: "Video Galaxy — Abhi Tak" },
      {
        property: "og:description",
        content:
          "Latest video news and ground reports from Abhi Tak's YouTube channel, District Bijnor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Videos,
});

function getYouTubeId(urlOrId: string | null | undefined): string {
  if (!urlOrId) return "";
  if (/^[A-Za-z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  const match = urlOrId.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  return match && match[1] ? match[1] : urlOrId;
}

function Videos() {
  const { t, lang, pick } = useI18n();
  const qc = useQueryClient();

  // Enable real-time websocket subscription for video changes
  const { isConnected: isRealtimeConnected } = useRealtimeVideos();

  const { data: rawVideos, isLoading } = useQuery(videosQuery);
  const fetchLive = useServerFn(getLiveStatus);
  const syncServerVideos = useServerFn(syncYouTubeVideosServerFn);

  // Check if channel is actively broadcasting live
  const live = useQuery({
    queryKey: ["yt-live"],
    queryFn: () => fetchLive(),
    refetchInterval: 60 * 1000,
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Trigger background sync if database has few/stale videos
  useEffect(() => {
    if (!isLoading && (!rawVideos || rawVideos.length <= 3)) {
      setIsSyncing(true);
      syncServerVideos()
        .then(() => {
          void qc.invalidateQueries({ queryKey: ["videos"] });
        })
        .catch((err) => {
          console.warn("[videos] Background initial sync note:", err);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [isLoading, rawVideos, qc, syncServerVideos]);

  const handleManualRefresh = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncServerVideos();
      await qc.invalidateQueries({ queryKey: ["videos"] });
    } catch (err) {
      console.error("[videos] Manual sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const videos =
    rawVideos?.map((v) => {
      const ytId = getYouTubeId(v.video_url || v.id);
      return {
        id: v.id,
        ytId,
        title: pick(v.title_hi, v.title_en),
        thumb:
          v.thumbnail_url ||
          (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : "/pwa-192.png"),
        duration: v.duration,
        published: v.published_at,
      };
    }) ?? [];

  const current = videos.find((v) => v.id === activeId) ?? videos[0];
  const isLiveActive = !!live.data?.live;

  return (
    <div className="bg-ink pb-8 text-ink-foreground min-h-screen">
      {/* ======================================================== */}
      {/* MOBILE VIDEO GALAXY (lg:hidden) - STRICT 100% INVARIANCE */}
      {/* ======================================================== */}
      <div className="lg:hidden">
        <div className="px-4 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
              Abhi Tak
            </div>
            {isRealtimeConnected && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{lang === "hi" ? "रीयल-टाइम सिंक" : "Live Sync"}</span>
              </div>
            )}
          </div>

          <h1 className="text-3xl font-bold">{t("videoGalaxy")}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              asChild
              className="h-10 rounded-full bg-youtube px-4 text-[14px] font-semibold text-primary-foreground hover:bg-youtube/90 shadow-md"
            >
              <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer">
                <Youtube className="h-4 w-4" /> {t("ytChannel")}
              </a>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isSyncing}
              className="h-10 rounded-full border-ink-foreground/20 bg-ink-foreground/5 px-3 text-[13px] text-ink-foreground hover:bg-ink-foreground/15"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin text-primary" : ""}`} />
              <span className="ml-1.5">
                {isSyncing
                  ? lang === "hi"
                    ? "सिंक हो रहा है…"
                    : "Syncing…"
                  : lang === "hi"
                    ? "ताज़ा करें"
                    : "Refresh"}
              </span>
            </Button>
          </div>
        </div>

        {/* Live Broadcast Alert Banner */}
        {isLiveActive && (
          <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-red-600/30 bg-gradient-to-r from-red-950/80 to-ink p-3.5 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 items-center justify-center">
                  <span className="absolute h-3 w-3 animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-red-600" />
                </span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-red-400">
                    {lang === "hi" ? "सीधा प्रसारण शुरू है" : "Live Streaming Now"}
                  </div>
                  <div className="line-clamp-1 text-sm font-semibold text-white">
                    {live.data?.title || t("liveTv")}
                  </div>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                className="shrink-0 rounded-full bg-red-600 text-xs font-bold text-white hover:bg-red-700 shadow-sm"
              >
                <Link to="/live">
                  <Radio className="mr-1 h-3.5 w-3.5" />
                  {lang === "hi" ? "लाइव देखें" : "Watch Live"}
                </Link>
              </Button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mx-4 aspect-video animate-pulse rounded-lg bg-ink-foreground/10" />
        )}

        {!isLoading && !videos.length && <Empty text={t("noContent")} />}

        {current && (
          <div className="mt-2">
            <div className="relative aspect-video w-full bg-black overflow-hidden shadow-lg">
              {playingId === current.id && current.ytId ? (
                <iframe
                  key={current.id}
                  src={`https://www.youtube-nocookie.com/embed/${current.ytId}?playsinline=1&rel=0&autoplay=1`}
                  title={current.title}
                  className="h-full w-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPlayingId(current.id)}
                  aria-label={`${current.title} चलाएँ`}
                  className="group relative h-full w-full rounded-none p-0 hover:bg-transparent"
                >
                  <img
                    src={current.thumb}
                    alt=""
                    width={640}
                    height={360}
                    decoding="async"
                    fetchPriority="high"
                    onError={(event) => {
                      event.currentTarget.src = "/pwa-192.png";
                      event.currentTarget.classList.add("object-contain");
                    }}
                    className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 grid place-items-center bg-black/25">
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl group-active:scale-95 transition-transform">
                      <Play className="ml-1 h-7 w-7" fill="currentColor" />
                    </span>
                  </span>
                  {current.duration && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-xs font-semibold text-white">
                      {current.duration}
                    </span>
                  )}
                </Button>
              )}
            </div>
            <h2 className="px-4 pt-3 text-xl font-bold leading-snug">{current.title}</h2>
            <div suppressHydrationWarning className="px-4 pt-1 text-[12px] text-ink-foreground/55">
              {timeAgo(current.published, lang)}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-2">
          {videos.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setActiveId(v.id);
                setPlayingId(v.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`grid w-full grid-cols-[140px_minmax(0,1fr)] gap-3 px-4 py-2.5 text-left transition-colors active:bg-ink-foreground/10 ${
                current?.id === v.id ? "bg-ink-foreground/10" : ""
              }`}
            >
              <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                <img
                  src={v.thumb}
                  alt=""
                  width={320}
                  height={180}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.src = "/pwa-192.png";
                    event.currentTarget.classList.add("object-contain");
                  }}
                  className="h-full w-full object-cover"
                />
                <Play
                  className="absolute bottom-1.5 left-1.5 h-4 w-4 text-white drop-shadow-md"
                  fill="currentColor"
                />
              </div>
              <div className="min-w-0">
                <div className="line-clamp-2 text-[15px] font-semibold leading-snug">{v.title}</div>
                <div suppressHydrationWarning className="mt-1 text-[12px] text-ink-foreground/55">
                  {timeAgo(v.published, lang)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DESKTOP THEATER MODE (hidden lg:block)                   */}
      {/* ======================================================== */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-8">
        {/* Header bar */}
        <div className="flex items-center justify-between pb-6 border-b border-ink-foreground/15 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                Abhi Tak
              </span>
              {isRealtimeConnected && (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>{lang === "hi" ? "रीयल-टाइम सिंक" : "Live Sync"}</span>
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black text-white mt-1">{t("videoGalaxy")}</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              asChild
              className="h-10 rounded-full bg-youtube px-4 text-sm font-semibold text-white hover:bg-youtube/90 shadow-md"
            >
              <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer">
                <Youtube className="h-4 w-4 mr-1.5" />
                {t("ytChannel")}
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isSyncing}
              className="h-10 rounded-full border-ink-foreground/20 bg-ink-foreground/5 px-4 text-xs text-ink-foreground hover:bg-ink-foreground/15"
            >
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${isSyncing ? "animate-spin text-primary" : ""}`}
              />
              <span>
                {isSyncing
                  ? lang === "hi"
                    ? "सिंक हो रहा है…"
                    : "Syncing…"
                  : lang === "hi"
                    ? "ताज़ा करें"
                    : "Refresh"}
              </span>
            </Button>
          </div>
        </div>

        {/* Live Broadcast Alert Banner */}
        {isLiveActive && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-red-600/30 bg-gradient-to-r from-red-950/80 to-ink p-4 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 items-center justify-center">
                  <span className="absolute h-3 w-3 animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-red-600" />
                </span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-red-400">
                    {lang === "hi" ? "सीधा प्रसारण शुरू है" : "Live Streaming Now"}
                  </div>
                  <div className="text-base font-bold text-white">
                    {live.data?.title || t("liveTv")}
                  </div>
                </div>
              </div>
              <Button
                asChild
                className="rounded-full bg-red-600 px-5 text-xs font-bold text-white hover:bg-red-700 shadow-sm"
              >
                <Link to="/live">
                  <Radio className="mr-1.5 h-4 w-4" />
                  {lang === "hi" ? "लाइव देखें" : "Watch Live"}
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* 12-Column Cinema Theater Layout: 8 cols Player + 4 cols Up Next */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Col 1 (8/12 cols): 16:9 Theater Player */}
          <div className="col-span-8 space-y-4">
            {current && (
              <div>
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-ink-foreground/10">
                  {playingId === current.id && current.ytId ? (
                    <iframe
                      key={current.id}
                      src={`https://www.youtube-nocookie.com/embed/${current.ytId}?playsinline=1&rel=0&autoplay=1`}
                      title={current.title}
                      className="h-full w-full border-0"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPlayingId(current.id)}
                      aria-label={`${current.title} चलाएँ`}
                      className="group relative h-full w-full p-0 cursor-pointer text-left"
                    >
                      <img
                        src={current.thumb}
                        alt=""
                        width={960}
                        height={540}
                        fetchPriority="high"
                        className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-black/30">
                        <span className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-2xl group-hover:scale-110 transition-transform">
                          <Play className="ml-1 h-9 w-9" fill="currentColor" />
                        </span>
                      </span>
                      {current.duration && (
                        <span className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2.5 py-1 text-xs font-bold text-white">
                          {current.duration}
                        </span>
                      )}
                    </button>
                  )}
                </div>
                <h2 className="mt-4 font-serif text-2xl font-bold leading-snug text-white">
                  {current.title}
                </h2>
                <div className="mt-2 flex items-center justify-between text-xs text-ink-foreground/60">
                  <span suppressHydrationWarning>{timeAgo(current.published, lang)}</span>
                  <span>
                    {lang === "hi" ? "अभी तक न्यूज़ नेटवर्क बिजनौर" : "Abhi Tak News Channel"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Col 2 (4/12 cols): Up Next Playlist Queue */}
          <aside className="col-span-4 rounded-2xl border border-ink-foreground/15 bg-ink-foreground/5 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-ink-foreground/10">
              <h3 className="font-serif text-sm font-bold text-white">
                {lang === "hi" ? "अगले वीडियो" : "Up Next"}
              </h3>
              <span className="text-xs text-ink-foreground/60">
                {videos.length} {lang === "hi" ? "वीडियो" : "videos"}
              </span>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
              {videos.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setActiveId(v.id);
                    setPlayingId(v.id);
                  }}
                  className={cn(
                    "grid w-full grid-cols-[110px_minmax(0,1fr)] gap-3 rounded-xl p-2 text-left transition-colors",
                    current?.id === v.id
                      ? "bg-primary/20 border border-primary/40 text-white"
                      : "hover:bg-ink-foreground/10 text-ink-foreground/90",
                  )}
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                    <img src={v.thumb} alt="" className="h-full w-full object-cover" />
                    <Play
                      className="absolute bottom-1 left-1 h-3 w-3 text-white"
                      fill="currentColor"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold leading-snug line-clamp-2">{v.title}</h4>
                    <span
                      suppressHydrationWarning
                      className="mt-1 block text-[10px] text-ink-foreground/60"
                    >
                      {timeAgo(v.published, lang)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>

        {/* 4-Column Video Archive Grid Below */}
        <div className="mt-14 pt-10 border-t border-ink-foreground/15">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl font-bold text-white">
              {lang === "hi" ? "सम्पूर्ण वीडियो गैलेक्सी संग्रह" : "Full Video Archive"}
            </h2>
            <span className="text-xs text-ink-foreground/60">
              {videos.length} {lang === "hi" ? "वीडियो प्रकाशित" : "published videos"}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {videos.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setActiveId(v.id);
                  setPlayingId(v.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="group flex flex-col rounded-xl overflow-hidden border border-ink-foreground/15 bg-ink-foreground/5 hover:border-primary/50 text-left transition-all"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  <img
                    src={v.thumb}
                    alt=""
                    width={320}
                    height={180}
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
                <div className="p-3.5 flex flex-col flex-1">
                  <h3 className="line-clamp-2 text-xs font-bold leading-snug text-white group-hover:text-primary transition-colors">
                    {v.title}
                  </h3>
                  <span
                    suppressHydrationWarning
                    className="mt-2 text-[10px] text-ink-foreground/60"
                  >
                    {timeAgo(v.published, lang)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
