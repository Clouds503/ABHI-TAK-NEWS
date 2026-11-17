import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { YOUTUBE_CHANNEL } from "@/components/AppShell";
import { Play, Youtube, Clock, Film } from "lucide-react";
import { getLiveStatus, getChannelVideos, LIVE_CHANNEL_STREAM_URL } from "@/lib/youtube.functions";
import { LivePlayer } from "@/components/LivePlayer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Abhitak Live TV" },
      {
        name: "description",
        content: "Watch Abhitak live news telecast, right inside the app.",
      },
      { property: "og:title", content: "Abhitak Live TV" },
      {
        property: "og:description",
        content: "Watch Abhitak live news telecast, right inside the app.",
      },
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
  const live = useQuery({
    queryKey: ["yt-live"],
    queryFn: () => fetchLive(),
    refetchInterval: 2 * 60 * 1000,
  });
  const videos = useQuery({
    queryKey: ["yt-videos"],
    queryFn: async () => {
      const r = await fetchVideos();
      if (!r.length) throw new Error("no videos");
      return r;
    },
    staleTime: 10 * 60 * 1000,
    retry: 3,
    enabled: live.data?.live === false,
  });

  const isLive = live.data?.live ?? true;
  const liveStreamUrl = live.data?.streamUrl ?? LIVE_CHANNEL_STREAM_URL;
  const latest = videos.data?.[0];
  const embedId = latest?.id;
  const title = isLive
    ? (live.data?.title ?? (lang === "hi" ? "अभी तक 24x7 सीधा लाइव प्रसारण" : "Abhitak 24x7 Live Broadcast"))
    : latest?.title;
  const [playLatest, setPlayLatest] = useState(false);
  // Browsers only allow autoplay when muted; a tap switches the live stream to sound on.
  const [soundOn, setSoundOn] = useState(false);

  return (
    <div className="min-h-[70vh] lg:min-h-[85vh] bg-ink text-ink-foreground py-0 lg:py-8">
      <div className="max-w-7xl mx-auto px-0 lg:px-6">
        {/* Studio Header Bar (Desktop only) */}
        <div className="hidden lg:flex mb-6 items-center justify-between border-b border-ink-foreground/15 pb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-75",
                  isLive ? "animate-ping bg-red-500" : "bg-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-3 w-3 rounded-full",
                  isLive ? "bg-red-600" : "bg-muted-foreground",
                )}
              />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-white">
              {lang === "hi"
                ? "अभी तक लाइव टीवी — न्यूज़रूम स्टूडियो"
                : "Abhitak Live TV — Newsroom Studio"}
            </h1>
            <span className="rounded bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/80">
              24x7 Broadcast
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              asChild
              size="sm"
              className="rounded-full bg-youtube px-4 text-xs font-semibold text-white hover:bg-youtube/90"
            >
              <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer">
                <Youtube className="mr-1.5 h-4 w-4" /> {t("ytChannel")}
              </a>
            </Button>
          </div>
        </div>

        {/* 12-Column Responsive Broadcast Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8">
          {/* Main Broadcast Screen & Controls (12 cols on mobile, 8 cols on desktop) */}
          <div className="col-span-1 lg:col-span-8">
            <div className="relative aspect-video w-full bg-black lg:overflow-hidden lg:rounded-xl lg:shadow-2xl lg:ring-1 lg:ring-white/10">
              {isLive && !playLatest ? (
                <LivePlayer
                  src={liveStreamUrl}
                  title={title ?? "Live"}
                  soundOn={soundOn}
                  onSoundChange={setSoundOn}
                  lang={lang === "en" ? "en" : "hi"}
                />
              ) : embedId && playLatest ? (
                <iframe
                  key={`bulletin-${embedId}`}
                  src={`https://www.youtube-nocookie.com/embed/${embedId}?playsinline=1&rel=0&autoplay=1`}
                  title={latest?.title ?? "Recorded Bulletin"}
                  className="h-full w-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : latest ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPlayLatest(true)}
                  aria-label={`${latest.title} चलाएँ`}
                  className="group relative h-full w-full rounded-none p-0 hover:bg-transparent"
                >
                  <img
                    src={latest.thumb}
                    alt=""
                    width={1280}
                    height={720}
                    decoding="async"
                    fetchPriority="high"
                    className="h-full w-full object-cover opacity-90 transition-transform duration-500 lg:group-hover:scale-105"
                  />
                  <span className="absolute inset-0 grid place-items-center bg-black/40">
                    <span className="grid h-14 w-14 lg:h-20 lg:w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform lg:group-hover:scale-110 group-active:scale-95">
                      <Play className="ml-1 lg:ml-1.5 h-6 w-6 lg:h-10 lg:w-10" fill="currentColor" />
                    </span>
                  </span>
                </Button>
              ) : (
                <div className="h-full w-full animate-pulse bg-white/10" />
              )}
            </div>

            <div className="px-4 py-5 lg:px-0 lg:mt-5">
              <div className="flex items-center gap-3">
                {live.isLoading ? null : isLive ? (
                  <span className="inline-flex items-center gap-2 rounded bg-primary px-2 lg:px-2.5 py-1 text-[12px] lg:text-xs font-bold uppercase tracking-widest text-primary-foreground">
                    <span className="h-2 w-2 animate-live rounded-full bg-primary-foreground" />
                    {t("nowLive")}
                  </span>
                ) : (
                  <span className="rounded bg-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                    {t("offAir")} <span className="hidden lg:inline">· {lang === "hi" ? "रिकॉर्डेड बुलेटिन" : "Recorded Bulletin"}</span>
                  </span>
                )}
                <span className="hidden lg:inline text-xs text-white/50">Newsroom Control Center</span>
              </div>

              {!isLive && !live.isLoading && (
                <p className="mt-2 text-[14px] text-ink-foreground/70 lg:hidden">
                  {lang === "hi"
                    ? "अभी कोई लाइव प्रसारण नहीं है। तब तक नवीनतम वीडियो देखें।"
                    : "No live broadcast right now. Watch our latest video meanwhile."}
                </p>
              )}

              {title && (
                <h1 className="mt-3 font-serif text-2xl font-bold leading-snug text-white">
                  {title}
                </h1>
              )}

              <p className="hidden lg:block mt-2 text-sm text-white/70 leading-relaxed">
                {isLive
                  ? lang === "hi"
                    ? "नगीना, धामपुर, नजीबाबाद, चांदपुर, स्योहारा और नूरपुर से सीधा लाइव प्रसारण। पल-पल की निष्पक्ष कवरेज।"
                    : "Live broadcasting. Instant coverage directly from ground newsrooms."
                  : lang === "hi"
                    ? "वर्तमान में कोई लाइव बुलेटिन प्रसारित नहीं हो रहा है। आप ऊपर हमारा नवीनतम बुलेटिन देख सकते हैं।"
                    : "No live broadcast currently active. You can stream our latest bulletin above."}
              </p>

              <div className="mt-4 lg:mt-5 flex flex-wrap items-center gap-2 lg:gap-3">
                <Button
                  asChild
                  className="h-11 rounded-full lg:rounded-lg bg-youtube px-4 lg:px-5 text-[15px] lg:text-sm font-semibold text-primary-foreground hover:bg-youtube/90"
                >
                  <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer">
                    <Youtube className="mr-2 h-5 w-5 lg:h-4 lg:w-4" /> {t("ytChannel")}
                  </a>
                </Button>
                <Button
                  asChild
                  variant="glassDark"
                  className="h-11 rounded-full lg:rounded-lg px-4 lg:px-5 text-[15px] lg:text-sm font-semibold"
                >
                  <Link to="/videos">
                    <Film className="mr-2 h-5 w-5 lg:h-4 lg:w-4" /> {t("videoGalaxy")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Studio Telecast Guide & Newsroom Sidebar (4 cols on desktop, hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-4 space-y-6">
            {/* Telecast Schedule */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">
                  {lang === "hi" ? "दैनिक प्रसारण समय-सारणी" : "Daily Broadcast Schedule"}
                </h3>
              </div>
              <div className="mt-4 space-y-3.5">
                <div className="flex items-start justify-between rounded-lg bg-white/5 p-3">
                  <div>
                    <div className="font-semibold text-sm text-white">
                      {lang === "hi" ? "प्रभात समाचार" : "Prabhat Samachar"}
                    </div>
                    <div className="text-xs text-white/60">
                      {lang === "hi"
                        ? "सुबह का मुख्य प्रादेशिक व जिला बुलेटिन"
                        : "Morning district news briefing"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded bg-primary/20 px-2 py-0.5 text-xs font-mono font-bold text-primary">
                    08:00 AM
                  </span>
                </div>

                <div className="flex items-start justify-between rounded-lg bg-white/5 p-3">
                  <div>
                    <div className="font-semibold text-sm text-white">
                      {lang === "hi" ? "दोपहर जिला हलचल" : "Afternoon District Pulse"}
                    </div>
                    <div className="text-xs text-white/60">
                      {lang === "hi"
                        ? "तहसीलों और कस्बों से ताज़ा अपडेट"
                        : "Town & administrative updates"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-xs font-mono font-semibold text-white/80">
                    01:00 PM
                  </span>
                </div>

                <div className="flex items-start justify-between rounded-lg bg-white/5 p-3">
                  <div>
                    <div className="font-semibold text-sm text-white">
                      {lang === "hi" ? "आज की बात" : "Aaj Ki Baat"}
                    </div>
                    <div className="text-xs text-white/60">
                      {lang === "hi"
                        ? "प्राइम टाइम जन-मुद्दे व बड़ी बहस"
                        : "Prime time debate & civic matters"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded bg-primary/20 px-2 py-0.5 text-xs font-mono font-bold text-primary">
                    07:00 PM
                  </span>
                </div>

                <div className="flex items-start justify-between rounded-lg bg-white/5 p-3">
                  <div>
                    <div className="font-semibold text-sm text-white">
                      {lang === "hi" ? "रात्रि मुख्य समाचार" : "Night Headliners"}
                    </div>
                    <div className="text-xs text-white/60">
                      {lang === "hi"
                        ? "दिनभर की सभी बड़ी घटनाओं का सार"
                        : "Comprehensive daily roundup"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-xs font-mono font-semibold text-white/80">
                    09:30 PM
                  </span>
                </div>
              </div>
            </div>

            {/* Breaking Tip-line & Reporter Desk */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-bold text-sm uppercase tracking-wider text-white">
                {lang === "hi" ? "लाइव न्यूज़ डेस्क हेल्पलाइन" : "Live News Desk Tip-line"}
              </h3>
              <p className="mt-2 text-xs text-white/70 leading-relaxed">
                {lang === "hi"
                  ? "क्या आपके क्षेत्र में कोई बड़ी घटना या जन-समस्या है? हमारे 24x7 न्यूज़रूम को सीधे WhatsApp पर वीडियो या सूचना भेजें।"
                  : "Have a breaking story or civic emergency in your area? Send footage or tips to our 24x7 newsroom."}
              </p>
              <a
                href="https://wa.me/919412100000?text=Live%20News%20Tip"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                WhatsApp Newsroom Desk
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
