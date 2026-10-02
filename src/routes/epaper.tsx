import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { epapersQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { Empty } from "@/components/news";

export const Route = createFileRoute("/epaper")({
  head: () => ({
    meta: [
      { title: "E-Paper — Abhi Tak" },
      { name: "description", content: "Read the daily Abhi Tak e-paper for District Bijnor." },
      { property: "og:title", content: "E-Paper — Abhi Tak" },
      { property: "og:description", content: "Read the daily Abhi Tak e-paper for District Bijnor." },
    ],
  }),
  component: EPaper,
});

function EPaper() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery(epapersQuery);
  return (
    <div>
      <h1 className="px-4 pb-3 pt-6 text-2xl font-bold">{t("epaper")}</h1>
      {!isLoading && !data?.length && <Empty text={t("noContent")} />}
      <div className="grid grid-cols-2 gap-4 px-4">
        {data?.map((e) => (
          <a key={e.id} href={e.pdf_url} target="_blank" rel="noopener" className="block">
            <div className="grid aspect-[3/4] place-items-center overflow-hidden rounded-sm border bg-card">
              {e.cover_url ? <img src={e.cover_url} alt="" width={300} height={400} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <FileText className="h-10 w-10 text-muted-foreground" />}
            </div>
            <div className="mt-2 text-sm font-semibold">{e.title}</div>
            <div className="text-xs text-muted-foreground">{new Date(e.edition_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
