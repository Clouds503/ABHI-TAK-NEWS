import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Instagram, Pause, Play, Volume2, VolumeX, VideoOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { getInstagramReelMedia } from "@/lib/instagram.functions";
import { Button } from "@/components/ui/button";

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

function Fallback({ lang }: { lang: string | null }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-foreground p-8 text-center text-background">
      <div>
        <VideoOff className="mx-auto h-10 w-10 opacity-80" />
        <p className="mt-3 font-semibold">{lang === "en" ? "This reel can't play here" : "यह रील यहाँ नहीं चल पा रही"}</p>
        <p className="mt-1 text-sm opacity-70">{lang === "en" ? "Swipe up for the next reel" : "अगली रील के लिए ऊपर स्वाइप करें"}</p>
      </div>
    </div>
  );
}

function VideoReel({ reel, src, active, lang }: { reel: Reel; src: string; active: boolean; lang: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsSound, setNeedsSound] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  // Keep the video element's audio state in sync with the on-screen control.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = muted;
    if (!muted) setNeedsSound(false);
  }, [muted]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (!active) { v.pause(); return; }
    v.currentTime = 0;
    v.muted = false;
    v.play()
      .then(() => { setPaused(false); setMuted(false); })
      .catch(() => {
        // Some phones refuse to start sound on their own: begin quietly and ask for one tap.
        v.muted = true;
        setMuted(true);
        setNeedsSound(true);
        v.play().then(() => setPaused(false)).catch(() => setPaused(true));
      });
  }, [active]);

  const enableSound = () => {
    const v = ref.current;
    setMuted(false);
    setNeedsSound(false);
    if (v) { v.muted = false; void v.play().then(() => setPaused(false)).catch(() => setPaused(true)); }
  };

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { void v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
    setFlash(true);
    window.setTimeout(() => setFlash(false), 600);
  };

  if (failed) return <Fallback lang={lang} />;
  return (
    <>
      <video ref={ref} src={src} className="h-full w-full object-contain" playsInline loop muted={muted} preload={active ? "auto" : "metadata"} onError={() => setFailed(true)} onClick={toggle} />
      {(paused || flash) && (
        <Button type="button" variant="ghost" onClick={toggle} aria-label={paused ? "Play" : "Pause"} className="absolute inset-0 grid h-full w-full place-items-center rounded-none p-0 hover:bg-transparent">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-foreground/50 text-background">
            {paused ? <Play className="h-9 w-9 fill-current" /> : <Pause className="h-9 w-9 fill-current" />}
          </span>
        </Button>
      )}
      {needsSound && (
        <Button type="button" onClick={enableSound} aria-label={lang === "en" ? "Turn on sound" : "आवाज़ चालू करें"}
          className="absolute bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] right-4 h-11 gap-2 rounded-full bg-primary px-4 text-background shadow-lg">
          <Volume2 className="h-5 w-5" />
          <span className="text-sm font-semibold">{lang === "en" ? "Turn on sound" : "आवाज़ चालू करें"}</span>
        </Button>
      )}
      <Button type="button" variant="secondary" size="icon" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 h-11 w-11 rounded-full">
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </Button>
      {reel.caption && <p className="pointer-events-none absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-4 right-20 line-clamp-3 text-sm font-medium text-background drop-shadow">{reel.caption}</p>}
    </>
  );
}

function ResolvedReel({ reel, active, lang }: { reel: Reel; active: boolean; lang: string | null }) {
  const resolveMedia = useServerFn(getInstagramReelMedia);
  const { data, isLoading } = useQuery({
    queryKey: ["instagram-reel-media", reel.shortcode],
    queryFn: () => resolveMedia({ data: { shortcode: reel.shortcode } }),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const src = reel.video_url ?? data?.videoUrl;

  if (isLoading) return <div className="absolute inset-0 grid place-items-center bg-foreground text-background" aria-label={lang === "en" ? "Loading reel" : "रील लोड हो रही है"}>…</div>;
  if (!src) return <Fallback lang={lang} />;
  return <VideoReel reel={reel} src={src} active={active} lang={lang} />;
}

function ReelsPage() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const { data: reels, isLoading } = useQuery({
    queryKey: ["reels"],
    queryFn: async () => {
      const { data } = await supabase.from("reels").select("id, shortcode, caption, video_url").eq("is_active", true)
        .order("sort_order", { ascending: false }).order("created_at", { ascending: false });
      return (data ?? []) as Reel[];
    },
  });
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset["i"])); });
    }, { threshold: 0.6 });
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [reels]);

  const goBack = () => {
    if (window.history.length > 1) { window.history.back(); return; }
    void navigate({ to: "/" });
  };

  const h = "h-[100dvh]";
  if (isLoading) return <div className={`${h} grid place-items-center text-muted-foreground`}>…</div>;
  if (!reels?.length)
    return (
      <div className={`${h} grid place-items-center p-6 text-center`}>
        <div>
          <Instagram className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 text-muted-foreground">{lang === "en" ? "No reels yet" : "अभी कोई रील नहीं"}</p>
        </div>
      </div>
    );

  return (
    <div className={`${h} snap-y snap-mandatory overflow-y-auto overscroll-contain bg-foreground no-scrollbar`}>
      <Button type="button" variant="secondary" size="icon" onClick={goBack} aria-label={lang === "en" ? "Back" : "वापस जाएं"}
        className="fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-50 h-11 w-11 rounded-full border shadow-lg">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      {reels.map((r, i) => (
        <div key={r.id} data-i={i} ref={(el) => { refs.current[i] = el; }} className="relative flex h-full snap-start snap-always items-center justify-center bg-foreground">
          {Math.abs(i - active) <= 1 ? (
            <ResolvedReel reel={r} active={i === active} lang={lang} />
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
      ))}
    </div>
  );
}
