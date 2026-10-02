import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Eye, EyeOff, Upload, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/reels")({
  head: () => ({ meta: [{ title: "Reels — Abhi Tak CMS" }, { name: "robots", content: "noindex" }] }),
  component: AdminReels,
});

function parseShortcode(input: string) {
  const m = input.trim().match(/instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]{5,40})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{5,40}$/.test(input.trim()) ? input.trim() : null;
}

function AdminReels() {
  const qc = useQueryClient();
  const [link, setLink] = useState("");
  const [caption, setCaption] = useState("");
  const [bulk, setBulk] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-reels"],
    queryFn: async () => (await supabase.from("reels").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-reels"] }); qc.invalidateQueries({ queryKey: ["reels"] }); };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = parseShortcode(link);
    if (!code) { toast.error("Paste a valid Instagram reel link"); return; }
    const { error } = await supabase.from("reels").insert({ shortcode: code, caption: caption.trim().slice(0, 300) || null });
    if (error) { toast.error(error.message.includes("duplicate") ? "This reel is already added" : error.message); return; }
    setLink(""); setCaption(""); toast.success("Reel added"); refresh();
  };

  const addBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const codes: string[] = [];
    const bad: string[] = [];
    bulk.split(/\s+/).filter(Boolean).forEach((piece) => {
      const c = piece.includes("instagram.com") ? parseShortcode(piece) : null;
      if (c && !codes.includes(c)) codes.push(c);
      else if (!c) bad.push(piece);
    });
    if (!codes.length) { toast.error("No valid reel links found"); return; }
    const { error } = await supabase.from("reels").upsert(
      codes.map((shortcode) => ({ shortcode })),
      { onConflict: "shortcode", ignoreDuplicates: true },
    );
    if (error) { toast.error(error.message); return; }
    setBulk("");
    toast.success(`${codes.length} reel${codes.length > 1 ? "s" : ""} added${bad.length ? `, ${bad.length} invalid skipped` : ""}`);
    refresh();
  };

  const uploadVideo = async (id: string, file: File) => {
    if (!file.type.startsWith("video/")) { toast.error("Choose a video file"); return; }
    const t = toast.loading("Uploading video…");
    const path = `reels/${id}-${Date.now()}.${file.name.split(".").pop() || "mp4"}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (error) { toast.error(error.message, { id: t }); return; }
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    await supabase.from("reels").update({ video_url: signed?.signedUrl ?? null }).eq("id", id);
    toast.success("Video attached — it will play directly in the app", { id: t }); refresh();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Reels</h1>
      <p className="mt-1 text-sm text-muted-foreground">Open a reel on Instagram → Share → Copy link, then paste it here. Newest appear first. For guaranteed playback, download the reel video and attach it with the upload button — uploaded videos play directly with tap-to-pause.</p>
      <form onSubmit={add} className="mt-5 space-y-2 rounded-lg border bg-card p-4">
        <Input placeholder="https://www.instagram.com/reel/…" value={link} onChange={(e) => setLink(e.target.value)} />
        <Input placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} />
        <Button type="submit">Add reel</Button>
      </form>
      <form onSubmit={addBulk} className="mt-3 space-y-2 rounded-lg border bg-card p-4">
        <label className="text-sm font-medium">Add many at once</label>
        <textarea
          className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder={"Paste many reel links — one per line or separated by spaces:\nhttps://www.instagram.com/reel/…\nhttps://www.instagram.com/reel/…"}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
        />
        <Button type="submit" variant="secondary">Add all reels</Button>
      </form>
      <div className="mt-6 divide-y rounded-lg border bg-card">
        {data?.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <a href={`https://www.instagram.com/reel/${r.shortcode}/`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-primary">{r.shortcode}</a>
              {r.video_url && <div className="flex items-center gap-1 text-xs text-primary"><Film className="h-3 w-3" /> Video uploaded</div>}
              {r.caption && <div className="truncate text-sm text-muted-foreground">{r.caption}</div>}
            </div>
            <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted" aria-label="Upload video">
              <Upload className="h-4 w-4" />
              <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadVideo(r.id, f); e.target.value = ""; }} />
            </label>
            <Button size="icon" variant="ghost" aria-label="Toggle" onClick={async () => { await supabase.from("reels").update({ is_active: !r.is_active }).eq("id", r.id); refresh(); }}>
              {r.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm("Delete this reel?")) { await supabase.from("reels").delete().eq("id", r.id); refresh(); } }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {!data?.length && <div className="p-4 text-sm text-muted-foreground">No reels added yet.</div>}
      </div>
    </div>
  );
}
