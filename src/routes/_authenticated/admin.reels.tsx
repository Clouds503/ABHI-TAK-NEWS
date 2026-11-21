import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Film,
  RefreshCw,
  Instagram,
  ExternalLink,
  Sparkles,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadNote } from "@/components/UploadNote";
import {
  syncInstagramReelsServerFn,
  getInstagramReelMedia,
  saveReelServerFn,
  bulkSaveReelsServerFn,
  toggleReelActiveServerFn,
  deleteReelServerFn,
  attachReelVideoServerFn,
  fetchReelInfoServerFn,
} from "@/lib/instagram.functions";
import { formatMetricCount } from "@/routes/reels";
import { uploadMedia } from "@/lib/upload";
import { useRealtimeReels } from "@/lib/useRealtimeReels";

export const Route = createFileRoute("/_authenticated/admin/reels")({
  head: () => ({
    meta: [{ title: "Reels — Abhitak CMS" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminReels,
});

function parseShortcode(input: string) {
  const m = input
    .trim()
    .match(/instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,40})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{5,40}$/.test(input.trim()) ? input.trim() : null;
}

function AdminReels() {
  const qc = useQueryClient();
  const syncServerReels = useServerFn(syncInstagramReelsServerFn);
  const resolveMedia = useServerFn(getInstagramReelMedia);
  const saveReel = useServerFn(saveReelServerFn);
  const bulkSaveReels = useServerFn(bulkSaveReelsServerFn);
  const toggleActive = useServerFn(toggleReelActiveServerFn);
  const deleteReel = useServerFn(deleteReelServerFn);
  const attachVideo = useServerFn(attachReelVideoServerFn);
  const fetchInfo = useServerFn(fetchReelInfoServerFn);

  const { isConnected: isRealtimeConnected } = useRealtimeReels({
    autoSync: false,
  });

  const [link, setLink] = useState("");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [bulk, setBulk] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reels"],
    queryFn: async () =>
      (
        await supabase
          .from("reels")
          .select("*")
          .order("posted_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  // Query like counts from reel_likes
  const { data: likeCounts } = useQuery({
    queryKey: ["admin-reel-likes-summary"],
    queryFn: async () => {
      const { data: likes } = await supabase.from("reel_likes").select("reel_id");
      const counts: Record<string, number> = {};
      (likes || []).forEach((l) => {
        counts[l.reel_id] = (counts[l.reel_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 30_000,
  });

  const refresh = async () => {
    await Promise.all([
      qc.refetchQueries({ queryKey: ["admin-reels"] }),
      qc.invalidateQueries({ queryKey: ["reels"] }),
      qc.invalidateQueries({ queryKey: ["admin-reel-likes-summary"] }),
    ]);
  };

  const handleSyncFromInstagram = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const t = toast.loading("Fetching latest reels from @abhitaknews…");
    try {
      const res = await syncServerReels();
      if (res?.success) {
        toast.success(
          `Sync successful: ${res.added} new reels added, ${res.updated} updated (${res.count} total).`,
          { id: t },
        );
        await refresh();
      } else {
        toast.error(res?.error || "Failed to sync reels", { id: t });
      }
    } catch (err: unknown) {
      console.error("Admin reels sync error:", err);
      toast.error(err instanceof Error ? err.message : "Sync error", { id: t });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLinkChange = async (val: string) => {
    setLink(val);
    const code = parseShortcode(val);
    if (code && !caption.trim() && !isFetchingInfo) {
      setIsFetchingInfo(true);
      try {
        const info = await fetchInfo({ data: { shortcode: code } });
        if (info?.caption) {
          setCaption(info.caption);
          toast.success("Instagram caption auto-fetched!", { duration: 2500 });
        }
      } catch {
        // Embed caption fetch error is non-fatal
      } finally {
        setIsFetchingInfo(false);
      }
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = parseShortcode(link);
    if (!code) {
      toast.error("Paste a valid Instagram reel link or shortcode");
      return;
    }
    const t = toast.loading("Saving reel to database…");
    let resolvedVideo = videoUrl.trim() || null;
    if (!resolvedVideo) {
      try {
        const media = await resolveMedia({ data: { shortcode: code } });
        if (media?.videoUrl) {
          resolvedVideo = media.videoUrl;
        }
      } catch (err) {
        console.warn("Could not auto-resolve direct mp4, will use iframe fallback:", err);
      }
    }

    const res = await saveReel({
      data: {
        shortcode: code,
        caption: caption.trim() || null,
        videoUrl: resolvedVideo,
      },
    });

    if (!res.success) {
      toast.error(res.error || "Failed to save reel", { id: t });
      return;
    }

    setLink("");
    setCaption("");
    setVideoUrl("");
    toast.success("Reel synced and added successfully!", { id: t });
    await refresh();
  };

  const addBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const codes: string[] = [];
    const bad: string[] = [];
    bulk
      .split(/\s+/)
      .filter(Boolean)
      .forEach((piece) => {
        const c = parseShortcode(piece);
        if (c && !codes.includes(c)) codes.push(c);
        else if (!c) bad.push(piece);
      });
    if (!codes.length) {
      toast.error("No valid reel links found");
      return;
    }
    const t = toast.loading(`Syncing ${codes.length} reel(s) from Instagram…`);
    const res = await bulkSaveReels({ data: { shortcodes: codes } });

    if (!res.success) {
      toast.error(res.error || "Failed to bulk save reels", { id: t });
      return;
    }

    setBulk("");
    toast.success(
      `${res.count ?? codes.length} reel${codes.length > 1 ? "s" : ""} saved successfully${bad.length ? `, ${bad.length} invalid skipped` : ""}`,
      { id: t },
    );
    await refresh();
  };

  const uploadVideo = async (id: string, file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Choose a video file");
      return;
    }
    const t = toast.loading("Uploading video to storage…");
    try {
      const url = await uploadMedia(file, "reels");
      const res = await attachVideo({ data: { id, videoUrl: url } });
      if (!res.success) {
        toast.error(res.error || "Failed to attach video to reel", { id: t });
        return;
      }
      toast.success("Video attached — it will play directly in the app", { id: t });
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload video", { id: t });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold">Reels Management</h1>
            {isRealtimeConnected && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage Instagram reels from <strong>@abhitaknews</strong>. Reels auto-sync directly and play in the app with likes and view tracking.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleSyncFromInstagram}
          disabled={isSyncing}
          className="gap-2 bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md hover:from-rose-700 hover:to-amber-700 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing Reels…" : "Auto-Sync @abhitaknews"}
        </Button>
      </div>

      <UploadNote
        type="MP4, WebM"
        maxSize="50 MB"
        ratio="9:16 (Vertical Fullscreen Reel)"
        hint="Directly attached video files guarantee reliable mobile playback with sound and scrubber controls."
      />

      {/* Manual Add Form */}
      <form onSubmit={add} className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Add Individual Reel</h2>
          {isFetchingInfo && (
            <span className="flex items-center gap-1.5 text-xs text-rose-500 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              Fetching caption from Instagram…
            </span>
          )}
        </div>
        <Input
          placeholder="https://www.instagram.com/reel/DVlGMqlDwPA/ or shortcode"
          value={link}
          onChange={(e) => void handleLinkChange(e.target.value)}
        />
        <Input
          placeholder="Direct MP4 video URL (optional)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        <div className="relative">
          <Input
            placeholder="Caption (auto-fetched from Instagram if left empty)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={500}
          />
          {caption && (
            <span className="absolute right-2.5 top-2.5 text-[10px] text-muted-foreground">
              {caption.length}/500
            </span>
          )}
        </div>
        <Button type="submit" className="gap-2">
          <Sparkles className="h-4 w-4" /> Add Reel
        </Button>
      </form>

      {/* Bulk Add Form */}
      <form onSubmit={addBulk} className="space-y-2 rounded-lg border bg-card p-4">
        <label className="text-sm font-semibold">Add Multiple Reels at Once</label>
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder={
            "Paste multiple reel links or shortcodes separated by lines or spaces:\nhttps://www.instagram.com/reel/DVlGMqlDwPA/\nhttps://www.instagram.com/reel/DVaoJ02j1by/\nhttps://www.instagram.com/reel/DQg2kYaj-JF/"
          }
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
        />
        <Button type="submit" variant="secondary">
          Add All Reels
        </Button>
      </form>

      {/* Reels List with Views and Likes */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b p-3 text-sm font-medium text-muted-foreground">
          <span>Active Reels ({data?.length ?? 0})</span>
          <a
            href="https://www.instagram.com/abhitaknews/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-rose-500 hover:underline"
          >
            <Instagram className="h-3.5 w-3.5" />
            @abhitaknews
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading reels…</div>
        ) : (
          <div className="divide-y">
            {data?.map((r) => {
              const inAppLikes = likeCounts?.[r.id] ?? 0;
              const displayLikes = (r.likes_count ?? 0) + inAppLikes;
              const displayViews = r.views ?? 0;

              return (
                <div key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.instagram.com/reel/${r.shortcode}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm font-medium text-primary hover:underline"
                      >
                        {r.shortcode}
                      </a>
                      {r.video_url && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <Film className="h-3 w-3" /> Native Video
                        </span>
                      )}
                      {!r.is_active && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Hidden
                        </span>
                      )}
                    </div>
                    {r.caption && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.caption}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5 text-sky-500" />
                        {formatMetricCount(displayViews)} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Instagram className="h-3.5 w-3.5 text-rose-500" />
                        {formatMetricCount(displayLikes)} likes
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    <label
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
                      aria-label="Upload reel video"
                      title="Upload MP4 reel video (9:16)"
                    >
                      <Upload className="h-4 w-4" />
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadVideo(r.id, f);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={r.is_active ? "Hide reel" : "Show reel"}
                      title={r.is_active ? "Visible in app" : "Hidden in app"}
                      onClick={async () => {
                        const res = await toggleActive({
                          data: { id: r.id, isActive: !r.is_active },
                        });
                        if (res.success) {
                          toast.success(r.is_active ? "Reel hidden" : "Reel made visible");
                          await refresh();
                        } else {
                          toast.error(res.error || "Failed to update reel status");
                        }
                      }}
                    >
                      {r.is_active ? (
                        <Eye className="h-4 w-4 text-primary" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete"
                      onClick={async () => {
                        if (confirm(`Delete reel ${r.shortcode}?`)) {
                          const res = await deleteReel({ data: { id: r.id } });
                          if (res.success) {
                            toast.success("Reel deleted");
                            await refresh();
                          } else {
                            toast.error(res.error || "Failed to delete reel");
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {!data?.length && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Instagram className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                No reels in database yet. Click <strong>Auto-Sync @abhitaknews</strong> to import reels.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
