import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Eye, EyeOff, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UploadNote } from "@/components/UploadNote";
import { uploadMedia } from "@/lib/upload";

export const Route = createFileRoute("/_authenticated/admin/events")({
  head: () => ({
    meta: [{ title: "Events & Updates — Abhitak CMS" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminEvents,
});

function AdminEvents() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<"event" | "update">("event");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [when, setWhen] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () =>
      (await supabase.from("events").select("*").order("created_at", { ascending: false })).data ??
      [],
  });
  const { data: regs = [] } = useQuery({
    queryKey: ["admin-event-regs"],
    queryFn: async () =>
      (
        await supabase
          .from("event_registrations")
          .select("*")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const refresh = () => {
    ["admin-events", "admin-event-regs", "events"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    let image_url: string | null = null;
    if (file) {
      try {
        image_url = await uploadMedia(file, "events");
      } catch (err: unknown) {
        setBusy(false);
        toast.error(err instanceof Error ? err.message : "Failed to upload image");
        return;
      }
    }
    const { error } = await supabase.from("events").insert({
      kind,
      title: title.trim(),
      description: desc.trim() || null,
      location: location.trim() || null,
      event_at: when ? new Date(when).toISOString() : null,
      image_url,
      allow_join: kind === "event",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    setDesc("");
    setLocation("");
    setWhen("");
    setFile(null);
    toast.success("Published");
    refresh();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("event_registrations").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Events & Updates</h1>
      <form onSubmit={add} className="mt-5 space-y-2 rounded-lg border bg-card p-4">
        <div className="flex gap-2">
          {(["event", "update"] as const).map((k) => (
            <Button
              key={k}
              type="button"
              variant={kind === k ? "default" : "outline"}
              onClick={() => setKind(k)}
            >
              {k === "event" ? "Event" : "Update"}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
        <Textarea
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        {kind === "event" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
        )}
        <div>
          <label className="block text-sm text-muted-foreground">
            Image (optional)
            <input
              type="file"
              accept="image/*"
              className="mt-1 block text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <UploadNote
            type="JPG, PNG, WebP"
            maxSize="10 MB"
            ratio="16:9 or 4:3 (Banner)"
            hint="Recommended resolution: 1200×675px for community announcements and event cards."
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Publishing…" : "Publish"}
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        {events.map((ev) => {
          const r = regs.filter((x) => x.event_id === ev.id);
          return (
            <div key={ev.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase text-muted-foreground">
                    {ev.kind}
                    {!ev.is_active && " · hidden"}
                  </div>
                  <div className="font-semibold">{ev.title}</div>
                  {ev.event_at && (
                    <div className="text-sm text-muted-foreground">
                      {new Date(ev.event_at).toLocaleString("en-IN")}
                      {ev.location && ` · ${ev.location}`}
                    </div>
                  )}
                </div>
                {ev.kind === "event" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenId(openId === ev.id ? null : ev.id)}
                  >
                    <Users className="mr-1 h-4 w-4" />
                    {r.length} applications
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Toggle visibility"
                  onClick={async () => {
                    await supabase
                      .from("events")
                      .update({ is_active: !ev.is_active })
                      .eq("id", ev.id);
                    refresh();
                  }}
                >
                  {ev.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete"
                  onClick={async () => {
                    if (!confirm("Delete this item and its applications?")) return;
                    await supabase.from("events").delete().eq("id", ev.id);
                    refresh();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {openId === ev.id && (
                <div className="mt-3 divide-y border-t">
                  {!r.length && (
                    <p className="py-3 text-sm text-muted-foreground">No applications yet.</p>
                  )}
                  {r.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {a.full_name} ·{" "}
                          <a className="underline" href={`tel:${a.phone}`}>
                            {a.phone}
                          </a>
                        </div>
                        {a.message && <div className="text-muted-foreground">{a.message}</div>}
                        <div className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleString("en-IN")} · {a.status}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={a.status === "approved" ? "default" : "outline"}
                        onClick={() => setStatus(a.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant={a.status === "rejected" ? "destructive" : "outline"}
                        onClick={() => setStatus(a.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
