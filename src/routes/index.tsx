import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Play } from "lucide-react";
import { articlesQuery, townsQuery, videosQuery, jkaPublicQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { img } from "@/lib/media";
import { SectionHead } from "@/components/AppShell";
import { AdSlot, ArticleRow, FeatureCard, HeroStory, StatusPill, Ticker } from "@/components/news";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abhi Tak — बिजनौर की हर ख़बर, अभी तक" },
      { name: "description", content: "Breaking news, live TV, videos and citizen reports from every town of District Bijnor — Nagina, Dhampur, Najibabad, Chandpur and more." },
      { property: "og:title", content: "Abhi Tak — District Bijnor News" },
      { property: "og:description", content: "Local news network for District Bijnor with Jan Ki Awaaz citizen reporting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { t, pick } = useI18n();
  const { data: articles, isLoading } = useQuery(articlesQuery({ limit: 16 }));
  const { data: towns } = useQuery(townsQuery);
  const { data: videos } = useQuery(videosQuery);
  const { data: issues } = useQuery(jkaPublicQuery({ limit: 6 }));

  const breaking = articles?.filter((a) => a.is_breaking) ?? [];
  const hero = articles?.find((a) => a.is_featured) ?? articles?.[0];
  const rest = articles?.filter((a) => a.id !== hero?.id) ?? [];
  const featured = rest.filter((a) => a.is_featured);
  const counts = new Map<string, number>();
  articles?.forEach((a) => a.town && counts.set(a.town.slug, (counts.get(a.town.slug) ?? 0) + 1));

  return (
    <div>
      <Ticker items={breaking} />
      {isLoading ? <Skeleton className="aspect-[4/3] w-full rounded-none" /> : hero && <HeroStory a={hero} />}

      {/* District Radar */}
      <SectionHead title={t("districtRadar")} />
      <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-4">
        {towns?.map((tw) => {
          const n = counts.get(tw.slug) ?? 0;
          return (
            <Link key={tw.id} to="/town/$slug" params={{ slug: tw.slug }} className="relative flex h-[74px] w-[112px] shrink-0 snap-start flex-col justify-between rounded-sm border bg-card p-3 active:border-primary">
              <span className="text-[15px] font-semibold leading-none">{pick(tw.name_hi, tw.name_en)}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={n ? "h-1.5 w-1.5 rounded-full bg-primary" : "h-1.5 w-1.5 rounded-full bg-border"} />
                {n} {t("stories")}
              </span>
            </Link>
          );
        })}
      </div>

      <SectionHead title={t("latest")} />
      <div className="border-t">
        {rest.slice(0, 4).map((a, i) => <ArticleRow key={a.id} a={a} index={i} />)}
      </div>

      <AdSlot placement="home_inline" />

      {/* Jan Ki Awaaz strip */}
      <section className="mt-2 bg-ink py-6 text-ink-foreground">
        <div className="flex items-start justify-between gap-4 px-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-primary"><Megaphone className="h-4 w-4" /> {t("jka")}</div>
            <div className="mt-1 font-serif text-2xl font-bold">{t("jkaTagline")}</div>
          </div>
          <Button asChild className="shrink-0 rounded-xl text-sm font-semibold shadow-lg"><Link to="/report">{t("reportIssue")}</Link></Button>
        </div>
        <div className="no-scrollbar mt-5 flex snap-x gap-3 overflow-x-auto px-4">
          {issues?.slice(0, 6).map((p) => (
            <Link key={p.id} to="/jan-ki-awaaz/$id" params={{ id: p.id! }} className="w-[70%] shrink-0 snap-start border-l-2 border-primary bg-ink-foreground/5 p-3">
              <StatusPill status={p.status!} />
              <div className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug">{p.title}</div>
              <div className="mt-2 text-[12px] text-ink-foreground/60">{p.area}</div>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <>
          <SectionHead title={t("featured")} />
          <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto px-4">
            {featured.map((a) => <FeatureCard key={a.id} a={a} />)}
          </div>
        </>
      )}

      <SectionHead title={t("videoGalaxy")} to="/videos" action={t("seeAll")} />
      <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4">
        {videos?.map((v) => (
          <Link key={v.id} to="/videos" className="w-[60%] shrink-0 snap-start">
            <div className="relative aspect-video overflow-hidden rounded-sm bg-ink">
              <img src={img(v.thumbnail_url)} alt="" width={320} height={180} loading="lazy" decoding="async" fetchPriority="low" className="h-full w-full object-cover opacity-90" />
              <span className="absolute inset-0 grid place-items-center"><span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="ml-0.5 h-5 w-5" fill="currentColor" /></span></span>
              {v.duration && <span className="absolute bottom-1.5 right-1.5 bg-ink/80 px-1.5 text-[11px] text-ink-foreground">{v.duration}</span>}
            </div>
            <div className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug">{pick(v.title_hi, v.title_en)}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 border-t">
        {rest.slice(4).map((a) => <ArticleRow key={a.id} a={a} />)}
      </div>
    </div>
  );
}
