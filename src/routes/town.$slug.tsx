import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { articlesQuery, townsQuery, type ArticleCard } from "@/lib/queries";
import { useI18n, timeAgo } from "@/lib/i18n";
import { img } from "@/lib/media";
import { ArticleRow, Empty, HeroStory } from "@/components/news";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/town/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} News — Abhitak` },
      { name: "description", content: `Latest local news from ${params.slug}.` },
      { property: "og:title", content: `${params.slug} News — Abhitak` },
      {
        property: "og:description",
        content: `Latest local news from ${params.slug}.`,
      },
    ],
  }),
  component: TownPage,
});

function DesktopTownArticleCard({ a }: { a: ArticleCard }) {
  const { pick, lang } = useI18n();
  return (
    <Link
      to="/news/$slug"
      params={{ slug: a.slug }}
      className="group flex flex-col rounded-xl border bg-card overflow-hidden shadow-xs hover:shadow-md hover:border-primary/50 transition-all"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <img
          src={img(a.cover_url) ?? "/pwa-512.png"}
          alt=""
          width={480}
          height={270}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.src = "/pwa-512.png";
            event.currentTarget.classList.add("object-contain");
          }}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {a.is_breaking && (
          <span className="absolute top-2 left-2 rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            Breaking
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {a.category && (
            <span className="font-bold text-primary uppercase tracking-wider">
              {pick(a.category.name_hi, a.category.name_en)}
            </span>
          )}
          <span suppressHydrationWarning>· {timeAgo(a.published_at, lang)}</span>
        </div>
        <h3 className="mt-2 font-serif text-base font-bold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {pick(a.title_hi, a.title_en)}
        </h3>
        {pick(a.summary_hi, a.summary_en) && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {pick(a.summary_hi, a.summary_en)}
          </p>
        )}
      </div>
    </Link>
  );
}

function TownPage() {
  const { slug } = Route.useParams();
  const { pick, t, lang } = useI18n();
  const { data: towns } = useQuery(townsQuery);
  const { data, isLoading } = useQuery(articlesQuery({ town: slug }));
  const town = towns?.find((x) => x.slug === slug);

  return (
    <div>
      {/* ======================================================== */}
      {/* MOBILE TOWN VIEW (lg:hidden) - STRICT 100% INVARIANCE    */}
      {/* ======================================================== */}
      <div className="lg:hidden">
        <div className="border-b bg-card px-4 py-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            {t("districtNews")}
          </div>
          <h1 className="mt-1 text-3xl font-bold">
            {town ? pick(town.name_hi, town.name_en) : slug}
          </h1>
        </div>
        {!isLoading && !data?.length && <Empty text={t("noContent")} />}
        {data?.[0] && <HeroStory a={data[0]} />}
        {data?.slice(1).map((a) => (
          <ArticleRow key={a.id} a={a} />
        ))}
      </div>

      {/* ======================================================== */}
      {/* DESKTOP TOWN VIEW (hidden lg:block) - EDITORIAL GRID     */}
      {/* ======================================================== */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-8">
        {/* Town Header + Switcher */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Link to="/" className="hover:text-primary transition-colors">
              {t("home")}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">
              {lang === "en" ? "Town News" : "कस्बा समाचार"}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                <MapPin className="h-3.5 w-3.5" />
                <span>{t("districtNews")} · जनपद बिजनौर</span>
              </div>
              <h1 className="mt-1 font-serif text-3xl xl:text-4xl font-extrabold text-foreground">
                {town ? pick(town.name_hi, town.name_en) : slug} की ख़बरें
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {town ? pick(town.name_hi, town.name_en) : slug} क्षेत्र के समस्त ताज़ा समाचार,
                घटनाक्रम एवं स्थानीय बुलेटिन।
              </p>
            </div>

            {/* Quick Town Switcher Pills */}
            <div className="flex flex-wrap gap-1.5 self-start md:self-end">
              {towns?.map((tw) => (
                <Link
                  key={tw.id}
                  to="/town/$slug"
                  params={{ slug: tw.slug }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                    tw.slug === slug
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/70 text-foreground hover:bg-muted",
                  )}
                >
                  {pick(tw.name_hi, tw.name_en)}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {!isLoading && !data?.length ? (
          <div className="my-12 rounded-2xl border bg-card p-12 text-center shadow-xs">
            <Empty text={t("noContent")} />
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {/* Lead Story (if available) */}
            {data?.[0] && (
              <div className="rounded-2xl border bg-card p-6 shadow-xs">
                <div className="grid grid-cols-12 gap-8 items-center">
                  <div className="col-span-7">
                    <Link
                      to="/news/$slug"
                      params={{ slug: data[0].slug }}
                      className="group block relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-muted"
                    >
                      <img
                        src={img(data[0].cover_url) ?? "/pwa-512.png"}
                        alt=""
                        width={800}
                        height={450}
                        fetchPriority="high"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {data[0].is_breaking && (
                        <span className="absolute top-3 left-3 rounded bg-primary px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                          BREAKING
                        </span>
                      )}
                    </Link>
                  </div>
                  <div className="col-span-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {data[0].category && (
                        <span className="font-bold text-primary uppercase tracking-wider">
                          {pick(data[0].category.name_hi, data[0].category.name_en)}
                        </span>
                      )}
                      <span suppressHydrationWarning>· {timeAgo(data[0].published_at, lang)}</span>
                    </div>
                    <Link to="/news/$slug" params={{ slug: data[0].slug }}>
                      <h2 className="font-serif text-2xl xl:text-3xl font-extrabold leading-snug text-foreground hover:text-primary transition-colors">
                        {pick(data[0].title_hi, data[0].title_en)}
                      </h2>
                    </Link>
                    {pick(data[0].summary_hi, data[0].summary_en) && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {pick(data[0].summary_hi, data[0].summary_en)}
                      </p>
                    )}
                    {data[0].author_name && (
                      <div className="text-xs font-semibold text-foreground/75 pt-2">
                        ब्यूरो रिपोर्ट: {data[0].author_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3-Column Card Grid for Subsequent Stories */}
            {data && data.length > 1 && (
              <div className="grid grid-cols-3 gap-6 pt-4">
                {data.slice(1).map((a) => (
                  <DesktopTownArticleCard key={a.id} a={a} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
