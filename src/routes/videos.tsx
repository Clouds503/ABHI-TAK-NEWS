import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Youtube } from "lucide-react";
import { YOUTUBE_CHANNEL } from "@/components/AppShell";
import { useI18n, timeAgo } from "@/lib/i18n";
import { Empty } from "@/components/news";
import { videosQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";

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
  const { data: rawVideos, isLoading } = useQuery(videosQuery);

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

  const [activeId, setActiveId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const current = videos.find((v) => v.id === activeId) ?? videos[0];

  return (
    <div className="bg-ink pb-8 text-ink-foreground min-h-screen">
      <div className="px-4 pb-3 pt-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
          Abhi Tak
        </div>
        <h1 className="text-3xl font-bold">{t("videoGalaxy")}</h1>
        <Button
          asChild
          className="mt-3 h-11 rounded-full bg-youtube px-4 text-[15px] font-semibold text-primary-foreground hover:bg-youtube/90 shadow-md"
        >
          <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer">
            <Youtube className="h-5 w-5" /> {t("ytChannel")}
          </a>
        </Button>
      </div>

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
          <div className="px-4 pt-1 text-[12px] text-ink-foreground/55">
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
              <div className="mt-1 text-[12px] text-ink-foreground/55">
                {timeAgo(v.published, lang)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
