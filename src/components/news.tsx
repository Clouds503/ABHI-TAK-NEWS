import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { useI18n, timeAgo } from "@/lib/i18n";
import { img, homeBanner } from "@/lib/media";
import { adsQuery, categoriesQuery, type ArticleCard } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useDoubleTap } from "@/lib/useDoubleTap";
import { HeartPop } from "@/components/HeartPop";
import { QuickShareButton } from "@/components/NewsShareDialog";
import { toggleGuestLike } from "@/lib/guest-likes";
import { trackEngagement } from "@/lib/analytics";

function getCampaignEventEndpoint(): string {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    return "https://abhitak.in/api/public/campaign-event";
  }
  return "/api/public/campaign-event";
}

export function Meta({ a, light }: { a: ArticleCard; light?: boolean }) {
  const { pick, lang } = useI18n();
  const { data: allCats } = useQuery(categoriesQuery);

  const activeCats = (() => {
    if (a.categories && a.categories.length > 0) return a.categories;
    if (a.category_ids && a.category_ids.length > 0 && allCats) {
      const matched = allCats.filter((c) => a.category_ids!.includes(c.id));
      if (matched.length > 0) return matched;
    }
    return a.category ? [a.category] : [];
  })();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 text-[12px]",
        light ? "text-ink-foreground/75" : "text-muted-foreground",
      )}
    >
      {activeCats.length > 0 && (
        <span className="inline-flex flex-wrap items-center gap-1 font-semibold uppercase tracking-wide text-primary">
          {activeCats.map((cat, i) => (
            <span key={cat.slug || i}>
              {pick(cat.name_hi, cat.name_en)}
              {i < activeCats.length - 1 && <span className="opacity-50 mx-1">/</span>}
            </span>
          ))}
        </span>
      )}
      {(a.district || a.town) && (
        <span>· {a.district || pick(a.town?.name_hi, a.town?.name_en)}</span>
      )}
      <span suppressHydrationWarning>· {timeAgo(a.published_at, lang)}</span>
    </div>
  );
}


export function TopHomeBanner({
  banner,
  fallbackImage,
  className,
}: {
  banner?: {
    id?: string;
    image_url: string;
    link_url?: string | null;
    title?: string | null;
    device_visibility?: string | null;
  } | null;
  fallbackImage?: string;
  className?: string;
}) {
  const imageUrl = banner ? (img(banner.image_url) ?? banner.image_url) : (fallbackImage ?? homeBanner);
  if (!imageUrl) return null;

  const content = (
    <div className={cn("relative aspect-[16/9] w-full select-none overflow-hidden bg-muted", className)}>
      <img
        src={imageUrl}
        alt={banner?.title || "Abhitak Banner"}
        width={1200}
        height={675}
        fetchPriority="high"
        decoding="async"
        onError={(event) => {
          if (homeBanner && event.currentTarget.src !== homeBanner) {
            event.currentTarget.src = homeBanner;
          }
        }}
        className="h-full w-full object-cover"
      />
    </div>
  );

  if (banner?.link_url && banner.link_url !== "#") {
    return (
      <a
        href={banner.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full overflow-hidden"
      >
        {content}
      </a>
    );
  }

  return content;
}

export function HeroStory({ a }: { a: ArticleCard }) {
  const { pick, lang } = useI18n();
  const navigate = useNavigate();
  const [heartPop, setHeartPop] = useState<{ show: boolean; x?: number; y?: number }>({
    show: false,
  });

  const gesture = useDoubleTap(
    (_e, point) => {
      setHeartPop({ show: true, x: point.x, y: point.y });
      const nowLiked = toggleGuestLike(a.id);
      if (nowLiked) {
        toast.success(
          lang === "en"
            ? "Liked! Sign in to sync across devices."
            : "पसंद किया गया! सहेजने के लिए साइन इन करें।",
        );
      }
      void trackEngagement("double_tap", "article", a.id);
      void trackEngagement("like", "article", a.id);
    },
    {
      latency: 280,
      onSingleTap: () => {
        void navigate({ to: "/news/$slug", params: { slug: a.slug } });
      },
    },
  );

  return (
    <div className="relative block">
      <HeartPop
        show={heartPop.show}
        x={heartPop.x}
        y={heartPop.y}
        onAnimationEnd={() => setHeartPop({ show: false })}
      />
      <div
        {...gesture}
        className="relative aspect-[16/9] w-full cursor-pointer select-none overflow-hidden bg-muted"
      >
        <img
          src={img(a.cover_url) ?? "/pwa-512.png"}
          alt=""
          width={1200}
          height={675}
          fetchPriority="high"
          decoding="async"
          onError={(event) => {
            event.currentTarget.src = "/pwa-512.png";
            event.currentTarget.classList.add("object-contain");
          }}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        {a.is_breaking && (
          <span className="absolute left-4 top-4 bg-primary px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-primary-foreground">
            Breaking
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4 text-ink-foreground">
          <Meta a={a} light />
          <h1 className="mt-2 text-[26px] font-bold leading-[1.25]">
            {pick(a.title_hi, a.title_en)}
          </h1>
          <p className="mt-2 line-clamp-2 text-[15px] text-ink-foreground/80">
            {pick(a.summary_hi, a.summary_en)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ArticleRow({ a, index }: { a: ArticleCard; index?: number }) {
  const { pick, lang } = useI18n();
  const navigate = useNavigate();
  const [heartPop, setHeartPop] = useState<{ show: boolean; x?: number; y?: number }>({
    show: false,
  });

  const imgGesture = useDoubleTap(
    (_e, point) => {
      setHeartPop({ show: true, x: point.x, y: point.y });
      const nowLiked = toggleGuestLike(a.id);
      if (nowLiked) {
        toast.success(
          lang === "en"
            ? "Liked! Sign in to sync across devices."
            : "पसंद किया गया! सहेजने के लिए साइन इन करें।",
        );
      }
      void trackEngagement("double_tap", "article", a.id);
      void trackEngagement("like", "article", a.id);
    },
    {
      latency: 280,
      onSingleTap: () => {
        void navigate({ to: "/news/$slug", params: { slug: a.slug } });
      },
    },
  );

  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b px-4 py-4 active:bg-muted/50">
      <HeartPop
        show={heartPop.show}
        x={heartPop.x}
        y={heartPop.y}
        onAnimationEnd={() => setHeartPop({ show: false })}
      />
      <Link to="/news/$slug" params={{ slug: a.slug }} className="min-w-0">
        {index !== undefined && (
          <div className="font-serif text-sm font-bold text-primary">
            {String(index + 1).padStart(2, "0")}
          </div>
        )}
        <h3 className="line-clamp-3 text-[17px] font-bold leading-snug">
          {pick(a.title_hi, a.title_en)}
        </h3>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Meta a={a} />
          <QuickShareButton
            article={{
              id: a.id,
              title: pick(a.title_hi, a.title_en),
              summary: pick(a.summary_hi, a.summary_en),
              slug: a.slug,
              coverUrl: a.cover_url,
            }}
          />
        </div>
      </Link>
      <div
        {...imgGesture}
        className="relative h-24 w-24 shrink-0 cursor-pointer select-none overflow-hidden rounded-md bg-muted sm:h-28 sm:w-28"
      >
        <img
          src={img(a.cover_url) ?? "/pwa-192.png"}
          alt=""
          width={112}
          height={112}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.src = "/pwa-192.png";
            event.currentTarget.classList.add("object-contain");
          }}
          className="aspect-square h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

export function FeatureCard({ a }: { a: ArticleCard }) {
  const { pick, lang } = useI18n();
  const navigate = useNavigate();
  const [heartPop, setHeartPop] = useState<{ show: boolean; x?: number; y?: number }>({
    show: false,
  });

  const gesture = useDoubleTap(
    (_e, point) => {
      setHeartPop({ show: true, x: point.x, y: point.y });
      const nowLiked = toggleGuestLike(a.id);
      if (nowLiked) {
        toast.success(
          lang === "en"
            ? "Liked! Sign in to sync across devices."
            : "पसंद किया गया! सहेजने के लिए साइन इन करें।",
        );
      }
      void trackEngagement("double_tap", "article", a.id);
      void trackEngagement("like", "article", a.id);
    },
    {
      latency: 280,
      onSingleTap: () => {
        void navigate({ to: "/news/$slug", params: { slug: a.slug } });
      },
    },
  );

  return (
    <div className="relative block w-[78%] shrink-0 snap-start">
      <HeartPop
        show={heartPop.show}
        x={heartPop.x}
        y={heartPop.y}
        onAnimationEnd={() => setHeartPop({ show: false })}
      />
      <div
        {...gesture}
        className="relative aspect-[16/9] w-full cursor-pointer select-none overflow-hidden rounded-lg bg-muted"
      >
        <img
          src={img(a.cover_url) ?? "/pwa-512.png"}
          alt=""
          width={640}
          height={360}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.src = "/pwa-512.png";
            event.currentTarget.classList.add("object-contain");
          }}
          className="h-full w-full object-cover"
        />
      </div>
      <Link to="/news/$slug" params={{ slug: a.slug }} className="block">
        <div className="mt-2 flex items-center justify-between gap-2">
          <Meta a={a} />
          <QuickShareButton
            article={{
              id: a.id,
              title: pick(a.title_hi, a.title_en),
              summary: pick(a.summary_hi, a.summary_en),
              slug: a.slug,
              coverUrl: a.cover_url,
            }}
          />
        </div>
        <h3 className="mt-1 line-clamp-2 text-[17px] font-bold leading-snug">
          {pick(a.title_hi, a.title_en)}
        </h3>
      </Link>
    </div>
  );
}

export function Ticker({ items }: { items: ArticleCard[] }) {
  const { pick, t } = useI18n();
  if (!items.length) return null;
  const list = [...items, ...items];
  return (
    <div className="flex h-10 items-stretch overflow-hidden bg-ink text-ink-foreground">
      <div className="relative z-10 flex shrink-0 items-center gap-1.5 bg-primary pl-4 pr-3 text-[12px] font-bold uppercase tracking-widest text-primary-foreground">
        <span className="h-2 w-2 animate-live rounded-full bg-primary-foreground" /> {t("breaking")}
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="animate-ticker flex h-full w-max items-center">
          {list.map((a, i) => (
            <Link
              key={i}
              to="/news/$slug"
              params={{ slug: a.slug }}
              className="flex items-center whitespace-nowrap px-4 text-[14px]"
            >
              <span className="mr-4 text-primary">◆</span>
              {pick(a.title_hi, a.title_en)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function getAdSizingStyles(
  placement: string,
  aspectRatio?: string | null,
  autoSizing: boolean = true,
) {
  const ratio = aspectRatio || "auto";

  if (ratio === "auto") {
    switch (placement) {
      case "sidebar_ad":
        return {
          containerClass: "w-full max-w-[360px] mx-auto min-h-[200px] aspect-[4/3] sm:aspect-square md:aspect-auto",
          mediaClass: autoSizing ? "w-full h-auto max-h-[380px] object-contain" : "w-full h-full object-cover",
        };
      case "header_banner":
        return {
          containerClass: "w-full aspect-[8/1] min-h-[50px] max-h-[120px]",
          mediaClass: autoSizing ? "w-full h-auto max-h-[120px] object-contain" : "w-full h-full object-cover",
        };
      case "home_top":
        return {
          containerClass: "w-full aspect-[16/9] md:aspect-[3/1] max-h-[420px]",
          mediaClass: autoSizing ? "w-full h-auto max-h-[420px] object-contain md:object-cover" : "w-full h-full object-cover",
        };
      case "article_inline":
        return {
          containerClass: "w-full aspect-[16/9] max-h-[380px]",
          mediaClass: autoSizing ? "w-full h-auto max-h-[380px] object-contain" : "w-full h-full object-cover",
        };
      case "jan_ki_awaaz":
      case "home_inline":
      default:
        return {
          containerClass: "w-full aspect-[16/9] md:aspect-[3/1] max-h-[340px]",
          mediaClass: autoSizing ? "w-full h-auto max-h-[340px] object-contain md:object-cover" : "w-full h-full object-cover",
        };
    }
  }

  switch (ratio) {
    case "16:9":
      return {
        containerClass: "w-full aspect-video",
        mediaClass: autoSizing ? "w-full h-full object-contain" : "w-full h-full object-cover",
      };
    case "3:1":
      return {
        containerClass: "w-full aspect-[3/1]",
        mediaClass: autoSizing ? "w-full h-full object-contain" : "w-full h-full object-cover",
      };
    case "1:1":
      return {
        containerClass: "w-full aspect-square max-w-[400px] mx-auto",
        mediaClass: autoSizing ? "w-full h-full object-contain" : "w-full h-full object-cover",
      };
    case "4:3":
      return {
        containerClass: "w-full aspect-[4/3] max-w-[480px] mx-auto",
        mediaClass: autoSizing ? "w-full h-full object-contain" : "w-full h-full object-cover",
      };
    case "8:1":
      return {
        containerClass: "w-full aspect-[8/1] min-h-[50px]",
        mediaClass: autoSizing ? "w-full h-full object-contain" : "w-full h-full object-cover",
      };
    default:
      return {
        containerClass: "w-full aspect-[16/9] md:aspect-[3/1]",
        mediaClass: "w-full h-full object-cover",
      };
  }
}

export function AdSlot({
  placement,
  className,
  device,
}: {
  placement: string;
  className?: string;
  device?: "mobile" | "desktop" | "all";
}) {
  const { t } = useI18n();
  const { data } = useQuery(adsQuery(placement));

  // Match ad according to device target if specified, otherwise pick first eligible ad
  const ad = device
    ? data?.find((item) =>
        device === "mobile"
          ? item.device_visibility === "mobile" || item.device_visibility === "all"
          : device === "desktop"
            ? item.device_visibility === "desktop" || item.device_visibility === "all"
            : true,
      ) ?? data?.[0]
    : data?.[0];

  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ad?.id || !adRef.current || typeof window === "undefined") return;
    const sessionKey = `abhitak.ad.impression.${ad.id}`;
    if (window.sessionStorage.getItem(sessionKey)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5))
          return;
        window.sessionStorage.setItem(sessionKey, "1");
        void fetch(getCampaignEventEndpoint(), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ campaignId: ad.id, event: "impression" }),
          keepalive: true,
        });
        observer.disconnect();
      },
      { threshold: 0.5 },
    );

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [ad?.id]);

  if (!ad) return null;

  const recordClick = () => {
    void fetch(getCampaignEventEndpoint(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campaignId: ad.id, event: "click" }),
      keepalive: true,
    });
  };

  // Determine responsive visibility based on ad.device_visibility unless explicitly targeted via prop
  const responsiveClass =
    device === undefined
      ? ad.device_visibility === "mobile"
        ? "lg:hidden"
        : ad.device_visibility === "desktop"
          ? "hidden lg:block"
          : ""
      : "";

  const isAutoSizing = (ad as any).auto_sizing !== false;
  const sizing = getAdSizingStyles(placement, (ad as any).aspect_ratio, isAutoSizing);

  return (
    <div ref={adRef} className={cn("mx-4 my-6", responsiveClass, className)}>
      <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
        <span>{ad.campaign_type === "promotion" ? "Promotion" : t("advertisement")}</span>
        {ad.advertiser && <span className="text-[9px] text-muted-foreground/75">{ad.advertiser}</span>}
      </div>
      <a
        href={ad.link_url ?? "#"}
        target="_blank"
        rel="noopener sponsored"
        onClick={recordClick}
        className={cn(
          "relative block overflow-hidden rounded-xl border bg-ink shadow-xs hover:opacity-95 transition-all flex items-center justify-center",
          sizing.containerClass,
        )}
      >
        {ad.media_type === "video" && ad.video_url ? (
          <video
            src={ad.video_url}
            poster={img(ad.image_url)}
            muted
            autoPlay
            loop
            playsInline
            preload="none"
            className={cn(sizing.mediaClass)}
          />
        ) : (
          <img
            src={img(ad.image_url)}
            alt={ad.title}
            width={1200}
            height={600}
            loading="lazy"
            decoding="async"
            className={cn(sizing.mediaClass)}
          />
        )}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/90 via-ink/25 to-transparent p-4 text-ink-foreground pointer-events-none">
          <div className="text-[11px] uppercase tracking-widest text-ink-foreground/75 font-semibold">
            {ad.campaign_type === "promotion" ? "Promotion" : ad.advertiser}
          </div>
          <div className="mt-1 max-w-[85%] text-base sm:text-lg font-bold leading-tight drop-shadow-xs">{ad.title}</div>
        </div>
      </a>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const { status: label } = useI18n();
  const tone: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    approved: "bg-secondary text-secondary-foreground",
    forwarded: "bg-accent text-accent-foreground",
    in_progress: "bg-warning/15 text-warning",
    resolved: "bg-success/15 text-success",
    rejected: "bg-destructive/10 text-destructive",
    archived: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone[status],
      )}
    >
      {label(status)}
    </span>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="px-4 py-16 text-center text-muted-foreground">{text}</div>;
}
