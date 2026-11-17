import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Heart,
  Instagram,
  Pause,
  Play,
  Share2,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  getInstagramReelMedia,
  syncInstagramReelsServerFn,
  recordReelViewServerFn,
  getReelMetricsServerFn,
} from "@/lib/instagram.functions";
import { Button } from "@/components/ui/button";
import { useDoubleTap } from "@/lib/useDoubleTap";
import { HeartPop } from "@/components/HeartPop";
import { hasGuestLiked, toggleGuestLike } from "@/lib/guest-likes";
import { trackEngagement, trackReelView } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const INSTAGRAM_URL = "https://www.instagram.com/abhitaknews";

export const Route = createFileRoute("/reels")({
  head: () => ({
    meta: [
      { title: "Reels — Abhi Tak" },
      { name: "description", content: "Short video reels from Abhi Tak News, District Bijnor." },
      { property: "og:title", content: "Reels — Abhi Tak" },
      { property: "og:description", content: "Swipe through the latest Abhi Tak News reels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReelsPage,
});

type Reel = {
  id: string;
  shortcode: string;
  caption: string | null;
  video_url: string | null;
  views?: number | null;
  likes_count?: number | null;
};

/**
 * Formats view and like counts cleanly (e.g. 1.2K, 3.4M).
 */
export function formatMetricCount(num: number | undefined | null): string {
  if (!num || num <= 0) return "0";
  if (num >= 1_000_000) {
    const val = (num / 1_000_000).toFixed(1);
    return val.endsWith(".0") ? `${parseInt(val, 10)}M` : `${val}M`;
  }
  if (num >= 1_000) {
    const val = (num / 1_000).toFixed(1);
    return val.endsWith(".0") ? `${parseInt(val, 10)}K` : `${val}K`;
  }
  return num.toLocaleString();
}

function InstagramIframeReel({ reel, lang }: { reel: Reel; lang: string | null }) {
  const openInstagram = () => {
    const webUrl = `https://www.instagram.com/reel/${reel.shortcode}/`;
    if (Capacitor.isNativePlatform()) {
      window.location.href = `instagram://reel/${reel.shortcode}`;
      setTimeout(() => {
        window.open(webUrl, "_blank");
      }, 500);
    } else {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-black">
      <iframe
        src={`https://www.instagram.com/reel/${reel.shortcode}/embed`}
        title={`Instagram Reel ${reel.shortcode}`}
        className="h-full w-full border-0"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
      />
      <div className="absolute top-4 right-4 z-20">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={openInstagram}
          className="gap-1.5 rounded-full bg-background/80 px-3 text-xs font-semibold backdrop-blur-md"
        >
          <Instagram className="h-3.5 w-3.5 text-rose-500" />
          {lang === "en" ? "Open in Instagram" : "Instagram पर देखें"}
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Button>
      </div>
    </div>
  );
}

function ReelSlide({
  reel,
  active,
  lang,
  desktopControls,
}: {
  reel: Reel;
  active: boolean;
  lang: string | null;
  desktopControls?: {
    onPrev: () => void;
    onNext: () => void;
    canPrev: boolean;
    canNext: boolean;
    currentIndex: number;
    totalCount: number;
  };
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isNative = Capacitor.isNativePlatform();
  const resolveMedia = useServerFn(getInstagramReelMedia);
  const fetchMetrics = useServerFn(getReelMetricsServerFn);
  const recordViewServer = useServerFn(recordReelViewServerFn);

  const { data: scrapedMedia, isLoading: isLoadingMedia } = useQuery({
    queryKey: ["instagram-reel-media", reel.shortcode],
    queryFn: () => resolveMedia({ data: { shortcode: reel.shortcode } }),
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: !isNative && !reel.video_url,
  });

  // Query combined metrics (views & likes) from server function
  const { data: metrics } = useQuery({
    queryKey: ["reel-metrics", reel.id, reel.shortcode],
    queryFn: () => fetchMetrics({ data: { reelId: reel.id, shortcode: reel.shortcode } }),
    staleTime: 30_000,
  });

  const rawSrc = reel.video_url ?? (!isNative ? scrapedMedia?.videoUrl : null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsSound, setNeedsSound] = useState(false);
  const [flash, setFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [guestLiked, setGuestLiked] = useState(() => hasGuestLiked(`reel-${reel.id}`));
  const [heartPop, setHeartPop] = useState<{ show: boolean; x?: number; y?: number }>({
    show: false,
  });

  // Registered user like status query
  const { data: authLiked } = useQuery({
    queryKey: ["reel-liked", reel.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("reel_likes")
        .select("id")
        .eq("reel_id", reel.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const isLiked = user ? !!authLiked : guestLiked;
  const effectiveLikes = (metrics?.likes ?? 0) + (!user && guestLiked ? 1 : 0);
  const effectiveViews = metrics?.views ?? 0;

  // Track and register view when reel is active for > 1.2s
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      void trackReelView(reel.id);
      void recordViewServer({ data: { reelId: reel.id, shortcode: reel.shortcode } }).catch(() => {});
      void qc.invalidateQueries({ queryKey: ["reel-metrics", reel.id] });
    }, 1200);

    return () => clearTimeout(timer);
  }, [active, reel.id, reel.shortcode, qc, recordViewServer]);

  useEffect(() => {
    setVideoFailed(false);
  }, [rawSrc]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (!muted) setNeedsSound(false);
  }, [muted]);

  // Pause playback when tab is backgrounded / hidden to prevent audio bleeding
  useEffect(() => {
    const handleVisibility = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) {
        v.pause();
      } else if (active && !paused && !videoFailed && rawSrc) {
        v.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [active, paused, videoFailed, rawSrc]);

  // Video playback controller with strict cancellation and cleanup on active change
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (!active || videoFailed || !rawSrc) {
      v.pause();
      return;
    }

    let isCancelled = false;

    v.currentTime = 0;
    v.muted = muted;

    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (isCancelled) {
            v.pause();
            return;
          }
          setPaused(false);
          setNeedsSound(false);
        })
        .catch(() => {
          if (isCancelled) return;
          v.muted = true;
          setMuted(true);
          setNeedsSound(true);
          v.play()
            .then(() => {
              if (isCancelled) {
                v.pause();
                return;
              }
              setPaused(false);
            })
            .catch(() => {
              if (!isCancelled) setPaused(true);
            });
        });
    }

    return () => {
      isCancelled = true;
      v.pause();
    };
  }, [active, videoFailed, rawSrc]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  };

  const toggleLike = async () => {
    if (!user) {
      const nowLiked = toggleGuestLike(`reel-${reel.id}`);
      setGuestLiked(nowLiked);
      if (nowLiked) {
        toast.success(
          lang === "en"
            ? "Liked! Sign in to sync across devices."
            : "पसंद किया गया! सहेजने के लिए साइन इन करें।",
        );
        void trackEngagement("like", "reel", reel.id);
      }
      return;
    }
    if (authLiked) {
      await supabase.from("reel_likes").delete().eq("id", authLiked.id);
    } else {
      await supabase.from("reel_likes").insert({ reel_id: reel.id, user_id: user.id });
      void trackEngagement("like", "reel", reel.id);
    }
    qc.invalidateQueries({ queryKey: ["reel-liked", reel.id] });
    qc.invalidateQueries({ queryKey: ["reel-metrics", reel.id] });
  };

  const shareReel = async () => {
    const url = `https://www.instagram.com/reel/${reel.shortcode}/`;
    if (navigator.share) {
      await navigator.share({ title: reel.caption ?? "Abhi Tak Reel", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
    void trackEngagement("share", "reel", reel.id);
  };

  const openInstagram = () => {
    const webUrl = `https://www.instagram.com/reel/${reel.shortcode}/`;
    if (Capacitor.isNativePlatform()) {
      window.location.href = `instagram://reel/${reel.shortcode}`;
      setTimeout(() => {
        window.open(webUrl, "_blank");
      }, 500);
    } else {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  };

  const gesture = useDoubleTap(
    (_e, point) => {
      setHeartPop({ show: true, x: point.x, y: point.y });
      if (!isLiked) {
        void toggleLike();
      }
      void trackEngagement("double_tap", "reel", reel.id);
    },
    {
      latency: 280,
      onSingleTap: () => {
        if (!videoFailed && rawSrc) {
          togglePlay();
        }
      },
    },
  );

  if (desktopControls) {
    return (
      <div className="flex items-center gap-6">
        {/* Centered 9:16 Card Frame */}
        <div className="relative h-[84vh] max-h-[850px] w-[420px] overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
          <HeartPop
            show={heartPop.show}
            x={heartPop.x}
            y={heartPop.y}
            onAnimationEnd={() => setHeartPop({ show: false })}
          />

          {/* Playback Layer */}
          {rawSrc && !videoFailed ? (
            <div {...gesture} className="relative h-full w-full cursor-pointer select-none">
              <video
                ref={videoRef}
                src={rawSrc}
                className="h-full w-full object-contain"
                playsInline
                loop
                muted={muted}
                preload={active ? "auto" : "metadata"}
                onError={() => setVideoFailed(true)}
              />
              {(paused || flash) && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-foreground/50 text-background backdrop-blur-sm">
                    {paused ? (
                      <Play className="h-9 w-9 fill-current" />
                    ) : (
                      <Pause className="h-9 w-9 fill-current" />
                    )}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <InstagramIframeReel reel={reel} lang={lang} />
          )}

          {/* Mute button on top right */}
          {rawSrc && !videoFailed && (
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
              className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 shadow-lg active:scale-90 transition-transform cursor-pointer"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}

          {/* Sound prompt banner */}
          {needsSound && !videoFailed && rawSrc && (
            <Button
              type="button"
              onClick={() => {
                const v = videoRef.current;
                setMuted(false);
                setNeedsSound(false);
                if (v) {
                  v.muted = false;
                  void v.play().catch(() => {});
                }
              }}
              className="absolute bottom-16 left-4 z-20 h-10 gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-white shadow-lg"
            >
              <Volume2 className="h-4 w-4" />
              {lang === "en" ? "Turn on sound" : "आवाज़ चालू करें"}
            </Button>
          )}

          {/* Reel Caption */}
          {reel.caption && (
            <p className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 line-clamp-3 rounded-lg bg-black/60 p-3 text-sm font-medium text-white backdrop-blur-xs drop-shadow-md">
              {reel.caption}
            </p>
          )}
        </div>

        {/* Adjacent Desktop Action & Navigation Rail */}
        <div className="flex flex-col items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={desktopControls.onPrev}
            disabled={!desktopControls.canPrev}
            className="h-12 w-12 rounded-full border-white/20 bg-black/60 text-white hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none shadow-lg cursor-pointer"
            aria-label="Previous reel"
          >
            <ChevronUp className="h-6 w-6" />
          </Button>

          {/* Like Button */}
          <button
            type="button"
            onClick={toggleLike}
            aria-label="Like reel"
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
          >
            <div
              className={cn(
                "grid h-12 w-12 place-items-center rounded-full border border-white/10 backdrop-blur-md shadow-lg transition-colors",
                isLiked ? "bg-rose-500 text-white" : "bg-black/60 text-white hover:bg-white/20",
              )}
            >
              <Heart className="h-6 w-6" fill={isLiked ? "currentColor" : "none"} strokeWidth={2} />
            </div>
            <span className="text-[11px] font-bold text-white/90 tabular-nums">
              {formatMetricCount(effectiveLikes)}
            </span>
          </button>

          {/* Views Counter */}
          <div className="flex flex-col items-center gap-1 select-none">
            <div className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-black/60 text-white/90 backdrop-blur-md shadow-lg">
              <Eye className="h-5 w-5 text-sky-400" />
            </div>
            <span className="text-[11px] font-bold text-white/90 tabular-nums">
              {formatMetricCount(effectiveViews)}
            </span>
          </div>

          {/* Share Button */}
          <button
            type="button"
            onClick={shareReel}
            aria-label="Share reel"
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md hover:bg-white/20 shadow-lg">
              <Share2 className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-white/80">
              {lang === "en" ? "Share" : "शेयर"}
            </span>
          </button>

          {/* Open in Instagram */}
          <button
            type="button"
            onClick={openInstagram}
            aria-label="Open on Instagram"
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-black/60 text-rose-400 backdrop-blur-md hover:bg-white/20 shadow-lg">
              <Instagram className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-white/80">Insta</span>
          </button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={desktopControls.onNext}
            disabled={!desktopControls.canNext}
            className="h-12 w-12 rounded-full border-white/20 bg-black/60 text-white hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none shadow-lg cursor-pointer"
            aria-label="Next reel"
          >
            <ChevronDown className="h-6 w-6" />
          </Button>

          <span className="text-xs font-bold text-white/60 py-1 tabular-nums">
            {desktopControls.currentIndex} / {desktopControls.totalCount}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black">
      <HeartPop
        show={heartPop.show}
        x={heartPop.x}
        y={heartPop.y}
        onAnimationEnd={() => setHeartPop({ show: false })}
      />

      {/* Playback Layer */}
      {rawSrc && !videoFailed ? (
        <div {...gesture} className="relative h-full w-full cursor-pointer select-none">
          <video
            ref={videoRef}
            src={rawSrc}
            className="h-full w-full object-contain"
            playsInline
            loop
            muted={muted}
            preload={active ? "auto" : "metadata"}
            onError={() => setVideoFailed(true)}
          />
          {(paused || flash) && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-foreground/50 text-background backdrop-blur-sm">
                {paused ? (
                  <Play className="h-9 w-9 fill-current" />
                ) : (
                  <Pause className="h-9 w-9 fill-current" />
                )}
              </span>
            </div>
          )}
        </div>
      ) : (
        <InstagramIframeReel reel={reel} lang={lang} />
      )}

      {/* Right Action Rail (Mobile) */}
      <div className="absolute right-3 bottom-[max(5rem,calc(env(safe-area-inset-bottom)+5rem))] z-30 flex flex-col items-center gap-4">
        {/* Like Button */}
        <button
          type="button"
          onClick={toggleLike}
          aria-label="Like reel"
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <div
            className={cn(
              "grid h-12 w-12 place-items-center rounded-full backdrop-blur-md shadow-lg",
              isLiked ? "bg-rose-500 text-white" : "bg-black/60 text-white hover:bg-black/80",
            )}
          >
            <Heart className="h-6 w-6" fill={isLiked ? "currentColor" : "none"} strokeWidth={2} />
          </div>
          <span className="text-[12px] font-bold text-white drop-shadow-md tabular-nums">
            {formatMetricCount(effectiveLikes)}
          </span>
        </button>

        {/* Views Display */}
        <div className="flex flex-col items-center gap-1 select-none">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md shadow-lg">
            <Eye className="h-5 w-5 text-sky-400" />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow-md tabular-nums">
            {formatMetricCount(effectiveViews)}
          </span>
        </div>

        {/* Share Button */}
        <button
          type="button"
          onClick={shareReel}
          aria-label="Share reel"
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 shadow-lg">
            <Share2 className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-semibold text-white drop-shadow-md">
            {lang === "en" ? "Share" : "शेयर"}
          </span>
        </button>

        {/* Open in Instagram */}
        <button
          type="button"
          onClick={openInstagram}
          aria-label="Open on Instagram"
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 shadow-lg">
            <Instagram className="h-5 w-5 text-rose-400" />
          </div>
          <span className="text-[11px] font-semibold text-white drop-shadow-md">Insta</span>
        </button>

        {/* Mute/Unmute (if direct video) */}
        {rawSrc && !videoFailed && (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute" : "Mute"}
            className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 shadow-lg active:scale-90 transition-transform"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Sound prompt banner if muted autoplay */}
      {needsSound && !videoFailed && rawSrc && (
        <Button
          type="button"
          onClick={() => {
            const v = videoRef.current;
            setMuted(false);
            setNeedsSound(false);
            if (v) {
              v.muted = false;
              void v.play().catch(() => {});
            }
          }}
          className="absolute bottom-[max(5rem,calc(env(safe-area-inset-bottom)+5rem))] left-4 z-20 h-10 gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-white shadow-lg"
        >
          <Volume2 className="h-4 w-4" />
          {lang === "en" ? "Turn on sound" : "आवाज़ चालू करें"}
        </Button>
      )}

      {/* Reel Caption */}
      {reel.caption && (
        <p className="pointer-events-none absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-4 right-20 z-20 line-clamp-3 text-sm font-medium text-white drop-shadow-md">
          {reel.caption}
        </p>
      )}
    </div>
  );
}

function ReelsPage() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const syncInstagramReels = useServerFn(syncInstagramReelsServerFn);

  const { data: reels, isLoading } = useQuery({
    queryKey: ["reels"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reels")
        .select("id, shortcode, caption, video_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: false })
        .order("created_at", { ascending: false });
      return (data ?? []) as Reel[];
    },
  });

  const [active, setActive] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-fetch new reels if database has no reels or on initial visit
  useEffect(() => {
    if (!isLoading && (!reels || reels.length === 0)) {
      setIsSyncing(true);
      syncInstagramReels()
        .then(() => {
          void qc.invalidateQueries({ queryKey: ["reels"] });
        })
        .catch((err) => {
          console.warn("[reels] Auto-fetch error:", err);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [isLoading, reels, qc, syncInstagramReels]);

  const handleManualRefresh = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncInstagramReels();
      await qc.invalidateQueries({ queryKey: ["reels"] });
      if (res?.success) {
        toast.success(
          lang === "en"
            ? `Reels updated (${res.added} new added)`
            : `रील्स अपडेट हुईं (${res.added} नई जोड़ी गईं)`,
        );
      }
    } catch (err) {
      console.error("[reels] Refresh error:", err);
      toast.error(lang === "en" ? "Failed to refresh reels" : "रील्स रीफ्रेश करने में विफल");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset["i"]));
        });
      },
      { threshold: 0.6 },
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [reels]);

  // Keyboard navigation for desktop (ArrowUp / ArrowDown)
  useEffect(() => {
    if (!reels?.length) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        setActive((prev) => Math.min(reels.length - 1, prev + 1));
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setActive((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reels?.length]);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: "/" });
  };

  const h = "h-[100dvh]";
  if (isLoading && !reels?.length)
    return <div className={`${h} grid place-items-center text-muted-foreground bg-black`}>…</div>;

  if (!reels?.length)
    return (
      <div className={`${h} grid place-items-center p-6 text-center bg-black text-white`}>
        <div className="space-y-4">
          <Instagram className="mx-auto h-12 w-12 text-rose-500 animate-pulse" />
          <p className="text-muted-foreground">
            {lang === "en" ? "Fetching latest reels from @abhitaknews…" : "@abhitaknews से रील्स लोड हो रही हैं…"}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleManualRefresh}
            disabled={isSyncing}
            className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin text-rose-500" : ""}`} />
            {isSyncing ? (lang === "en" ? "Syncing…" : "सिंक हो रहा है…") : (lang === "en" ? "Sync Now" : "अभी सिंक करें")}
          </Button>
        </div>
      </div>
    );

  return (
    <div className="relative bg-black">
      {/* Top Mobile Header (Back + Refresh Sync Button) */}
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-4 right-4 z-50 flex items-center justify-between lg:hidden pointer-events-none">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={goBack}
          aria-label={lang === "en" ? "Back" : "वापस जाएं"}
          className="pointer-events-auto h-11 w-11 rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md shadow-lg hover:bg-black/80"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={handleManualRefresh}
          disabled={isSyncing}
          aria-label={lang === "en" ? "Refresh" : "ताज़ा करें"}
          className="pointer-events-auto h-11 w-11 rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md shadow-lg hover:bg-black/80"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin text-rose-400" : ""}`} />
        </Button>
      </div>

      {/* ======================================================== */}
      {/* MOBILE REELS (lg:hidden) - STRICT 100% INVARIANCE        */}
      {/* ======================================================== */}
      <div
        className={`${h} snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black no-scrollbar lg:hidden`}
      >
        {reels.map((r, i) => (
          <div
            key={r.id}
            data-i={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="relative flex h-full snap-start snap-always items-center justify-center bg-black"
          >
            {Math.abs(i - active) <= 1 ? (
              <ReelSlide reel={r} active={i === active} lang={lang} />
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        ))}
      </div>

      {/* ======================================================== */}
      {/* DESKTOP REELS THEATER (hidden lg:flex) - 9:16 FRAME      */}
      {/* ======================================================== */}
      <div className="hidden lg:flex items-center justify-center min-h-[100dvh] w-full bg-neutral-950 text-white relative py-6">
        {/* Top Header / Back Button + Title + Refresh Button */}
        <div className="absolute top-6 left-8 right-8 z-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={goBack}
              aria-label={lang === "en" ? "Back" : "वापस जाएं"}
              className="h-11 w-11 rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md shadow-lg hover:bg-black/80 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-serif text-lg font-bold text-white tracking-wide">
              {lang === "en" ? "Abhi Tak Reels" : "अभी तक रील्स"}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isSyncing}
            className="rounded-full border-white/20 bg-black/60 text-white hover:bg-white/20 shadow-lg cursor-pointer"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin text-rose-400" : ""}`} />
            {isSyncing
              ? lang === "en"
                ? "Syncing…"
                : "सिंक हो रहा है…"
              : lang === "en"
                ? "Sync from Instagram"
                : "Instagram से सिंक करें"}
          </Button>
        </div>

        {/* Centered 9:16 Card + Adjacent Action & Navigation Rail */}
        {reels[active] && (
          <ReelSlide
            key={reels[active].id}
            reel={reels[active]}
            active={true}
            lang={lang}
            desktopControls={{
              onPrev: () => setActive((i) => Math.max(0, i - 1)),
              onNext: () => setActive((i) => Math.min(reels.length - 1, i + 1)),
              canPrev: active > 0,
              canNext: active < reels.length - 1,
              currentIndex: active + 1,
              totalCount: reels.length,
            }}
          />
        )}
      </div>
    </div>
  );
}
