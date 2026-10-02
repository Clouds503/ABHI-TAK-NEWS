import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

async function count(table: "articles" | "jan_ki_awaaz_posts" | "videos" | "advertisements", filter?: [string, string]) {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count } = await q;
  return count ?? 0;
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => ({
      pending: await count("jan_ki_awaaz_posts", ["status", "pending"]),
      issues: await count("jan_ki_awaaz_posts"),
      published: await count("articles", ["status", "published"]),
      drafts: await count("articles", ["status", "draft"]),
      videos: await count("videos"),
      ads: await count("advertisements", ["is_active", "true"]),
    }),
  });
  const { data: logs } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => (await supabase.from("admin_activity_logs").select("*").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });
  const cards = [
    { label: "Pending issues", v: data?.pending, to: "/admin/moderation", hot: true },
    { label: "Total issues", v: data?.issues, to: "/admin/moderation" },
    { label: "Published news", v: data?.published, to: "/admin/articles" },
    { label: "Drafts", v: data?.drafts, to: "/admin/articles" },
    { label: "Videos", v: data?.videos },
    { label: "Active ads & promotions", v: data?.ads, to: "/admin/ads" },
    { label: "Registered users", v: undefined, to: "/admin/users" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-bold">Newsroom dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => {
          const inner = (
            <div className={`rounded-md border bg-card p-4 ${c.hot && c.v ? "border-primary" : ""}`}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className={`mt-1 text-3xl font-bold ${c.hot && c.v ? "text-primary" : ""}`}>{c.v ?? "—"}</div>
            </div>
          );
          return c.to ? <Link key={c.label} to={c.to}>{inner}</Link> : <div key={c.label}>{inner}</div>;
        })}
      </div>
      <h2 className="mt-10 text-lg font-bold">Recent activity</h2>
      <div className="mt-3 divide-y rounded-md border bg-card">
        {!logs?.length && <div className="p-4 text-sm text-muted-foreground">No activity yet.</div>}
        {logs?.map((l) => (
          <div key={l.id} className="flex justify-between gap-3 p-3 text-sm">
            <span><b>{l.action}</b> · {l.entity}</span>
            <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
