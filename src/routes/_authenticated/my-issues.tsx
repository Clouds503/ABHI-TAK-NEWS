import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, timeAgo } from "@/lib/i18n";
import { Empty, StatusPill } from "@/components/news";

export const Route = createFileRoute("/_authenticated/my-issues")({
  validateSearch: z.object({ new: z.string().optional() }),
  head: () => ({
    meta: [{ title: "My submissions — Abhi Tak" }, { name: "robots", content: "noindex" }],
  }),
  component: MyIssues,
});

function MyIssues() {
  const { user } = Route.useRouteContext();
  const { t, lang, jkaCat, status } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["my-issues", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jan_ki_awaaz_posts")
        .select(
          "id, title, category, status, created_at, jan_ki_awaaz_status_history(status, created_at)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div>
      <div className="flex items-center justify-between px-4 pb-3 pt-6">
        <h1 className="text-2xl font-bold">{t("myIssues")}</h1>
        <Link to="/report" className="text-sm font-semibold text-primary">
          + {t("reportIssue")}
        </Link>
      </div>
      {!isLoading && !data?.length && <Empty text={t("noContent")} />}
      {data?.map((p) => (
        <div key={p.id} className="border-t px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold uppercase text-primary">
              {jkaCat(p.category)}
            </span>
            <StatusPill status={p.status} />
          </div>
          <div className="mt-1 text-[17px] font-bold leading-snug">{p.title}</div>
          <ol className="mt-3 space-y-1 border-l-2 pl-3 text-[13px] text-muted-foreground">
            {[...p.jan_ki_awaaz_status_history]
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((h, i) => (
                <li key={i}>
                  <span className="font-medium text-foreground">{status(h.status)}</span> ·{" "}
                  {timeAgo(h.created_at, lang)}
                </li>
              ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
