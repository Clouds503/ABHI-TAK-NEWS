import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Megaphone, MapPin } from "lucide-react";
import { jkaPublicQuery, townsQuery } from "@/lib/queries";
import { useI18n, timeAgo, JKA_CATEGORIES } from "@/lib/i18n";
import { img } from "@/lib/media";
import { Empty, StatusPill } from "@/components/news";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/jan-ki-awaaz/")({
  head: () => ({
    meta: [
      { title: "Jan Ki Awaaz — आपकी समस्या, आपकी आवाज़ | Abhi Tak" },
      { name: "description", content: "Citizens of District Bijnor report local problems — roads, water, electricity, sanitation — and track their resolution." },
      { property: "og:title", content: "Jan Ki Awaaz — Abhi Tak" },
      { property: "og:description", content: "Report and track public-welfare issues across District Bijnor." },
    ],
  }),
  component: JkaHome,
});

function JkaHome() {
  const { t, pick, lang, jkaCat } = useI18n();
  const [town, setTown] = useState<string | undefined>();
  const [cat, setCat] = useState<string | undefined>();
  const { data: towns } = useQuery(townsQuery);
  const { data, isLoading } = useQuery(jkaPublicQuery({ town, category: cat }));
  const featured = data?.filter((p) => p.is_featured) ?? [];
  const townName = (id: string | null) => { const tw = towns?.find((x) => x.id === id); return tw ? pick(tw.name_hi, tw.name_en) : ""; };
  const chip = (on: boolean) => cn("h-9 shrink-0 rounded-full border px-3 text-[13px] font-medium transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-foreground");

  return (
    <div>
      <section className="relative overflow-hidden bg-deep px-4 pb-7 pt-8 text-primary-foreground">
        <Megaphone className="absolute -right-6 -top-4 h-40 w-40 rotate-[-12deg] opacity-10" />
        <div className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-80">Abhi Tak</div>
        <h1 className="mt-1 text-4xl font-extrabold">{t("jka")}</h1>
        <p className="mt-2 font-serif text-xl opacity-90">“{t("jkaTagline")}”</p>
        <Button asChild size="lg" className="mt-6 h-12 w-full rounded-2xl bg-info text-[16px] font-bold text-info-foreground shadow-lg hover:bg-info/90">
          <Link to="/report"><Megaphone className="h-5 w-5" /> {t("reportIssue")}</Link>
        </Button>
      </section>

      <div className="sticky top-[3.5rem] z-30 mt-3 space-y-2 border-y bg-background py-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          <button onClick={() => setCat(undefined)} className={chip(!cat)}>{t("all")}</button>
          {JKA_CATEGORIES.map((c) => <button key={c.slug} onClick={() => setCat(c.slug)} className={chip(cat === c.slug)}>{lang === "en" ? c.en : c.hi}</button>)}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          <button onClick={() => setTown(undefined)} className={chip(!town)}><MapPin className="mr-1 inline h-3.5 w-3.5" />{t("all")}</button>
          {towns?.map((tw) => <button key={tw.id} onClick={() => setTown(tw.id)} className={chip(town === tw.id)}>{pick(tw.name_hi, tw.name_en)}</button>)}
        </div>
      </div>

      {!town && !cat && featured[0] && (
        <Link to="/jan-ki-awaaz/$id" params={{ id: featured[0].id! }} className="block border-b">
          {featured[0].photo_url && <img src={img(featured[0].photo_url)} alt="" width={640} height={360} decoding="async" className="aspect-[16/9] w-full object-cover" />}
          <div className="p-4">
            <div className="flex items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-widest text-primary">{t("featured")}</span><StatusPill status={featured[0].status!} /></div>
            <h2 className="mt-2 text-2xl font-bold leading-snug">{featured[0].title}</h2>
            <p className="mt-2 line-clamp-2 text-muted-foreground">{featured[0].description}</p>
          </div>
        </Link>
      )}

      {!isLoading && !data?.length && <Empty text={t("noContent")} />}
      <ol>
        {data?.map((p) => (
          <li key={p.id} className="border-b">
            <Link to="/jan-ki-awaaz/$id" params={{ id: p.id! }} className="block px-4 py-4 active:bg-muted">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-primary">{jkaCat(p.category!)}</span>
                <StatusPill status={p.status!} />
              </div>
              <h3 className="mt-1.5 text-[17px] font-bold leading-snug">{p.title}</h3>
              <div className="mt-2 text-[12px] text-muted-foreground">
                {[p.area, townName(p.town_id)].filter(Boolean).join(", ")} · {p.reporter_name ?? t("anonymous")} · {timeAgo(p.created_at, lang)}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
