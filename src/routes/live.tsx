import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { YOUTUBE_CHANNEL } from "@/components/AppShell";
import { Play, Youtube } from "lucide-react";
import { getLiveStatus, getChannelVideos } from "@/lib/youtube.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Abhi Tak Live TV — Bijnor" },
      { name: "description", content: "Watch Abhi Tak live news telecast from District Bijnor, right inside the app." },
      { property: "og:title", content: "Abhi Tak Live TV" },
      { property: "og:description", content: "Watch Abhi Tak live news telecast from District Bijnor, right inside the app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Live,
});

function Live() {
  const { t, lang } = useI18n();
  const fetchLive = useServerFn(getLiveStatus);
  const fetchVideos = useServerFn(getChannelVideos);
  const live = useQuery({ queryKey: ["yt-live"], queryFn: () => fetchLive(), refetchInterval: 2 * 60 * 1000 });
  const videos = useQuery({ queryKey: ["yt-videos"], queryFn: async () => { const r = await fetchVideos(); if (!r.length) throw new Error("no videos"); return r; }, staleTime: 10 * 60 * 1000, retry: 3, enabled: live.data?.live === false });
  const isLive = !!live.data?.live && !!live.data.videoId;
  const latest = videos.data?.[0];
  const embedId = isLive ? live.data?.videoId : latest?.id;
  const title = isLive ? live.data?.title : latest?.title;
  const [playLatest, setPlayLatest] = useState(false);
  // Browsers only allow autoplay when muted; a tap switches the live stream to sound on.
  const [soundOn, setSoundOn] = useState(false);

  return (
    <div className="min-h-[70vh] bg-ink text-ink-foreground">
      <div className="relative aspect-video w-full bg-ink">
        {embedId && (isLive || playLatest) ? (
          <>
            <iframe
              key={`${embedId}-${soundOn}`}
              src={`https://www.youtube-nocookie.com/embed/${embedId}?playsinline=1&rel=0${isLive ? `&autoplay=1${soundOn ? "" : "&mute=1"}` : ""}`}
              title={title ?? "Live"}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
            {isLive && !soundOn && (
              <button
                type="button"
                onClick={() => setSoundOn(true)}
                className="absolute bottom-3 right-3 rounded-full bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground shadow-lg"
              >
                {lang === "hi" ? "🔊 आवाज़ चालू करें" : "🔊 Tap for sound"}
              </button>
            )}
          </>
        ) : latest ? (
          <Button type="button" variant="ghost" onClick={() => setPlayLatest(true)} aria-label={`${latest.title} चलाएँ`} className="group relative h-full w-full rounded-none p-0 hover:bg-transparent">
            <img src={latest.thumb} alt="" width={480} height={270} decoding="async" fetchPriority="high" className="h-full w-full object-cover opacity-90" />
            <span className="absolute inset-0 grid place-items-center bg-ink/10">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg group-active:scale-95"><Play className="ml-1 h-6 w-6" fill="currentColor" /></span>
            </span>
          </Button>
        ) : (
          <div className="h-full w-full animate-pulse bg-ink-foreground/10" />
        )}
      </div>
      <div className="px-4 py-5">
        {live.isLoading ? null : isLive ? (
          <span className="inline-flex items-center gap-2 bg-primary px-2 py-1 text-[12px] font-bold uppercase tracking-widest text-primary-foreground">
            <span className="h-2 w-2 animate-live rounded-full bg-primary-foreground" /> {t("nowLive")}
          </span>
        ) : (
          <div>
            <span className="text-[12px] uppercase tracking-widest text-ink-foreground/50">{t("offAir")}</span>
            <p className="mt-2 text-[14px] text-ink-foreground/70">
              {lang === "hi" ? "अभी कोई लाइव प्रसारण नहीं है। तब तक नवीनतम वीडियो देखें।" : "No live broadcast right now. Watch our latest video meanwhile."}
            </p>
          </div>
        )}
        {title && <h1 className="mt-3 text-2xl font-bold leading-snug">{title}</h1>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild className="h-11 rounded-full bg-youtube px-4 text-[15px] font-semibold text-primary-foreground hover:bg-youtube/90">
            <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer"><Youtube className="h-5 w-5" /> {t("ytChannel")}</a>
          </Button>
          {!isLive && (
            <Button asChild variant="glassDark" className="h-11 rounded-full px-4 text-[15px] font-semibold"><Link to="/videos">{t("videoGalaxy")}</Link></Button>
          )}
        </div>
      </div>
    </div>
  );
}
