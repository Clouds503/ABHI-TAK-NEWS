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
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getInstagramReelMedia } from "@/lib/instagram.functions";
import { Button } from "@/components/ui/button";
import { useDoubleTap } from "@/lib/useDoubleTap";
import { HeartPop } from "@/components/HeartPop";
import { hasGuestLiked, toggleGuestLike } from "@/lib/guest-likes";
import { trackEngagement } from "@/lib/analytics";
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

type Reel = { id: string; shortcode: string; caption: string | null; video_url: string | null };

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

function ReelSlide({ reel, active, lang }: { reel: Reel; active: boolean; lang: string | null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isNative = Capacitor.isNativePlatform();
  const resolveMedia = useServerFn(getInstagramReelMedia);

  const { data: scrapedMedia } = useQuery({
    queryKey: ["instagram-reel-media", reel.shortcode],
    queryFn: () => resolveMedia({ data: { shortcode: reel.shortcode } }),
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: !isNative && !reel.video_url,
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

  // Reel likes query from database
  const { data: dbLikeCount } = useQuery({
    queryKey: ["reel-likes-count", reel.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("reel_likes")
        .select("id", { count: "exact", head: true })
        .eq("reel_id", reel.id);
      return count ?? 0;
    },
    staleTime: 30_000,
  });

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
  const effectiveLikes = (dbLikeCount ?? 0) + (!user && guestLiked ? 1 : 0);

  useEffect(() => {
    setVideoFailed(false);
  }, [rawSrc]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (!muted) setNeedsSound(false);
  }, [muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || videoFailed) return;
    if (!active) {
      v.pause();
      return;
    }
    v.currentTime = 0;
    v.muted = false;
    v.play()
      .then(() => {
        setPaused(false);
        setMuted(false);
      })
      .catch(() => {
        v.muted = true;
        setMuted(true);
        setNeedsSound(true);
        v.play()
          .then(() => setPaused(false))
          .catch(() => setPaused(true));
      });
  }, [active, videoFailed]);

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
    qc.invalidateQueries({ queryKey: ["reel-likes-count", reel.id] });
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

      {/* Right Action Rail */}
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
          {effectiveLikes > 0 && (
            <span className="text-[12px] font-bold text-white drop-shadow-md">
              {effectiveLikes}
            </span>
          )}
        </button>

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
  const refs = useRef<(HTMLDivElement | null)[]>([]);

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

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: "/" });
  };

  const h = "h-[100dvh]";
  if (isLoading)
    return <div className={`${h} grid place-items-center text-muted-foreground bg-black`}>…</div>;
  if (!reels?.length)
    return (
      <div className={`${h} grid place-items-center p-6 text-center bg-black text-white`}>
        <div>
          <Instagram className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 text-muted-foreground">
            {lang === "en" ? "No reels yet" : "अभी कोई रील नहीं"}
          </p>
        </div>
      </div>
    );

  return (
    <div
      className={`${h} snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black no-scrollbar`}
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={goBack}
        aria-label={lang === "en" ? "Back" : "वापस जाएं"}
        className="fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-50 h-11 w-11 rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md shadow-lg hover:bg-black/80"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
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
  );
}
