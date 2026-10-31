import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarClock,
  Eye,
  Image,
  MousePointerClick,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { img } from "@/lib/media";
import { townsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UploadNote } from "@/components/UploadNote";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Campaign = Database["public"]["Tables"]["advertisements"]["Row"];
type CampaignKind = "advertisement" | "promotion";
type MediaKind = "image" | "video";

const empty = {
  id: "",
  title: "",
  advertiser: "",
  campaign_type: "advertisement" as CampaignKind,
  media_type: "image" as MediaKind,
  image_url: "",
  video_url: "",
  link_url: "",
  placement: "home_inline",
  town_id: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

const campaignSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required").max(160),
    advertiser: z.string().trim().max(120),
    link_url: z.union([z.literal(""), z.string().url("Enter a valid destination URL")]),
    image_url: z.string(),
    video_url: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
  })
  .superRefine((value, context) => {
    if (!value.image_url && !value.video_url)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["image_url"],
        message: "Upload an image or video",
      });
    if (value.starts_at && value.ends_at && new Date(value.ends_at) <= new Date(value.starts_at))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ends_at"],
        message: "End date must be after start date",
      });
  });

export const Route = createFileRoute("/_authenticated/admin/ads")({
  head: () => ({
    meta: [{ title: "Ads & Promotions — Abhi Tak CMS" }, { name: "robots", content: "noindex" }],
  }),
  component: AdsAdmin,
});

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function campaignTiming(campaign: Campaign) {
  const now = Date.now();
  const start = campaign.starts_at ? new Date(campaign.starts_at).getTime() : now;
  const end = campaign.ends_at ? new Date(campaign.ends_at).getTime() : null;
  const effectiveEnd = end ? Math.min(now, end) : now;
  const elapsedDays = Math.max(0, (effectiveEnd - start) / 86_400_000);
  const remainingDays = end ? Math.max(0, (end - now) / 86_400_000) : null;
  return { elapsedDays, remainingDays };
}

function daysLabel(value: number) {
  if (value < 1) return `${Math.max(0, Math.ceil(value * 24))}h`;
  return `${Math.ceil(value)}d`;
}

function AdsAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: towns } = useQuery(townsQuery);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertisements")
        .select("*, town:towns(name_en)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const visible = data?.filter((campaign) =>
    `${campaign.title} ${campaign.advertiser ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const totals = visible?.reduce(
    (summary, campaign) => ({
      impressions: summary.impressions + campaign.impressions,
      clicks: summary.clicks + campaign.clicks,
      active:
        summary.active +
        (campaign.is_active &&
        (!campaign.starts_at || new Date(campaign.starts_at) <= new Date()) &&
        (!campaign.ends_at || new Date(campaign.ends_at) > new Date())
          ? 1
          : 0),
    }),
    { impressions: 0, clicks: 0, active: 0 },
  ) ?? { impressions: 0, clicks: 0, active: 0 };
  const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const set =
    (key: keyof typeof empty) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));
  const edit = (campaign?: Campaign) => {
    setForm(
      campaign
        ? {
            id: campaign.id,
            title: campaign.title,
            advertiser: campaign.advertiser ?? "",
            campaign_type: campaign.campaign_type as CampaignKind,
            media_type: campaign.media_type as MediaKind,
            image_url: campaign.image_url,
            video_url: campaign.video_url ?? "",
            link_url: campaign.link_url ?? "",
            placement: campaign.placement,
            town_id: campaign.town_id ?? "",
            starts_at: toLocalInput(campaign.starts_at),
            ends_at: toLocalInput(campaign.ends_at),
            is_active: campaign.is_active,
          }
        : empty,
    );
    setOpen(true);
  };

  const uploadMedia = async (file: File) => {
    if (!user) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) {
      toast.error("Choose an image or video file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File must be smaller than 50 MB");
      return;
    }
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/campaign-${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from("media")
      .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data: signed, error: signedError } = await supabase.storage
      .from("media")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (signedError || !signed?.signedUrl) {
      toast.error(signedError?.message ?? "Could not prepare media");
      setUploading(false);
      return;
    }
    setForm((current) => ({
      ...current,
      media_type: isVideo ? "video" : "image",
      image_url: isVideo ? signed.signedUrl : signed.signedUrl,
      video_url: isVideo ? signed.signedUrl : "",
    }));
    setUploading(false);
  };

  const save = async () => {
    if (!user) return;
    const parsed = campaignSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the campaign details");
      return;
    }
    setSaving(true);
    const row = {
      title: form.title.trim(),
      advertiser: form.advertiser.trim() || null,
      campaign_type: form.campaign_type,
      media_type: form.media_type,
      image_url: form.image_url,
      video_url: form.media_type === "video" ? form.video_url || form.image_url : null,
      link_url: form.link_url.trim() || null,
      placement: form.placement,
      town_id: form.town_id || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
    };
    const result = form.id
      ? await supabase.from("advertisements").update(row).eq("id", form.id).select("id").single()
      : await supabase.from("advertisements").insert(row).select("id").single();
    if (result.error) {
      toast.error(result.error.message);
      setSaving(false);
      return;
    }
    await supabase.from("admin_activity_logs").insert({
      actor_id: user.id,
      action: form.id ? "update" : "create",
      entity: form.campaign_type,
      entity_id: result.data.id,
    });
    toast.success(form.id ? "Campaign updated" : "Campaign created");
    setSaving(false);
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["ads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const remove = async (campaign: Campaign) => {
    if (!user) return;
    const { error } = await supabase.from("advertisements").delete().eq("id", campaign.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("admin_activity_logs").insert({
      actor_id: user.id,
      action: "delete",
      entity: campaign.campaign_type,
      entity_id: campaign.id,
    });
    toast.success("Campaign deleted");
    queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["ads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const selectClass = "mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm";
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ads & Promotions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage scheduled image and video campaigns.
          </p>
        </div>
        <Button onClick={() => edit()}>
          <Plus /> New campaign
        </Button>
      </div>
      <div className="relative mt-5 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search campaigns"
          className="pl-9"
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="h-4 w-4" /> Impressions
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {totals.impressions.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MousePointerClick className="h-4 w-4" /> Clicks
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {totals.clicks.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-4 w-4" /> Click-through rate
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{totalCtr.toFixed(2)}%</div>
        </div>
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-4 w-4" /> Running now
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{totals.active}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {isLoading && <div className="text-sm text-muted-foreground">Loading campaigns…</div>}
        {!isLoading && !visible?.length && (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No campaigns found.
          </div>
        )}
        {visible?.map((campaign) => {
          const expired = !!campaign.ends_at && new Date(campaign.ends_at) < new Date();
          const scheduled = !!campaign.starts_at && new Date(campaign.starts_at) > new Date();
          const timing = campaignTiming(campaign);
          const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
          const dailyImpressions =
            timing.elapsedDays > 0
              ? campaign.impressions / Math.max(1, timing.elapsedDays)
              : campaign.impressions;
          return (
            <article key={campaign.id} className="overflow-hidden rounded-md border bg-card">
              <div className="aspect-[3/1] bg-muted">
                {campaign.media_type === "video" && campaign.video_url ? (
                  <video
                    src={campaign.video_url}
                    muted
                    playsInline
                    controls
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={img(campaign.image_url)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={campaign.campaign_type === "promotion" ? "secondary" : "outline"}>
                    {campaign.campaign_type}
                  </Badge>
                  <Badge variant={campaign.is_active && !expired ? "default" : "secondary"}>
                    {expired
                      ? "expired"
                      : scheduled
                        ? "scheduled"
                        : campaign.is_active
                          ? "active"
                          : "inactive"}
                  </Badge>
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    {campaign.media_type === "video" ? <Video /> : <Image />} {campaign.media_type}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold">{campaign.title}</h2>
                <div className="mt-1 text-sm text-muted-foreground">
                  {campaign.advertiser || "No advertiser"} · {campaign.placement}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {campaign.starts_at
                    ? new Date(campaign.starts_at).toLocaleString("en-IN")
                    : "Starts immediately"}
                  {campaign.ends_at
                    ? ` — ${new Date(campaign.ends_at).toLocaleString("en-IN")}`
                    : " — No end date"}
                </div>
                <div className="mt-4 grid grid-cols-3 divide-x rounded-md border bg-muted/30 py-3 text-center">
                  <div>
                    <div className="text-lg font-bold tabular-nums">
                      {campaign.impressions.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Impressions</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold tabular-nums">
                      {campaign.clicks.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Clicks</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold tabular-nums">{ctr.toFixed(2)}%</div>
                    <div className="text-[11px] text-muted-foreground">CTR</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{daysLabel(timing.elapsedDays)} elapsed</span>
                  <span>
                    {timing.remainingDays === null
                      ? "No end date"
                      : `${daysLabel(timing.remainingDays)} remaining`}
                  </span>
                  <span>{dailyImpressions.toFixed(1)} impressions/day</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => edit(campaign)}>
                    <Pencil /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes it from the app.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(campaign)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{form.id ? "Edit campaign" : "New campaign"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Campaign type</Label>
                <select
                  className={selectClass}
                  value={form.campaign_type}
                  onChange={set("campaign_type")}
                >
                  <option value="advertisement">Advertisement</option>
                  <option value="promotion">Promotion</option>
                </select>
              </div>
              <div>
                <Label>Placement</Label>
                <select className={selectClass} value={form.placement} onChange={set("placement")}>
                  <option value="home_inline">Home inline</option>
                  <option value="home_top">Home Top Banner (Hero Slot)</option>
                  <option value="article_inline">Article inline</option>
                  <option value="jan_ki_awaaz">Jan Ki Awaaz</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Title *</Label>
              <Input className="mt-1" value={form.title} onChange={set("title")} />
            </div>
            <div>
              <Label>Advertiser / sponsor</Label>
              <Input className="mt-1" value={form.advertiser} onChange={set("advertiser")} />
            </div>
            <div>
              <Label>Destination URL</Label>
              <Input
                className="mt-1"
                type="url"
                placeholder="https://"
                value={form.link_url}
                onChange={set("link_url")}
              />
            </div>
            <div>
              <Label>Campaign media *</Label>
              <label className="mt-1 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 p-4 text-center">
                <Upload className="h-5 w-5" />
                <span className="mt-1 text-sm font-semibold">
                  {uploading ? "Uploading…" : "Upload image or video"}
                </span>
                <span className="text-xs text-muted-foreground">
                  JPG, PNG, WebP, MP4 or WebM · max 50 MB
                </span>
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  disabled={uploading}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadMedia(file);
                  }}
                />
              </label>
              <UploadNote
                type="JPG, PNG, WebP, MP4, WebM"
                maxSize="50 MB"
                ratio={
                  form.placement === "home_top"
                    ? "3:1 or 16:9 (Top Banner)"
                    : form.placement === "home_inline"
                      ? "16:9 or 3:1 (In-feed Banner)"
                      : form.placement === "article_inline"
                        ? "16:9 or 1:1 (Article Inline / Square)"
                        : "16:9 or 1:1 (Card Sponsor)"
                }
                hint={
                  form.placement === "home_top"
                    ? "Best fit: 1200×400px (3:1) or 1920×1080px (16:9) landscape banner."
                    : form.placement === "home_inline"
                      ? "Best fit: 1200×675px (16:9) in-feed banner."
                      : "Best fit: 600×600px (1:1) square or 1200×675px (16:9) landscape."
                }
              />
              {form.media_type === "video" && form.video_url ? (
                <video
                  src={form.video_url}
                  controls
                  playsInline
                  preload="metadata"
                  className="mt-2 aspect-video w-full rounded-md bg-ink"
                />
              ) : form.image_url ? (
                <img
                  src={img(form.image_url)}
                  alt="Campaign preview"
                  className="mt-2 aspect-[3/1] w-full rounded-md object-cover"
                />
              ) : null}
            </div>
            <div>
              <Label>Town targeting</Label>
              <select className={selectClass} value={form.town_id} onChange={set("town_id")}>
                <option value="">All District Bijnor</option>
                {towns?.map((town) => (
                  <option key={town.id} value={town.id}>
                    {town.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starts</Label>
                <Input
                  className="mt-1"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={set("starts_at")}
                />
              </div>
              <div>
                <Label>Ends</Label>
                <Input
                  className="mt-1"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={set("ends_at")}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((current) => ({ ...current, is_active: event.target.checked }))
                }
              />{" "}
              Active and eligible to display
            </label>
            <Button className="w-full" disabled={saving || uploading} onClick={save}>
              {saving ? "Saving…" : "Save campaign"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
