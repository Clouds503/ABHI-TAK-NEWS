import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Megaphone,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  MapPin,
  Tag,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/moderator")({
  head: () => ({
    meta: [
      { title: "Moderation Desk (Moderator Panel) — Abhitak CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ModeratorPanel,
});

type JkaStatus = Database["public"]["Enums"]["jka_status"];

function ModeratorPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<JkaStatus | "all">("pending");
  const [activeNotes, setActiveNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["moderator-posts", filter],
    queryFn: async () => {
      let q = supabase
        .from("jan_ki_awaaz_posts")
        .select("*, town:towns(name_en, name_hi)")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        q = q.eq("status", filter);
      }
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Global counts for all statuses
  const { data: counts = { pending: 0, forwarded: 0, in_progress: 0, resolved: 0, rejected: 0 } } = useQuery({
    queryKey: ["moderator-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jan_ki_awaaz_posts")
        .select("status");
      if (error) throw error;

      const c: Record<string, number> = {
        pending: 0,
        forwarded: 0,
        in_progress: 0,
        resolved: 0,
        rejected: 0,
      };
      (data || []).forEach((row) => {
        if (row.status in c) c[row.status]++;
      });
      return c;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["moderator-posts"] });
    qc.invalidateQueries({ queryKey: ["moderator-counts"] });
    qc.invalidateQueries({ queryKey: ["mod"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const updateStatus = async (id: string, newStatus: JkaStatus, defaultNote?: string) => {
    setUpdatingId(id);
    const note = (activeNotes[id] || defaultNote || "").trim();

    try {
      const { error: postErr } = await supabase
        .from("jan_ki_awaaz_posts")
        .update({
          status: newStatus,
          admin_notes: note || null,
        })
        .eq("id", id);

      if (postErr) throw postErr;

      // History audit
      await supabase.from("jan_ki_awaaz_status_history").insert({
        post_id: id,
        status: newStatus,
        note: note || `Status updated to ${newStatus}`,
        changed_by: user?.id ?? null,
      });

      // Admin log
      if (user?.id) {
        await supabase.from("admin_activity_logs").insert({
          actor_id: user.id,
          action: `moderate_${newStatus}`,
          entity: "jan_ki_awaaz_post",
          entity_id: id,
          details: { note },
        });
      }

      toast.success(`Complaint status marked as ${newStatus}`);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update complaint");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Moderation Desk</h1>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Moderator Panel
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                जन की आवाज़ मॉडरेशन डेस्क — Review citizen complaints, forward issues to authorities & manage resolutions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/admin/moderation">
              Full Moderation Table →
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          onClick={() => setFilter("pending")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            filter === "pending" ? "border-amber-500 bg-amber-500/5 shadow-xs" : "bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Pending Action</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {counts.pending}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting moderator check</p>
        </div>

        <div
          onClick={() => setFilter("forwarded")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            filter === "forwarded" ? "border-blue-500 bg-blue-500/5 shadow-xs" : "bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Forwarded to Dept</span>
            <Send className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {counts.forwarded}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Sent to Nagar Nigam / PWD</p>
        </div>

        <div
          onClick={() => setFilter("in_progress")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            filter === "in_progress" ? "border-purple-500 bg-purple-500/5 shadow-xs" : "bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">In Progress</span>
            <AlertTriangle className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
            {counts.in_progress}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Field work underway</p>
        </div>

        <div
          onClick={() => setFilter("resolved")}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            filter === "resolved" ? "border-emerald-500 bg-emerald-500/5 shadow-xs" : "bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {counts.resolved}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Successfully closed issues</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-2">
        {(["pending", "forwarded", "in_progress", "resolved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
              filter === s
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {s === "all" ? "All Submissions" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Posts Queue */}
      <div className="space-y-4">
        {posts.map((p) => (
          <div key={p.id} className="rounded-xl border bg-card p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs">
                    {p.status}
                  </Badge>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    📁 {p.category}
                  </span>
                  {(p.district || p.town?.name_en) && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      📍 {p.district || p.town?.name_en}
                    </span>
                  )}
                  {p.area && <span className="text-xs text-muted-foreground">({p.area})</span>}
                </div>
                <h3 className="text-base font-bold text-foreground">{p.title}</h3>
              </div>

              <div className="text-xs text-muted-foreground shrink-0 text-left sm:text-right">
                <div>Filed: {new Date(p.created_at).toLocaleString("en-IN")}</div>
                {p.reporter_name && <div>By: <b>{p.reporter_name}</b></div>}
              </div>
            </div>

            <p className="text-sm text-foreground/90 whitespace-pre-line bg-muted/30 p-3 rounded-lg border border-border/50">
              {p.description}
            </p>

            {p.photo_url && (
              <div>
                <img
                  src={p.photo_url}
                  alt={p.title}
                  className="max-h-56 rounded-lg object-cover border"
                />
              </div>
            )}

            {/* Moderation Actions Box */}
            <div className="pt-3 border-t space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Textarea
                  placeholder="Add moderator note or department feedback (e.g., 'Forwarded to Nagar Nigam Zone 3; repair expected in 48 hours')..."
                  className="text-xs min-h-[42px] py-2"
                  value={activeNotes[p.id] ?? (p.admin_notes || "")}
                  onChange={(e) =>
                    setActiveNotes((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  disabled={updatingId === p.id}
                  onClick={() => updateStatus(p.id, "approved", "Approved for public visibility")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Public
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-1.5"
                  disabled={updatingId === p.id}
                  onClick={() => updateStatus(p.id, "forwarded", "Forwarded to administrative authorities")}
                >
                  <Send className="h-3.5 w-3.5" />
                  Forward to Dept
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-purple-600 border-purple-200 hover:bg-purple-50 gap-1.5"
                  disabled={updatingId === p.id}
                  onClick={() => updateStatus(p.id, "in_progress", "Officials have initiated action")}
                >
                  <Clock className="h-3.5 w-3.5" />
                  In Progress
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-teal-600 border-teal-200 hover:bg-teal-50 gap-1.5"
                  disabled={updatingId === p.id}
                  onClick={() => updateStatus(p.id, "resolved", "Civic grievance resolved")}
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  Mark Resolved
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 gap-1.5"
                  disabled={updatingId === p.id}
                  onClick={() => updateStatus(p.id, "rejected", "Declined by moderation team")}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </Button>

                <Button asChild size="sm" variant="ghost" className="ml-auto text-xs">
                  <Link to={`/jan-ki-awaaz/${p.id}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Open Public View
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ))}

        {posts.length === 0 && !isLoading && (
          <div className="p-12 text-center text-sm text-muted-foreground border rounded-xl bg-card">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-500/60" />
            <div className="font-semibold text-foreground">No submissions found in this category</div>
            <p className="mt-1 text-xs">All citizen complaints under "{filter}" have been moderated.</p>
          </div>
        )}
      </div>
    </div>
  );
}