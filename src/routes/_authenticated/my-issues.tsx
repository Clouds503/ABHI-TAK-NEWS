import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, timeAgo } from "@/lib/i18n";
import { Empty, StatusPill } from "@/components/news";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/my-issues")({
  validateSearch: z.object({ new: z.string().optional() }),
  head: () => ({
    meta: [{ title: "My submissions — Abhitak" }, { name: "robots", content: "noindex" }],
  }),
  component: MyIssues,
});

type IssueItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  jan_ki_awaaz_status_history: { status: string; created_at: string }[];
};

function MyIssueDesktopCard({
  p,
  jkaCat,
  status,
  lang,
}: {
  p: IssueItem;
  jkaCat: (c: string) => string;
  status: (s: string) => string;
  lang: string;
}) {
  return (
    <Link
      to="/jan-ki-awaaz/$id"
      params={{ id: p.id }}
      className="group block rounded-2xl border bg-card p-5 shadow-xs hover:border-primary/50 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          {jkaCat(p.category)}
        </span>
        <StatusPill status={p.status} />
      </div>
      <h3 className="mt-2.5 font-serif text-lg font-bold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {p.title}
      </h3>
      <div className="mt-4 border-t pt-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          {lang === "en" ? "Progress Timeline" : "प्रगति विवरण"}
        </div>
        <ol className="space-y-1.5 border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground">
          {[...p.jan_ki_awaaz_status_history]
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((h, i) => (
              <li key={i} suppressHydrationWarning>
                <span className="font-semibold text-foreground">{status(h.status)}</span> ·{" "}
                {timeAgo(h.created_at, lang)}
              </li>
            ))}
        </ol>
      </div>
    </Link>
  );
}

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
      return (data ?? []) as IssueItem[];
    },
  });
  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-serif">{t("myIssues")}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "en"
              ? "Track status and progress of public issues you have submitted"
              : "आपके द्वारा दर्ज की गई जन-समस्याओं की स्थिति व प्रगति देखें"}
          </p>
        </div>
        <Button asChild size="sm" className="rounded-full font-bold shadow-xs">
          <Link to="/report">+ {t("reportIssue")}</Link>
        </Button>
      </div>

      {!isLoading && !data?.length && <Empty text={t("noContent")} />}

      {/* Mobile Feed */}
      <div className="border-t divide-y lg:hidden">
        {data?.map((p) => (
          <Link
            key={p.id}
            to="/jan-ki-awaaz/$id"
            params={{ id: p.id }}
            className="block px-4 py-4 active:bg-muted/50"
          >
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
                  <li key={i} suppressHydrationWarning>
                    <span className="font-medium text-foreground">{status(h.status)}</span> ·{" "}
                    {timeAgo(h.created_at, lang)}
                  </li>
                ))}
            </ol>
          </Link>
        ))}
      </div>

      {/* Desktop 2-Col Grid */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
        {data?.map((p) => (
          <MyIssueDesktopCard key={p.id} p={p} jkaCat={jkaCat} status={status} lang={lang} />
        ))}
      </div>
    </div>
  );
}
