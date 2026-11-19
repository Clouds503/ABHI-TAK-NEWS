import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Youtube,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  Save,
  ExternalLink,
  Settings,
  Sparkles,
  LogOut,
  PenTool,
  Mic,
  Megaphone,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { syncYouTubeVideosServerFn } from "@/lib/youtube.functions";
import { useRealtimeVideos } from "@/lib/useRealtimeVideos";
import { useRealtimeReels } from "@/lib/useRealtimeReels";
import { img, homeBanner } from "@/lib/media";
import { useSiteSettings } from "@/lib/site-settings";
import { uploadMedia } from "@/lib/upload";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

async function count(
  table: "articles" | "jan_ki_awaaz_posts" | "videos" | "advertisements",
  filter?: [string, string],
) {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count } = await q;
  return count ?? 0;
}

function TopBannerManager() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: bannerData } = useQuery({
    queryKey: ["admin-top-banner"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .eq("placement", "home_top")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [title, setTitle] = useState("Top Home Banner");
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bannerData) {
      setImageUrl(bannerData.image_url || "");
      setLinkUrl(bannerData.link_url || "");
      setTitle(bannerData.title || "Top Home Banner");
      setIsActive(bannerData.is_active ?? true);
    }
  }, [bannerData]);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP)");
      return;
    }
    setUploading(true);
    const toastId = toast.loading("Uploading banner image to cloud storage...");
    try {
      const url = await uploadMedia(file, "banners");
      setImageUrl(url);
      toast.success("Image uploaded successfully! Click 'Save Banner' to publish.", { id: toastId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!imageUrl) {
      toast.error("Please provide or upload a banner image");
      return;
    }
    setSaving(true);
    const toastId = toast.loading("Publishing top banner...");
    try {
      if (bannerData?.id) {
        const { error } = await supabase
          .from("advertisements")
          .update({
            title: title || "Top Home Banner",
            image_url: imageUrl,
            link_url: linkUrl || "#",
            is_active: isActive,
            placement: "home_top",
          })
          .eq("id", bannerData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("advertisements").insert({
          title: title || "Top Home Banner",
          advertiser: "Abhitak",
          image_url: imageUrl,
          link_url: linkUrl || "#",
          placement: "home_top",
          campaign_type: "promotion",
          media_type: "image",
          is_active: isActive,
          starts_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      toast.success("Top home banner updated successfully! Live on Home page.", { id: toastId });
      void qc.invalidateQueries({ queryKey: ["admin-top-banner"] });
      void qc.invalidateQueries({ queryKey: ["ads", "home_top"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save banner", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const displayImage = img(imageUrl) || (imageUrl.startsWith("http") ? imageUrl : homeBanner);

  return (
    <div className="mt-8 rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Top Home Banner (मुख्य बैनर)</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            This clean banner is featured directly at the top of the mobile and desktop home screen without any text overlays.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="banner-active" className="text-sm font-medium">
              Live on App:
            </Label>
            <Switch
              id="banner-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || uploading}
            size="sm"
            className="gap-2 bg-primary"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Banner"}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Banner Preview */}
        <div className="lg:col-span-7">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Preview
          </Label>
          <div className="mt-2 relative aspect-[16/9] w-full overflow-hidden rounded-lg border bg-muted shadow-xs">
            <img
              src={displayImage}
              alt="Home Banner Preview"
              className="h-full w-full object-cover"
            />
            {isActive ? (
              <span className="absolute top-3 left-3 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                Active
              </span>
            ) : (
              <span className="absolute top-3 left-3 rounded-full bg-muted-foreground px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Upload & Link Controls */}
        <div className="flex flex-col justify-between space-y-4 lg:col-span-5">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Upload New Banner Image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || saving}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                }}
              />
              <div className="mt-1.5 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || saving}
                  className="w-full gap-2 border-dashed"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading Image..." : "Choose Image from Device"}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Recommended: 1024×768 or 16:9 ratio. JPG, PNG, or WebP.
              </p>
            </div>

            <div>
              <Label htmlFor="banner-title" className="text-sm font-medium">
                Banner Title (Internal CMS Reference)
              </Label>
              <Input
                id="banner-title"
                className="mt-1.5"
                placeholder="e.g. Genius Kaun Quiz Show"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="banner-link" className="text-sm font-medium">
                Destination Link URL (Optional)
              </Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="banner-link"
                  placeholder="https://... (or leave '#' for non-clickable)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                {linkUrl && linkUrl !== "#" && (
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Open destination link"
                  >
                    <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tapping the banner in the app will open this website or deep link.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            💡 <b>Instant sync:</b> Changes saved here automatically update the top banner for all users on the mobile app and website without needing a new app store release.
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteIdentityQuickCard() {
  const { settings } = useSiteSettings();

  return (
    <div className="mt-8 rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-checkerboard p-1 shadow-xs">
            <img
              src={settings.logo_url || "/pwa-192.png"}
              alt="Logo"
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                e.currentTarget.src = "/pwa-192.png";
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">
                {settings.site_title} / {settings.site_title_hi}
              </h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Active Branding
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {settings.tagline || settings.tagline_hi || "Truth · Timely · Foremost"}
            </p>
          </div>
        </div>

        <Button asChild size="sm" className="gap-2 bg-primary font-semibold">
          <Link to="/admin/settings">
            <Settings className="h-4 w-4" />
            Rename Site & Change Logo →
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs text-muted-foreground">
        <div className="rounded-lg bg-muted/40 p-3">
          <span className="block font-semibold text-foreground">English Masthead</span>
          <span className="text-sm font-serif text-foreground font-bold">{settings.site_title}</span>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <span className="block font-semibold text-foreground">Hindi Masthead (स्थानीय)</span>
          <span className="text-sm font-serif text-foreground font-bold">{settings.site_title_hi}</span>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
          <div>
            <span className="block font-semibold text-foreground">Favicon & Icon</span>
            <span className="text-xs text-muted-foreground">Active in tabs & shortcuts</span>
          </div>
          <img
            src={settings.icon_url || "/favicon.png"}
            alt="Favicon preview"
            className="h-6 w-6 rounded-xs border object-contain p-0.5"
            onError={(e) => {
              e.currentTarget.src = "/favicon.png";
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, isAdmin, isEditor, isModerator, isReporter, loading } = useAuth();
  const [syncingYt, setSyncingYt] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      if (isEditor) {
        navigate({ to: "/admin/editor", replace: true });
      } else if (isModerator) {
        navigate({ to: "/admin/moderator", replace: true });
      } else if (isReporter) {
        navigate({ to: "/admin/reporter", replace: true });
      }
    }
  }, [loading, isAdmin, isEditor, isModerator, isReporter, navigate]);

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
    queryFn: async () =>
      (
        await supabase
          .from("admin_activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10)
      ).data ?? [],
  });

  const syncServerVideos = useServerFn(syncYouTubeVideosServerFn);
  useRealtimeVideos();
  useRealtimeReels();

  const handleSyncYouTube = async () => {
    setSyncingYt(true);
    const toastId = toast.loading("Syncing YouTube channel videos...");
    try {
      const res = await syncServerVideos();
      if (res.success) {
        toast.success(`Successfully synced ${res.count} videos from YouTube!`, {
          id: toastId,
          description: res.latestVideoTitle ? `Latest: ${res.latestVideoTitle}` : undefined,
        });
        void qc.invalidateQueries({ queryKey: ["admin-stats"] });
        void qc.invalidateQueries({ queryKey: ["videos"] });
      } else {
        toast.error(res.message || res.error || "Could not sync YouTube videos", { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to sync YouTube videos", {
        id: toastId,
      });
    } finally {
      setSyncingYt(false);
    }
  };

  const cards = [
    { label: "Pending issues", v: data?.pending, to: "/admin/moderation", hot: true },
    { label: "Total issues", v: data?.issues, to: "/admin/moderation" },
    { label: "Published news", v: data?.published, to: "/admin/articles" },
    { label: "Drafts", v: data?.drafts, to: "/admin/articles" },
    { label: "Videos", v: data?.videos, to: "/admin/analytics" },
    { label: "Active ads & promotions", v: data?.ads, to: "/admin/ads" },
    { label: "Newsroom Analytics", v: "View →", to: "/admin/analytics", special: true },
    { label: "Registered users", v: undefined, to: "/admin/users" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Newsroom dashboard</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncYouTube}
            disabled={syncingYt}
            className="gap-2"
          >
            {syncingYt ? (
              <RefreshCw className="h-4 w-4 animate-spin text-youtube" />
            ) : (
              <Youtube className="h-4 w-4 text-youtube" />
            )}
            Sync YouTube Videos
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link to="/admin/settings">
              <Settings className="h-4 w-4" />
              Site Identity & Logo
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10">
            <Link to="/">
              <LogOut className="h-4 w-4" />
              Exit Admin
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link to="/admin/export">
              <Download className="h-4 w-4" />
              Export Data
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-2 bg-primary">
            <Link to="/admin/analytics">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
          </Button>
        </div>
      </div>

      {/* Role Desks & Dedicated Workspaces */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Role Desks & Dedicated Workspaces
          </h2>
          <span className="text-[11px] text-muted-foreground">Tailored workflow panels for staff</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            to="/admin/editor"
            className="group rounded-xl border bg-card p-4 transition-all hover:border-amber-400 hover:shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <PenTool className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-amber-600 group-hover:translate-x-0.5 transition-transform">
                  Open Desk →
                </span>
              </div>
              <div className="mt-3 font-bold text-foreground">Editorial Desk</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review reporter drafts, approve breaking stories, schedule & manage reels
              </p>
            </div>
            <div className="mt-3 pt-2 border-t text-[11px] font-medium text-amber-600/80">
              For Editors & Lead Journalists
            </div>
          </Link>

          <Link
            to="/admin/moderator"
            className="group rounded-xl border bg-card p-4 transition-all hover:border-emerald-400 hover:shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Megaphone className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                  Open Desk →
                </span>
              </div>
              <div className="mt-3 font-bold text-foreground">Moderation Desk</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Jan Ki Awaaz complaints, verify community issues & forward to departments
              </p>
            </div>
            <div className="mt-3 pt-2 border-t text-[11px] font-medium text-emerald-600/80">
              For Community & Civic Moderators
            </div>
          </Link>

          <Link
            to="/admin/reporter"
            className="group rounded-xl border bg-card p-4 transition-all hover:border-cyan-400 hover:shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                  <Mic className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-cyan-600 group-hover:translate-x-0.5 transition-transform">
                  Open Desk →
                </span>
              </div>
              <div className="mt-3 font-bold text-foreground">Reporter Desk</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                File ground stories, upload scene photos & track editorial review status
              </p>
            </div>
            <div className="mt-3 pt-2 border-t text-[11px] font-medium text-cyan-600/80">
              For Ground & Regional Reporters
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Newsroom Overview & Quick Metrics
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const inner = (
            <div
              className={`rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm ${
                c.hot && c.v ? "border-primary" : ""
              } ${c.special ? "border-primary/40 bg-primary/5" : ""}`}
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div
                className={`mt-1 text-2xl font-bold ${c.hot && c.v ? "text-primary" : ""} ${
                  c.special ? "text-primary text-xl font-semibold" : ""
                }`}
              >
                {c.v ?? "—"}
              </div>
            </div>
          );
          return c.to ? (
            <Link key={c.label} to={c.to}>
              {inner}
            </Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
        </div>
      </div>

      <SiteIdentityQuickCard />

      <TopBannerManager />

      <h2 className="mt-10 text-lg font-bold">Recent activity</h2>
      <div className="mt-3 divide-y rounded-md border bg-card">
        {!logs?.length && <div className="p-4 text-sm text-muted-foreground">No activity yet.</div>}
        {logs?.map((l) => (
          <div key={l.id} className="flex justify-between gap-3 p-3 text-sm">
            <span>
              <b>{l.action}</b> · {l.entity}
            </span>
            <span className="text-muted-foreground">
              {new Date(l.created_at).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
