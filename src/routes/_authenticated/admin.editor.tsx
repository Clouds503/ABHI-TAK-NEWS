import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  PenTool,
  Sparkles,
  Flame,
  CheckCircle2,
  Eye,
  Film,
  Plus,
  ExternalLink,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  Archive,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/editor")({
  head: () => ({
    meta: [
      { title: "Editorial Desk (Editor Panel) — Abhitak CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditorPanel,
});

type TabFilter = "review" | "breaking" | "published" | "reels";

function EditorPanel() {
  const { user, isEditor, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabFilter>("review");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Queries
  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["editor-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, town:towns(name_en, name_hi), category:categories(name_en, name_hi)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reels = [] } = useQuery({
    queryKey: ["editor-reels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reels")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["editor-articles"] });
    qc.invalidateQueries({ queryKey: ["admin-articles"] });
    qc.invalidateQueries({ queryKey: ["articles"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["editor-reels"] });
  };

  const publishArticle = async (id: string, currentTitle: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("articles")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      if (user?.id) {
        await supabase.from("admin_activity_logs").insert({
          actor_id: user.id,
          action: "publish",
          entity: "article",
          entity_id: id,
          details: { title: currentTitle },
        });
      }

      toast.success(`Published "${currentTitle.slice(0, 30)}…"`);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setProcessingId(null);
    }
  };

  const toggleBreaking = async (id: string, currentVal: boolean) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("articles")
        .update({ is_breaking: !currentVal })
        .eq("id", id);

      if (error) throw error;

      if (user?.id) {
        await supabase.from("admin_activity_logs").insert({
          actor_id: user.id,
          action: !currentVal ? "mark_breaking" : "unmark_breaking",
          entity: "article",
          entity_id: id,
        });
      }

      toast.success(!currentVal ? "Flagged as BREAKING NEWS" : "Removed BREAKING flag");
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle breaking status");
    } finally {
      setProcessingId(null);
    }
  };

  const archiveArticle = async (id: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("articles")
        .update({ status: "archived" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Article archived");
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to archive");
    } finally {
      setProcessingId(null);
    }
  };

  // Metrics calculation
  const pendingStories = articles.filter(
    (a) => a.status === "draft" || a.status === "pending",
  );
  const breakingStories = articles.filter((a) => a.is_breaking);
  const publishedStories = articles.filter((a) => a.status === "published");
  const publishedToday = publishedStories.filter((a) => {
    if (!a.published_at) return false;
    const pub = new Date(a.published_at).toDateString();
    return pub === new Date().toDateString();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Editorial Desk</h1>
                <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300">
                  Editor Panel
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                संपादकीय डेस्क — Review reporter drafts, approve breaking stories, schedule & manage newsroom publications
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/admin/reels">
              <Film className="h-4 w-4 text-rose-500" />
              Manage Reels
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
            <Link to="/admin/articles">
              <Plus className="h-4 w-4" />
              + Author Story
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          onClick={() => setTab("review")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            tab === "review" ? "border-amber-500 bg-amber-500/5 shadow-xs" : "bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold">{pendingStories.length}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Drafts awaiting approval</p>
        </div>

        <div
          onClick={() => setTab("breaking")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            tab === "breaking" ? "border-red-500 bg-red-500/5 shadow-xs" : "bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Breaking News</span>
            <Flame className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {breakingStories.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active red alerts on app</p>
        </div>

        <div
          onClick={() => setTab("published")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            tab === "published" ? "border-emerald-500 bg-emerald-500/5 shadow-xs" : "bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Published Today</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {publishedToday.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{publishedStories.length} all-time stories</p>
        </div>

        <div
          onClick={() => setTab("reels")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            tab === "reels" ? "border-rose-500 bg-rose-500/5 shadow-xs" : "bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active Reels</span>
            <Film className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold">{reels.length}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Short video feed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          onClick={() => setTab("review")}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === "review"
              ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Needs Review ({pendingStories.length})
        </button>
        <button
          onClick={() => setTab("breaking")}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === "breaking"
              ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Flame className="h-3.5 w-3.5 text-red-500" />
          Breaking News ({breakingStories.length})
        </button>
        <button
          onClick={() => setTab("published")}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === "published"
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Published ({publishedStories.length})
        </button>
        <button
          onClick={() => setTab("reels")}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === "reels"
              ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Film className="h-3.5 w-3.5 text-rose-500" />
          Reels Queue ({reels.length})
        </button>
      </div>

      {/* Tab Content */}
      {tab === "review" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Stories Awaiting Editorial Approval</h2>
            <span className="text-xs text-muted-foreground">Click "Publish Now" to make live immediately</span>
          </div>

          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {pendingStories.map((a) => (
              <div key={a.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-foreground text-sm">
                      {a.title_hi || a.title_en || "Untitled Story"}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {a.status}
                    </Badge>
                    {a.is_breaking && (
                      <Badge variant="destructive" className="text-[10px] uppercase">
                        BREAKING
                      </Badge>
                    )}
                  </div>
                  {a.title_en && a.title_en !== a.title_hi && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.title_en}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {a.town?.name_en && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        📍 {a.town.name_en}
                      </span>
                    )}
                    {a.category?.name_en && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                        🏷️ {a.category.name_en}
                      </span>
                    )}
                    <span>Filed: {new Date(a.created_at).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    disabled={processingId === a.id}
                    onClick={() => publishArticle(a.id, a.title_hi || a.title_en || "Article")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Publish Now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={a.is_breaking ? "text-red-500" : "text-muted-foreground"}
                    disabled={processingId === a.id}
                    onClick={() => toggleBreaking(a.id, a.is_breaking)}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    {a.is_breaking ? "Unmark Breaking" : "Make Breaking"}
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/admin/articles">Edit Story</Link>
                  </Button>
                </div>
              </div>
            ))}

            {pendingStories.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500/60" />
                No stories waiting for review! The editorial queue is completely clear.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "breaking" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Active Breaking News Alerts</h2>
            <span className="text-xs text-muted-foreground">Displayed prominently in red at top of consumer app</span>
          </div>

          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {breakingStories.map((a) => (
              <div key={a.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-red-500/5 hover:bg-red-500/10 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">
                      {a.title_hi || a.title_en}
                    </span>
                    <Badge variant="destructive" className="text-[10px]">BREAKING</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{a.status}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {a.town?.name_en && <span>📍 {a.town.name_en}</span>}
                    <span>Created: {new Date(a.created_at).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    disabled={processingId === a.id}
                    onClick={() => toggleBreaking(a.id, true)}
                  >
                    Turn Off Breaking
                  </Button>
                  {a.status !== "published" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => publishArticle(a.id, a.title_hi || a.title_en || "Article")}
                    >
                      Publish
                    </Button>
                  )}
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/news/${a.slug}`}>View Public</Link>
                  </Button>
                </div>
              </div>
            ))}

            {breakingStories.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Flame className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                No active breaking news stories right now.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "published" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Live Published Stories</h2>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/articles">View All in Articles CMS →</Link>
            </Button>
          </div>

          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {publishedStories.slice(0, 20).map((a) => (
              <div key={a.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{a.title_hi || a.title_en}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Published: {new Date(a.published_at || a.created_at).toLocaleDateString("en-IN")}</span>
                    {a.town?.name_en && <span>· {a.town.name_en}</span>}
                    {a.is_breaking && <span className="text-red-500 font-semibold">· BREAKING</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => toggleBreaking(a.id, a.is_breaking)}
                  >
                    <Flame className={`h-3.5 w-3.5 ${a.is_breaking ? "text-red-500" : ""}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    title="Archive story"
                    onClick={() => archiveArticle(a.id)}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button asChild size="sm" variant="outline" className="text-xs gap-1">
                    <Link to={`/news/${a.slug}`} target="_blank">
                      <ExternalLink className="h-3 w-3" />
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "reels" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Active Short Video Reels</h2>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/reels">+ Add New Reel</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reels.map((r) => (
              <div key={r.id} className="rounded-xl border bg-card p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">
                      {r.is_active ? "Active" : "Hidden"}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">{r.shortcode}</span>
                  </div>
                  <p className="mt-2 text-xs line-clamp-2 text-foreground font-medium">
                    {r.caption || "No caption provided"}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                  <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    <Link to="/admin/reels">Manage</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}