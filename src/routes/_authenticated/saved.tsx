import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ArticleRow, Empty } from "@/components/news";
import type { ArticleCard } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({ meta: [{ title: "Saved news — Abhi Tak" }, { name: "robots", content: "noindex" }] }),
  component: Saved,
});

function Saved() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["saved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("article:articles(id, slug, title_hi, title_en, summary_hi, summary_en, cover_url, is_breaking, is_featured, published_at, author_name, town:towns(slug,name_hi,name_en), category:categories(slug,name_hi,name_en))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((b) => b.article).filter(Boolean) as unknown as ArticleCard[];
    },
  });
  return (
    <div>
      <h1 className="px-4 pb-3 pt-6 text-2xl font-bold">{t("saved")}</h1>
      {!isLoading && !data?.length && <Empty text={t("noContent")} />}
      <div className="border-t">{data?.map((a) => <ArticleRow key={a.id} a={a} />)}</div>
    </div>
  );
}
