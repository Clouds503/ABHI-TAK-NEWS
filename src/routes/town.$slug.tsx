import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { articlesQuery, townsQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { ArticleRow, Empty, HeroStory } from "@/components/news";

export const Route = createFileRoute("/town/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} News — Abhi Tak` },
      { name: "description", content: `Latest local news from ${params.slug}, District Bijnor.` },
      { property: "og:title", content: `${params.slug} News — Abhi Tak` },
      {
        property: "og:description",
        content: `Latest local news from ${params.slug}, District Bijnor.`,
      },
    ],
  }),
  component: TownPage,
});

function TownPage() {
  const { slug } = Route.useParams();
  const { pick, t } = useI18n();
  const { data: towns } = useQuery(townsQuery);
  const { data, isLoading } = useQuery(articlesQuery({ town: slug }));
  const town = towns?.find((x) => x.slug === slug);
  return (
    <div>
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
  );
}
