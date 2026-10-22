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
      { title: "Abhi Tak Live TV — Bijnor" },
      {
        name: "description",
        content: "Watch Abhi Tak live news telecast from District Bijnor, right inside the app.",
      },
      { property: "og:title", content: "Abhi Tak Live TV" },
      {
        property: "og:description",
        content: "Watch Abhi Tak live news telecast from District Bijnor, right inside the app.",
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
    ? (live.data?.title ?? (lang === "hi" ? "अभि तक 24x7 सीधा लाइव प्रसारण" : "Abhi Tak 24x7 Live Broadcast"))
    : latest?.title;
  const [playLatest, setPlayLatest] = useState(false);
  // Browsers only allow autoplay when muted; a tap switches the live stream to sound on.
  const [soundOn, setSoundOn] = useState(false);

  return (
    <div>
      {/* MOBILE VIEW (< 1024px) - 100% UNCHANGED */}
      <div className="lg:hidden min-h-[70vh] bg-ink text-ink-foreground">
        <div className="relative aspect-video w-full bg-ink">
          {isLive && !playLatest ? (
            <LivePlayer
              src={liveStreamUrl}
              title={title ?? "Live"}
              soundOn={soundOn}
              onSoundChange={setSoundOn}
              lang={lang}
            />
          ) : embedId && playLatest ? (
            <iframe
              key={`mobile-bulletin-${embedId}`}
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
                width={480}
                height={270}
                decoding="async"
                fetchPriority="high"
                className="h-full w-full object-cover opacity-90"
              />
              <span className="absolute inset-0 grid place-items-center bg-ink/10">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg group-active:scale-95">
                  <Play className="ml-1 h-6 w-6" fill="currentColor" />
                </span>
              </span>
            </Button>
          ) : (
            <div className="h-full w-full animate-pulse bg-ink-foreground/10" />
          )}
        </div>
        <div className="px-4 py-5">
          {live.isLoading ? null : isLive ? (
            <span className="inline-flex items-center gap-2 bg-primary px-2 py-1 text-[12px] font-bold uppercase tracking-widest text-primary-foreground">
              <span className="h-2 w-2 animate-live rounded-full bg-primary-foreground" />{" "}
              {t("nowLive")}
            </span>
          ) : (
            <div>
              <span className="text-[12px] uppercase tracking-widest text-ink-foreground/50">
                {t("offAir")}
              </span>
              <p className="mt-2 text-[14px] text-ink-foreground/70">
                {lang === "hi"
                  ? "अभी कोई लाइव प्रसारण नहीं है। तब तक नवीनतम वीडियो देखें।"
                  : "No live broadcast right now. Watch our latest video meanwhile."}
              </p>
            </div>
          )}
          {title && <h1 className="mt-3 text-2xl font-bold leading-snug">{title}</h1>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              asChild
              className="h-11 rounded-full bg-youtube px-4 text-[15px] font-semibold text-primary-foreground hover:bg-youtube/90"
            >
              <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer">
                <Youtube className="h-5 w-5" /> {t("ytChannel")}
              </a>
            </Button>
            <Button
              asChild
              variant="glassDark"
              className="h-11 rounded-full px-4 text-[15px] font-semibold"
            >
              <Link to="/videos">{t("videoGalaxy")}</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* DESKTOP VIEW (>= 1024px) - BROADCAST STUDIO LAYOUT */}
      <div className="hidden lg:block min-h-[85vh] bg-ink text-ink-foreground py-8">
        <div className="max-w-7xl mx-auto px-6">
          {/* Studio Header Bar */}
          <div className="mb-6 flex items-center justify-between border-b border-ink-foreground/15 pb-4">
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
                  ? "अभि तक लाइव टीवी — बिजनौर स्टूडियो"
                  : "Abhi Tak Live TV — Bijnor Studio"}
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

          {/* 12-Column Broadcast Theater Grid */}
          <div className="grid grid-cols-12 gap-8">
            {/* Main Broadcast Screen (8 cols) */}
            <div className="col-span-8">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10">
                {isLive && !playLatest ? (
                  <LivePlayer
                    src={liveStreamUrl}
                    title={title ?? "Live"}
                    soundOn={soundOn}
                    onSoundChange={setSoundOn}
                    lang={lang}
                  />
                ) : embedId && playLatest ? (
                  <iframe
                    key={`desktop-bulletin-${embedId}`}
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
                      className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-black/40">
                      <span className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform group-hover:scale-110">
                        <Play className="ml-1.5 h-10 w-10" fill="currentColor" />
                      </span>
                    </span>
                  </Button>
                ) : (
                  <div className="h-full w-full animate-pulse bg-white/10" />
                )}
              </div>

              <div className="mt-5">
                <div className="flex items-center gap-3">
                  {live.isLoading ? null : isLive ? (
                    <span className="inline-flex items-center gap-2 rounded bg-primary px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-primary-foreground">
                      <span className="h-2 w-2 animate-live rounded-full bg-primary-foreground" />
                      {t("nowLive")}
                    </span>
                  ) : (
                    <span className="rounded bg-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                      {t("offAir")} · {lang === "hi" ? "रिकॉर्डेड बुलेटिन" : "Recorded Bulletin"}
                    </span>
                  )}
                  <span className="text-xs text-white/50">District Bijnor Control Center</span>
                </div>

                {title && (
                  <h2 className="mt-3 font-serif text-2xl font-bold leading-snug text-white">
                    {title}
                  </h2>
                )}

                <p className="mt-2 text-sm text-white/70 leading-relaxed">
                  {isLive
                    ? lang === "hi"
                      ? "बिजनौर, नगीना, धामपुर, नजीबाबाद, चांदपुर, स्योहारा और नूरपुर से सीधा लाइव प्रसारण। पल-पल की निष्पक्ष कवरेज।"
                      : "Live broadcasting across District Bijnor. Instant coverage directly from ground newsrooms."
                    : lang === "hi"
                      ? "वर्तमान में कोई लाइव बुलेटिन प्रसारित नहीं हो रहा है। आप ऊपर हमारा नवीनतम जिला बुलेटिन देख सकते हैं।"
                      : "No live broadcast currently active. You can stream our latest district bulletin above."}
                </p>

                <div className="mt-5 flex items-center gap-3">
                  <Button
                    asChild
                    className="rounded-lg bg-youtube px-5 text-sm font-semibold text-white hover:bg-youtube/90"
                  >
                    <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer">
                      <Youtube className="mr-2 h-4 w-4" /> {t("ytChannel")}
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="glassDark"
                    className="rounded-lg px-5 text-sm font-semibold"
                  >
                    <Link to="/videos">
                      <Film className="mr-2 h-4 w-4" /> {t("videoGalaxy")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Studio Telecast Guide & Newsroom Sidebar (4 cols) */}
            <div className="col-span-4 space-y-6">
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
                        {lang === "hi" ? "बिजनौर प्रभात" : "Bijnor Prabhat"}
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
                        {lang === "hi" ? "बिजनौर की बात" : "Bijnor Ki Baat"}
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
                  href="https://wa.me/919412100000?text=Live%20News%20Tip%20District%20Bijnor"
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
    </div>
  );
}
