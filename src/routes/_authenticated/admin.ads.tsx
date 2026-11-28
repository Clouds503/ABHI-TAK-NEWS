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
  Smartphone,
  Monitor,
  MonitorSmartphone,
  Flame,
  LayoutList,
  FileText,
  PanelRight,
  Megaphone,
  LayoutTop,
  Power,
  Filter,
  CheckCircle2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { img } from "@/lib/media";
import { townsQuery } from "@/lib/queries";
import { uploadMedia } from "@/lib/upload";
import { exportToCsv, sanitizeExportFilename } from "@/lib/export-data";
import { cn } from "@/lib/utils";
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

type Campaign = Database["public"]["Tables"]["advertisements"]["Row"] & {
  device_visibility?: string | null;
  aspect_ratio?: string | null;
  auto_sizing?: boolean | null;
  town?: { name_en: string } | null;
};

type CampaignKind = "advertisement" | "promotion";
type MediaKind = "image" | "video";
export type DeviceVisibility = "all" | "mobile" | "desktop";
export type AdAspectRatio = "auto" | "16:9" | "3:1" | "1:1" | "4:3" | "8:1";

export const AD_ASPECT_RATIOS: Record<
  AdAspectRatio,
  {
    label: string;
    description: string;
    badge: string;
  }
> = {
  auto: {
    label: "Auto Sizing (Responsive / Creative Natural Ratio)",
    description: "Container dynamically adapts to the image dimensions without cropping logos, text, or contacts.",
    badge: "Auto Sizing",
  },
  "16:9": {
    label: "16:9 Landscape (Widescreen)",
    description: "Standard landscape banner, ideal for Home In-Feed, Article Story, and Video ads.",
    badge: "16:9 Landscape",
  },
  "3:1": {
    label: "3:1 Panoramic Billboard",
    description: "Wide desktop header/hero billboard banner across the full page width.",
    badge: "3:1 Billboard",
  },
  "1:1": {
    label: "1:1 Square Card",
    description: "Square display unit, recommended for Desktop Sidebar and Instagram creatives.",
    badge: "1:1 Square",
  },
  "4:3": {
    label: "4:3 Classic (300×250 Rectangle)",
    description: "Standard medium rectangle ad for sidebars and article in-feed placement.",
    badge: "4:3 Rectangle",
  },
  "8:1": {
    label: "8:1 Thin Leaderboard",
    description: "Slim horizontal strip banner, ideal for Global Header navigation bar.",
    badge: "8:1 Leaderboard",
  },
};

export const PLACEMENTS: Record<
  string,
  {
    label: string;
    description: string;
    ratio: string;
    recommended: string;
  }
> = {
  home_top: {
    label: "Home Top Banner (Hero Slot)",
    description: "Billboard at the very top of Home Page (above all news feed/broadsheet).",
    ratio: "3:1 or 16:9",
    recommended: "1200×400px (Desktop broadsheet) or 1200×675px (Mobile)",
  },
  home_inline: {
    label: "Home In-Feed Banner",
    description: "In-stream horizontal banner between latest news stories on Home Page.",
    ratio: "16:9 or 3:1",
    recommended: "1200×675px (16:9) or 1200×400px (3:1)",
  },
  article_inline: {
    label: "Article Story Banner",
    description: "Featured banner inside or immediately below the article story text.",
    ratio: "16:9 or 1:1",
    recommended: "1200×675px (Landscape) or 600×600px (Square)",
  },
  sidebar_ad: {
    label: "Desktop Sidebar Ad",
    description: "High-visibility sticky card banner in the Desktop right sidebar.",
    ratio: "1:1 or 300×250",
    recommended: "600×500px (300×250 retina) or 600×600px (Square)",
  },
  jan_ki_awaaz: {
    label: "Jan Ki Awaaz Feed Banner",
    description: "Civic issues, public grievances & community voice feed.",
    ratio: "16:9 or 3:1",
    recommended: "1200×675px (16:9)",
  },
  header_banner: {
    label: "Global Header Banner",
    description: "Prominent sponsor strip right below the main app header/navigation.",
    ratio: "8:1 or Leaderboard",
    recommended: "1200×150px or 728×90px",
  },
};

export const DEVICE_VISIBILITY: Record<
  DeviceVisibility,
  {
    label: string;
    description: string;
    badge: string;
  }
> = {
  all: {
    label: "Both (Mobile & Desktop)",
    description: "Displays across all devices, mobile phones, tablets, and desktop screens.",
    badge: "Mobile & Desktop",
  },
  mobile: {
    label: "Mobile Only",
    description: "Displays exclusively on mobile devices and Android app (hidden on desktop).",
    badge: "Mobile Only",
  },
  desktop: {
    label: "Desktop Only",
    description: "Displays exclusively on desktop browsers and laptops (hidden on mobile).",
    badge: "Desktop Only",
  },
};

export function getBasePlacement(rawPlacement: string): string {
  return rawPlacement.replace(/_(mobile|desktop|all)$/, "");
}

export function getDeviceVisibility(campaign: {
  device_visibility?: string | null;
  placement?: string;
}): DeviceVisibility {
  if (
    campaign.device_visibility === "mobile" ||
    campaign.device_visibility === "desktop" ||
    campaign.device_visibility === "all"
  ) {
    return campaign.device_visibility as DeviceVisibility;
  }
  if (campaign.placement?.endsWith("_mobile")) return "mobile";
  if (campaign.placement?.endsWith("_desktop")) return "desktop";
  return "all";
}

const empty = {
  id: "",
  title: "",
  advertiser: "",
  campaign_type: "advertisement" as CampaignKind,
  media_type: "image" as MediaKind,
  image_url: "",
  video_url: "",
  link_url: "",
  placement: "home_top",
  device_visibility: "all" as DeviceVisibility,
  aspect_ratio: "auto" as AdAspectRatio,
  auto_sizing: true,
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
    placement: z.string(),
    device_visibility: z.enum(["all", "mobile", "desktop"]).default("all"),
    aspect_ratio: z.enum(["auto", "16:9", "3:1", "1:1", "4:3", "8:1"]).default("auto"),
    auto_sizing: z.boolean().default(true),
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
    meta: [{ title: "Ads & Promotions — Abhitak CMS" }, { name: "robots", content: "noindex" }],
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
  const [filterPlacement, setFilterPlacement] = useState<string>("all");
  const [filterDevice, setFilterDevice] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
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
      return data as Campaign[];
    },
  });

  const getCampaignStatus = (c: Campaign) => {
    const expired = !!c.ends_at && new Date(c.ends_at) < new Date();
    const scheduled = !!c.starts_at && new Date(c.starts_at) > new Date();
    if (expired) return "expired";
    if (!c.is_active) return "inactive";
    if (scheduled) return "scheduled";
    return "active";
  };

  const filteredCampaigns = data?.filter((c) => {
    // Search query
    const matchQuery = `${c.title} ${c.advertiser ?? ""} ${c.placement}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    if (!matchQuery) return false;

    // Filter Placement
    const baseP = getBasePlacement(c.placement);
    if (filterPlacement !== "all" && baseP !== filterPlacement) return false;

    // Filter Device
    const dev = getDeviceVisibility(c);
    if (filterDevice !== "all" && dev !== filterDevice) return false;

    // Filter Campaign Type
    if (filterType !== "all" && c.campaign_type !== filterType) return false;

    // Filter Status
    const st = getCampaignStatus(c);
    if (filterStatus !== "all" && st !== filterStatus) return false;

    return true;
  });

  const totals = filteredCampaigns?.reduce(
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
      mobileOnly: summary.mobileOnly + (getDeviceVisibility(campaign) === "mobile" ? 1 : 0),
      desktopOnly: summary.desktopOnly + (getDeviceVisibility(campaign) === "desktop" ? 1 : 0),
      allDevices: summary.allDevices + (getDeviceVisibility(campaign) === "all" ? 1 : 0),
    }),
    { impressions: 0, clicks: 0, active: 0, mobileOnly: 0, desktopOnly: 0, allDevices: 0 },
  ) ?? { impressions: 0, clicks: 0, active: 0, mobileOnly: 0, desktopOnly: 0, allDevices: 0 };

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
            placement: getBasePlacement(campaign.placement),
            device_visibility: getDeviceVisibility(campaign),
            aspect_ratio: (campaign.aspect_ratio || "auto") as AdAspectRatio,
            auto_sizing: campaign.auto_sizing ?? true,
            town_id: campaign.town_id ?? "",
            starts_at: toLocalInput(campaign.starts_at),
            ends_at: toLocalInput(campaign.ends_at),
            is_active: campaign.is_active,
          }
        : empty,
    );
    setOpen(true);
  };

  const handleUploadMedia = async (file: File) => {
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
    try {
      const url = await uploadMedia(file, "campaigns");
      setForm((current) => ({
        ...current,
        media_type: isVideo ? "video" : "image",
        image_url: isVideo ? current.image_url : url,
        video_url: isVideo ? url : current.video_url,
      }));
      toast.success("Media uploaded successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not upload media");
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (campaign: Campaign, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) return;
    const newStatus = !campaign.is_active;
    const { error } = await supabase
      .from("advertisements")
      .update({ is_active: newStatus })
      .eq("id", campaign.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(newStatus ? "Campaign enabled" : "Campaign paused");
    queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["ads"] });
  };

  const updateDeviceVisibility = async (campaign: Campaign, dev: DeviceVisibility) => {
    if (!user) return;
    const baseP = getBasePlacement(campaign.placement);
    const effPlacement = dev === "all" ? baseP : `${baseP}_${dev}`;

    const { error } = await supabase
      .from("advertisements")
      .update({
        device_visibility: dev,
        placement: effPlacement,
      })
      .eq("id", campaign.id);

    if (error) {
      // Fallback if device_visibility column not in schema yet
      if (error.message.includes("device_visibility")) {
        await supabase
          .from("advertisements")
          .update({ placement: effPlacement })
          .eq("id", campaign.id);
      } else {
        toast.error(error.message);
        return;
      }
    }

    toast.success(`Visibility set to ${DEVICE_VISIBILITY[dev].badge}`);
    queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["ads"] });
  };

  const save = async () => {
    if (!user) return;
    const parsed = campaignSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the campaign details");
      return;
    }
    setSaving(true);

    const basePlacement = getBasePlacement(form.placement);
    const effPlacement =
      form.device_visibility === "all" ? basePlacement : `${basePlacement}_${form.device_visibility}`;

    const row = {
      title: form.title.trim(),
      advertiser: form.advertiser.trim() || null,
      campaign_type: form.campaign_type,
      media_type: form.media_type,
      image_url: form.image_url,
      video_url: form.media_type === "video" ? form.video_url || form.image_url : null,
      link_url: form.link_url.trim() || null,
      placement: effPlacement,
      device_visibility: form.device_visibility,
      aspect_ratio: form.aspect_ratio || "auto",
      auto_sizing: form.auto_sizing ?? true,
      town_id: form.town_id || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
    };

    let result = form.id
      ? await supabase.from("advertisements").update(row).eq("id", form.id).select("id").single()
      : await supabase.from("advertisements").insert(row).select("id").single();

    // Fallback if aspect_ratio, auto_sizing or device_visibility columns not present in DB
    if (result.error && (result.error.message.includes("aspect_ratio") || result.error.message.includes("auto_sizing") || result.error.message.includes("device_visibility"))) {
      const { aspect_ratio: _ar, auto_sizing: _as, device_visibility: _omit, ...rowWithoutNewCols } = row;
      result = form.id
        ? await supabase
            .from("advertisements")
            .update(rowWithoutNewCols)
            .eq("id", form.id)
            .select("id")
            .single()
        : await supabase.from("advertisements").insert(rowWithoutNewCols).select("id").single();
    }

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

    toast.success(form.id ? "Campaign updated successfully" : "Campaign created successfully");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ads, Banners & Promotions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control placement, scheduling, and device visibility (Mobile vs Desktop) across Abhitak.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!filtered || filtered.length === 0) {
                toast.error("No campaigns found to export");
                return;
              }
              exportToCsv(
                sanitizeExportFilename("ad_campaigns", "csv"),
                filtered,
                [
                  { key: "id", label: "Campaign ID" },
                  { key: "title", label: "Campaign Title" },
                  { key: "advertiser", label: "Advertiser" },
                  { key: "placement", label: "Placement" },
                  { key: "device_visibility", label: "Device Visibility" },
                  { key: "is_active", label: "Status", transform: (v) => (v ? "Active" : "Paused") },
                  { key: "impression_count", label: "Impressions" },
                  { key: "click_count", label: "Clicks" },
                  {
                    key: "ctr",
                    label: "CTR (%)",
                    transform: (_, row) => {
                      const imp = row.impression_count || 0;
                      const clk = row.click_count || 0;
                      return imp > 0 ? ((clk / imp) * 100).toFixed(2) + "%" : "0.00%";
                    },
                  },
                  { key: "link_url", label: "Link URL" },
                  { key: "starts_at", label: "Start Date" },
                  { key: "ends_at", label: "End Date" },
                  { key: "created_at", label: "Created Date" },
                ]
              );
              toast.success(`Exported ${filtered.length} ad campaigns to CSV!`);
            }}
            className="shadow-xs gap-1.5"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => edit()} className="shadow-xs">
            <Plus className="mr-1.5 h-4 w-4" /> New campaign
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Eye className="h-4 w-4 text-blue-500" /> Impressions
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">
            {totals.impressions.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <MousePointerClick className="h-4 w-4 text-emerald-500" /> Clicks
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">
            {totals.clicks.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-amber-500" /> Click-through rate
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{totalCtr.toFixed(2)}%</div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CalendarClock className="h-4 w-4 text-primary" /> Active Now
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">{totals.active}</span>
            <span className="text-[11px] text-muted-foreground">
              ({totals.mobileOnly} mobile, {totals.desktopOnly} desktop, {totals.allDevices} all)
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="h-3.5 w-3.5" /> Filter by Placement & Visibility
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, advertiser..."
              className="pl-9 h-10 text-xs"
            />
          </div>

          {/* Placement Filter */}
          <div>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
              value={filterPlacement}
              onChange={(e) => setFilterPlacement(e.target.value)}
            >
              <option value="all">All Placements</option>
              {Object.entries(PLACEMENTS).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          {/* Device Visibility Filter */}
          <div>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
            >
              <option value="all">All Devices (📱 & 🖥️)</option>
              <option value="mobile">📱 Mobile Only</option>
              <option value="desktop">🖥️ Desktop Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active & Running</option>
              <option value="scheduled">Scheduled (Future)</option>
              <option value="expired">Expired</option>
              <option value="inactive">Paused (Inactive)</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="advertisement">Commercial Advertisements</option>
              <option value="promotion">House Promotions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {isLoading && <div className="text-sm text-muted-foreground p-4">Loading campaigns…</div>}

        {!isLoading && !filteredCampaigns?.length && (
          <div className="col-span-full rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            No matching campaigns found. Try adjusting your filters or click{" "}
            <strong className="text-foreground">New campaign</strong>.
          </div>
        )}

        {filteredCampaigns?.map((campaign) => {
          const timing = campaignTiming(campaign);
          const status = getCampaignStatus(campaign);
          const dev = getDeviceVisibility(campaign);
          const basePlacement = getBasePlacement(campaign.placement);
          const placementInfo = PLACEMENTS[basePlacement] ?? {
            label: campaign.placement,
            description: "",
          };
          const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
          const dailyImpressions =
            timing.elapsedDays > 0
              ? campaign.impressions / Math.max(1, timing.elapsedDays)
              : campaign.impressions;

          return (
            <article
              key={campaign.id}
              className="group overflow-hidden rounded-xl border bg-card shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Media Preview Box */}
              <div>
                <div className="relative aspect-[16/9] sm:aspect-[3/1] bg-muted overflow-hidden flex items-center justify-center">
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
                      className={cn(
                        campaign.auto_sizing || campaign.aspect_ratio === "auto"
                          ? "h-full w-full object-contain"
                          : "h-full w-full object-cover"
                      )}
                    />
                  )}

                  {/* Device & Aspect Ratio Tags on Media */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                      {dev === "mobile" ? (
                        <>
                          <Smartphone className="h-3 w-3 text-amber-400" /> Mobile Only
                        </>
                      ) : dev === "desktop" ? (
                        <>
                          <Monitor className="h-3 w-3 text-sky-400" /> Desktop Only
                        </>
                      ) : (
                        <>
                          <MonitorSmartphone className="h-3 w-3 text-emerald-400" /> Mobile & Desktop
                        </>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur-xs">
                      📐 {AD_ASPECT_RATIOS[(campaign.aspect_ratio as AdAspectRatio) || "auto"]?.badge || "Auto"}
                    </span>
                  </div>

                  {/* 1-Click Active Switch on Media Corner */}
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={(e) => toggleActive(campaign, e)}
                      title={campaign.is_active ? "Click to Pause" : "Click to Enable"}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md transition-all backdrop-blur-md ${
                        campaign.is_active
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      <Power className="h-3 w-3" />
                      {campaign.is_active ? "Active" : "Paused"}
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={campaign.campaign_type === "promotion" ? "secondary" : "outline"}>
                      {campaign.campaign_type}
                    </Badge>

                    <Badge
                      variant={
                        status === "active"
                          ? "default"
                          : status === "scheduled"
                            ? "secondary"
                            : "outline"
                      }
                      className={status === "active" ? "bg-emerald-600 text-white" : ""}
                    >
                      {status}
                    </Badge>

                    <Badge variant="outline" className="text-primary font-medium">
                      {placementInfo.label}
                    </Badge>

                    <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                      {campaign.media_type === "video" ? <Video className="h-3.5 w-3.5" /> : <Image className="h-3.5 w-3.5" />}
                      {campaign.media_type}
                    </span>
                  </div>

                  <h2 className="mt-2.5 text-base font-bold leading-snug line-clamp-1">{campaign.title}</h2>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {campaign.advertiser ? `${campaign.advertiser} · ` : ""}
                    {campaign.town?.name_en ?? "All Districts"}
                  </div>

                  {/* Destination link */}
                  {campaign.link_url && (
                    <div className="mt-1 text-[11px] text-muted-foreground/80 truncate">
                      🔗 <span className="underline">{campaign.link_url}</span>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {campaign.starts_at
                      ? `Starts: ${new Date(campaign.starts_at).toLocaleDateString("en-IN")}`
                      : "Starts immediately"}
                    {campaign.ends_at
                      ? ` · Ends: ${new Date(campaign.ends_at).toLocaleDateString("en-IN")}`
                      : " · No end date"}
                  </div>

                  {/* Stats Grid */}
                  <div className="mt-3 grid grid-cols-3 divide-x rounded-lg border bg-muted/30 py-2 text-center">
                    <div>
                      <div className="text-base font-bold tabular-nums">
                        {campaign.impressions.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Impressions
                      </div>
                    </div>
                    <div>
                      <div className="text-base font-bold tabular-nums">
                        {campaign.clicks.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Clicks
                      </div>
                    </div>
                    <div>
                      <div className="text-base font-bold tabular-nums">{ctr.toFixed(2)}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">CTR</div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{daysLabel(timing.elapsedDays)} elapsed</span>
                    <span>
                      {timing.remainingDays === null
                        ? "Unlimited run"
                        : `${daysLabel(timing.remainingDays)} left`}
                    </span>
                    <span>{dailyImpressions.toFixed(0)}/day</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="p-4 pt-0 border-t mt-3 flex items-center justify-between gap-2">
                {/* Device Selector Pill */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[11px] text-muted-foreground mr-1 hidden sm:inline">Device:</span>
                  <div className="inline-flex rounded-md border bg-muted p-0.5">
                    <button
                      type="button"
                      onClick={() => updateDeviceVisibility(campaign, "all")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        dev === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      }`}
                      title="Show on both mobile and desktop"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDeviceVisibility(campaign, "mobile")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        dev === "mobile" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      }`}
                      title="Show only on mobile devices"
                    >
                      Mobile
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDeviceVisibility(campaign, "desktop")}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        dev === "desktop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      }`}
                      title="Show only on desktop view"
                    >
                      Desktop
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => edit(campaign)} className="h-8 text-xs">
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes "{campaign.title}" from the platform.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(campaign)} className="bg-destructive text-destructive-foreground">
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

      {/* Edit / New Campaign Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{form.id ? "Edit Campaign" : "Create New Campaign"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 p-4">
            {/* Campaign Type & Placement */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Campaign type</Label>
                <select
                  className={selectClass}
                  value={form.campaign_type}
                  onChange={set("campaign_type")}
                >
                  <option value="advertisement">Commercial Advertisement</option>
                  <option value="promotion">Editorial / House Promotion</option>
                </select>
              </div>

              <div>
                <Label>Placement Slot *</Label>
                <select className={selectClass} value={form.placement} onChange={set("placement")}>
                  {Object.entries(PLACEMENTS).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Placement Info Box */}
            {PLACEMENTS[form.placement] && (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {PLACEMENTS[form.placement].label}
                </div>
                <div className="text-muted-foreground">{PLACEMENTS[form.placement].description}</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  Recommended: {PLACEMENTS[form.placement].recommended}
                </div>
              </div>
            )}

            {/* Device Visibility Selector (NEW) */}
            <div>
              <Label className="flex items-center justify-between">
                <span>Device Visibility *</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Where should this ad appear?
                </span>
              </Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(Object.keys(DEVICE_VISIBILITY) as DeviceVisibility[]).map((devKey) => {
                  const devInfo = DEVICE_VISIBILITY[devKey];
                  const selected = form.device_visibility === devKey;
                  return (
                    <button
                      key={devKey}
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, device_visibility: devKey }))}
                      className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                        selected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/30"
                      }`}
                    >
                      {devKey === "mobile" ? (
                        <Smartphone className="h-5 w-5 mb-1" />
                      ) : devKey === "desktop" ? (
                        <Monitor className="h-5 w-5 mb-1" />
                      ) : (
                        <MonitorSmartphone className="h-5 w-5 mb-1" />
                      )}
                      <span className="text-xs font-semibold">{devInfo.badge}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {DEVICE_VISIBILITY[form.device_visibility].description}
              </p>
            </div>

            {/* Aspect Ratio & Auto Sizing (NEW) */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Creative Aspect Ratio & Auto Sizing *</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.auto_sizing}
                    onChange={(e) => setForm((c) => ({ ...c, auto_sizing: e.target.checked }))}
                    className="rounded border-input text-primary"
                  />
                  <span>Auto-fit without cropping</span>
                </label>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {(Object.keys(AD_ASPECT_RATIOS) as AdAspectRatio[]).map((ratioKey) => {
                  const ratioInfo = AD_ASPECT_RATIOS[ratioKey];
                  const selected = form.aspect_ratio === ratioKey;
                  return (
                    <button
                      key={ratioKey}
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, aspect_ratio: ratioKey }))}
                      className={`flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-all cursor-pointer ${
                        selected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/30"
                      }`}
                    >
                      <span className="text-xs font-semibold">{ratioInfo.badge}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                        {ratioKey === "auto" ? "Responsive" : ratioKey}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {AD_ASPECT_RATIOS[form.aspect_ratio]?.description}
              </p>
            </div>

            <div>
              <Label>Campaign Title *</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Special Festival Offer / District Quiz Show"
                value={form.title}
                onChange={set("title")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Advertiser / Sponsor Name</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Royal Sweets / Abhitak"
                  value={form.advertiser}
                  onChange={set("advertiser")}
                />
              </div>

              <div>
                <Label>District / Region Targeting</Label>
                <select className={selectClass} value={form.town_id} onChange={set("town_id")}>
                  <option value="">All Regions</option>
                  {towns?.map((town) => (
                    <option key={town.id} value={town.id}>
                      {town.name_en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Destination / Click URL</Label>
              <Input
                className="mt-1"
                type="url"
                placeholder="https://example.com/promo or #"
                value={form.link_url}
                onChange={set("link_url")}
              />
            </div>

            {/* Media Upload */}
            <div>
              <Label>Campaign Media (Image / Video) *</Label>
              <label className="mt-1 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-4 text-center hover:bg-muted/50 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="mt-1 text-sm font-semibold">
                  {uploading ? "Uploading media…" : "Upload banner image or video"}
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
                    if (file) handleUploadMedia(file);
                  }}
                />
              </label>

              <UploadNote
                type="JPG, PNG, WebP, MP4, WebM"
                maxSize="50 MB"
                ratio={PLACEMENTS[form.placement]?.ratio || "16:9"}
                hint={PLACEMENTS[form.placement]?.recommended || "High quality image or video"}
              />

              {form.media_type === "video" && form.video_url ? (
                <video
                  src={form.video_url}
                  controls
                  playsInline
                  preload="metadata"
                  className={cn(
                    "mt-2 w-full rounded-md bg-ink",
                    form.aspect_ratio === "1:1"
                      ? "aspect-square max-w-[320px] mx-auto"
                      : form.aspect_ratio === "3:1"
                        ? "aspect-[3/1]"
                        : form.aspect_ratio === "4:3"
                          ? "aspect-[4/3] max-w-[360px] mx-auto"
                          : form.aspect_ratio === "8:1"
                            ? "aspect-[8/1]"
                            : "aspect-video"
                  )}
                />
              ) : form.image_url ? (
                <div
                  className={cn(
                    "mt-2 w-full overflow-hidden rounded-md border bg-black/5 dark:bg-black/40 flex items-center justify-center p-1",
                    form.aspect_ratio === "1:1"
                      ? "aspect-square max-w-[320px] mx-auto"
                      : form.aspect_ratio === "3:1"
                        ? "aspect-[3/1]"
                        : form.aspect_ratio === "4:3"
                          ? "aspect-[4/3] max-w-[360px] mx-auto"
                          : form.aspect_ratio === "8:1"
                            ? "aspect-[8/1]"
                            : form.aspect_ratio === "16:9"
                              ? "aspect-video"
                              : "min-h-[160px] max-h-[300px]"
                  )}
                >
                  <img
                    src={img(form.image_url)}
                    alt="Campaign preview"
                    className={cn(
                      form.auto_sizing || form.aspect_ratio === "auto"
                        ? "w-full h-auto max-h-[290px] object-contain rounded"
                        : "h-full w-full object-cover rounded"
                    )}
                  />
                </div>
              ) : null}
            </div>

            {/* Starts & Ends at */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starts At</Label>
                <Input
                  className="mt-1 text-xs"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={set("starts_at")}
                />
              </div>
              <div>
                <Label>Ends At (Optional)</Label>
                <Input
                  className="mt-1 text-xs"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={set("ends_at")}
                />
              </div>
            </div>

            {/* Active Switch */}
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer py-1">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((current) => ({ ...current, is_active: event.target.checked }))
                }
                className="h-4 w-4 rounded border-input"
              />
              <span>Campaign is Active & Eligible to Display</span>
            </label>

            <Button className="w-full h-11 text-sm font-bold shadow-xs" disabled={saving || uploading} onClick={save}>
              {saving ? "Saving Campaign…" : form.id ? "Save Changes" : "Publish Campaign"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
