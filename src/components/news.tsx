import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useI18n, timeAgo } from "@/lib/i18n";
import { img } from "@/lib/media";
import { adsQuery, type ArticleCard } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function Meta({ a, light }: { a: ArticleCard; light?: boolean }) {
  const { pick, lang } = useI18n();
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 text-[12px]", light ? "text-ink-foreground/75" : "text-muted-foreground")}>
      {a.category && <span className="font-semibold uppercase tracking-wide text-primary">{pick(a.category.name_hi, a.category.name_en)}</span>}
      {a.town && <span>· {pick(a.town.name_hi, a.town.name_en)}</span>}
      <span>· {timeAgo(a.published_at, lang)}</span>
    </div>
  );
}

export function HeroStory({ a }: { a: ArticleCard }) {
  const { pick } = useI18n();
  return (
    <Link to="/news/$slug" params={{ slug: a.slug }} className="relative block">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink">
        <img src={img(a.cover_url) ?? "/pwa-512.png"} alt="" width={800} height={600} fetchPriority="high" decoding="async" onError={(event) => { event.currentTarget.src = "/pwa-512.png"; event.currentTarget.classList.add("object-contain"); }} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        {a.is_breaking && (
          <span className="absolute left-4 top-4 bg-primary px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-primary-foreground">Breaking</span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4 text-ink-foreground">
          <Meta a={a} light />
          <h1 className="mt-2 text-[26px] font-bold leading-[1.25]">{pick(a.title_hi, a.title_en)}</h1>
          <p className="mt-2 line-clamp-2 text-[15px] text-ink-foreground/80">{pick(a.summary_hi, a.summary_en)}</p>
        </div>
      </div>
    </Link>
  );
}

export function ArticleRow({ a, index }: { a: ArticleCard; index?: number }) {
  const { pick } = useI18n();
  return (
    <Link to="/news/$slug" params={{ slug: a.slug }} className="grid grid-cols-[minmax(0,1fr)_104px] gap-4 border-b px-4 py-4 active:bg-muted">
      <div className="min-w-0">
        {index !== undefined && <div className="font-serif text-sm font-bold text-primary">{String(index + 1).padStart(2, "0")}</div>}
        <h3 className="line-clamp-3 text-[17px] font-bold leading-snug">{pick(a.title_hi, a.title_en)}</h3>
        <div className="mt-2"><Meta a={a} /></div>
      </div>
      <img src={img(a.cover_url) ?? "/pwa-192.png"} alt="" width={104} height={104} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.src = "/pwa-192.png"; event.currentTarget.classList.add("object-contain"); }} className="aspect-square w-[104px] rounded-sm object-cover" />
    </Link>
  );
}

export function FeatureCard({ a }: { a: ArticleCard }) {
  const { pick } = useI18n();
  return (
    <Link to="/news/$slug" params={{ slug: a.slug }} className="block w-[78%] shrink-0 snap-start">
      <img src={img(a.cover_url) ?? "/pwa-512.png"} alt="" width={360} height={225} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.src = "/pwa-512.png"; event.currentTarget.classList.add("object-contain"); }} className="aspect-[16/10] w-full rounded-sm object-cover" />
      <div className="mt-2"><Meta a={a} /></div>
      <h3 className="mt-1 line-clamp-2 text-[17px] font-bold leading-snug">{pick(a.title_hi, a.title_en)}</h3>
    </Link>
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
            <Link key={i} to="/news/$slug" params={{ slug: a.slug }} className="flex items-center whitespace-nowrap px-4 text-[14px]">
              <span className="mr-4 text-primary">◆</span>{pick(a.title_hi, a.title_en)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdSlot({ placement }: { placement: string }) {
  const { t } = useI18n();
  const { data } = useQuery(adsQuery(placement));
  const ad = data?.[0];
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ad?.id || !adRef.current || typeof window === "undefined") return;
    const sessionKey = `abhitak.ad.impression.${ad.id}`;
    if (window.sessionStorage.getItem(sessionKey)) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return;
      window.sessionStorage.setItem(sessionKey, "1");
      void fetch("/api/public/campaign-event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaignId: ad.id, event: "impression" }),
        keepalive: true,
      });
      observer.disconnect();
    }, { threshold: 0.5 });

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [ad?.id]);

  if (!ad) return null;
  const recordClick = () => {
    void fetch("/api/public/campaign-event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campaignId: ad.id, event: "click" }),
      keepalive: true,
    });
  };
  return (
    <div ref={adRef} className="mx-4 my-6">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{t("advertisement")}</div>
      <a href={ad.link_url ?? "#"} target="_blank" rel="noopener sponsored" onClick={recordClick} className="relative block overflow-hidden rounded-sm border bg-ink">
        {ad.media_type === "video" && ad.video_url ? (
          <video src={ad.video_url} poster={img(ad.image_url)} muted autoPlay loop playsInline preload="none" className="aspect-[3/1] w-full object-cover" />
        ) : (
          <img src={img(ad.image_url)} alt={ad.title} width={600} height={200} loading="lazy" decoding="async" className="aspect-[3/1] w-full object-cover" />
        )}
        <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-ink/85 to-transparent p-4 text-ink-foreground">
          <div className="text-[11px] uppercase tracking-widest text-ink-foreground/70">{ad.campaign_type === "promotion" ? "Promotion" : ad.advertiser}</div>
          <div className="mt-1 max-w-[70%] text-lg font-bold leading-tight">{ad.title}</div>
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
  return <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", tone[status])}>{label(status)}</span>;
}

export function Empty({ text }: { text: string }) {
  return <div className="px-4 py-16 text-center text-muted-foreground">{text}</div>;
}
