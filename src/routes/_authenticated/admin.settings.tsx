import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Settings,
  Upload,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Sparkles,
  Smartphone,
  Monitor,
  Globe,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useSiteSettings,
  uploadSiteAsset,
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/site-settings";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [{ title: "Site Identity & Logo — Abhitak CMS" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { settings, updateSettings, isUpdating } = useSiteSettings();

  const [form, setForm] = useState<SiteSettings>(settings);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [previewTab, setPreviewTab] = useState<"desktop" | "mobile" | "tab">("desktop");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, SVG, WebP)");
      return;
    }
    setUploadingLogo(true);
    const toastId = toast.loading("Uploading new logo image...");
    try {
      const url = await uploadSiteAsset(file, "logo");
      setForm((prev) => ({ ...prev, logo_url: url }));
      toast.success("Logo uploaded! Click 'Save Changes' to publish.", { id: toastId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo", { id: toastId });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleIconUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, ICO, SVG, WebP)");
      return;
    }
    setUploadingIcon(true);
    const toastId = toast.loading("Uploading new site icon/favicon...");
    try {
      const url = await uploadSiteAsset(file, "icon");
      setForm((prev) => ({ ...prev, icon_url: url }));
      toast.success("Site icon uploaded! Click 'Save Changes' to publish.", { id: toastId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload icon", { id: toastId });
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.site_title.trim() && !form.site_title_hi.trim()) {
      toast.error("Please enter a site name in at least English or Hindi");
      return;
    }

    const toastId = toast.loading("Saving site identity and branding...");
    try {
      await updateSettings(form);
      toast.success("Site settings updated successfully! Live across web and mobile.", {
        id: toastId,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings", { id: toastId });
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset site name, logo, and icon back to default Abhitak branding?")) {
      setForm(DEFAULT_SITE_SETTINGS);
      toast.info("Restored default values in form. Click 'Save Changes' to apply.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Site Identity & Logo</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Customize your site name, Hindi/English masthead, logo, and app icon.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isUpdating || uploadingLogo || uploadingIcon}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={isUpdating || uploadingLogo || uploadingIcon}
            className="gap-2 bg-primary px-4 font-semibold shadow-xs"
          >
            <Save className="h-4 w-4" />
            {isUpdating ? "Saving Changes..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Main Grid: Form on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Card 1: Site Names & Titles */}
          <div className="rounded-xl border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b pb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Publication Name & Titles</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="site_title" className="text-xs font-semibold uppercase text-muted-foreground">
                    Site Name (English)
                  </Label>
                  <Input
                    id="site_title"
                    className="mt-1.5"
                    placeholder="e.g. Abhitak"
                    value={form.site_title}
                    onChange={(e) => setForm((p) => ({ ...p, site_title: e.target.value }))}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Displayed in English view and mobile header.
                  </p>
                </div>

                <div>
                  <Label htmlFor="site_title_hi" className="text-xs font-semibold uppercase text-muted-foreground">
                    Site Name (Hindi / स्थानीय नाम)
                  </Label>
                  <Input
                    id="site_title_hi"
                    className="mt-1.5 font-medium"
                    placeholder="e.g. अभी तक"
                    value={form.site_title_hi}
                    onChange={(e) => setForm((p) => ({ ...p, site_title_hi: e.target.value }))}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Displayed in Hindi view and masthead.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="tagline" className="text-xs font-semibold uppercase text-muted-foreground">
                    Tagline (English)
                  </Label>
                  <Input
                    id="tagline"
                    className="mt-1.5 text-xs"
                    placeholder="e.g. Truth · Timely · Foremost"
                    value={form.tagline || ""}
                    onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="tagline_hi" className="text-xs font-semibold uppercase text-muted-foreground">
                    Tagline (Hindi / ध्येय वाक्य)
                  </Label>
                  <Input
                    id="tagline_hi"
                    className="mt-1.5 text-xs font-medium"
                    placeholder="e.g. सच, समय पर, सबसे पहले"
                    value={form.tagline_hi || ""}
                    onChange={(e) => setForm((p) => ({ ...p, tagline_hi: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-xs font-semibold uppercase text-muted-foreground">
                  Sub-Masthead / Description
                </Label>
                <Input
                  id="description"
                  className="mt-1.5 text-xs"
                  placeholder="e.g. Premier Digital Broadsheet & News Network"
                  value={form.description || ""}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Shown beneath the masthead title on desktop view.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Main Logo */}
          <div className="rounded-xl border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Publication Logo (मुख्य लोगो)</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">App header & masthead</span>
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* Logo Preview Square */}
              <div className="flex flex-col items-center">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-checkerboard p-2 shadow-xs">
                  <img
                    src={form.logo_url || "/pwa-192.png"}
                    alt="Logo Preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/pwa-192.png";
                    }}
                  />
                </div>
                <span className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Current Logo
                </span>
              </div>

              {/* Upload & URL Controls */}
              <div className="flex-1 space-y-3">
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingLogo || isUpdating}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleLogoUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo || isUpdating}
                    className="w-full gap-2 border-dashed font-medium"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingLogo ? "Uploading Logo..." : "Upload New Logo Image"}
                  </Button>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Recommended: Square PNG with transparent background or SVG. 512×512px.
                  </p>
                </div>

                <div>
                  <Label htmlFor="logo_url" className="text-xs text-muted-foreground">
                    Or Image URL directly:
                  </Label>
                  <Input
                    id="logo_url"
                    className="mt-1 font-mono text-xs"
                    placeholder="/pwa-192.png or https://..."
                    value={form.logo_url}
                    onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Site Icon / Favicon */}
          <div className="rounded-xl border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Site Icon & Favicon (फ़ेविकॉन / ऐप आइकन)</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">Browser tab & mobile shortcuts</span>
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* Icon Preview */}
              <div className="flex flex-col items-center">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-checkerboard p-1.5 shadow-xs">
                  <img
                    src={form.icon_url || "/favicon.png"}
                    alt="Icon Preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/favicon.png";
                    }}
                  />
                </div>
                <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Current Icon
                </span>
              </div>

              {/* Upload & URL Controls */}
              <div className="flex-1 space-y-3">
                <div>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingIcon || isUpdating}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleIconUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => iconInputRef.current?.click()}
                    disabled={uploadingIcon || isUpdating}
                    className="w-full gap-2 border-dashed font-medium"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingIcon ? "Uploading Icon..." : "Upload New Favicon / App Icon"}
                  </Button>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Recommended: 192×192px or 512×512px PNG, WebP, or ICO.
                  </p>
                </div>

                <div>
                  <Label htmlFor="icon_url" className="text-xs text-muted-foreground">
                    Or Icon URL directly:
                  </Label>
                  <Input
                    id="icon_url"
                    className="mt-1 font-mono text-xs"
                    placeholder="/favicon.png or https://..."
                    value={form.icon_url}
                    onChange={(e) => setForm((p) => ({ ...p, icon_url: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Live Preview (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="sticky top-6 rounded-xl border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <h2 className="text-base font-semibold">Live Preview</h2>
              </div>

              {/* Tab Selector */}
              <div className="flex rounded-lg bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewTab("desktop")}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    previewTab === "desktop"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="h-3 w-3" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("mobile")}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    previewTab === "mobile"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="h-3 w-3" />
                  Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("tab")}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    previewTab === "tab"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="h-3 w-3" />
                  Tab
                </button>
              </div>
            </div>

            <div className="mt-4">
              {/* Preview 1: Desktop Masthead */}
              {previewTab === "desktop" && (
                <div className="space-y-3">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Desktop Masthead Header:
                  </span>
                  <div className="rounded-lg border bg-background p-6 text-center shadow-xs">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-3">
                        <img
                          src={form.logo_url || "/pwa-192.png"}
                          alt="Logo"
                          className="h-12 w-12 rounded-[6px] object-contain drop-shadow-sm"
                          onError={(e) => {
                            e.currentTarget.src = "/pwa-192.png";
                          }}
                        />
                        <span className="font-serif text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                          {form.site_title || "Site Title"}
                        </span>
                      </div>
                      <div className="mt-1 font-serif text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                        {form.tagline || form.tagline_hi || "Truth · Timely · Foremost"}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {form.description || "Premier Digital Broadsheet & News Network"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-background p-4 text-center shadow-xs">
                    <span className="text-[10px] text-muted-foreground">Hindi View Masthead:</span>
                    <div className="mt-1 flex flex-col items-center">
                      <div className="flex items-center gap-2">
                        <img
                          src={form.logo_url || "/pwa-192.png"}
                          alt="Logo"
                          className="h-8 w-8 rounded-[6px] object-contain"
                          onError={(e) => {
                            e.currentTarget.src = "/pwa-192.png";
                          }}
                        />
                        <span className="font-serif text-2xl font-black text-foreground">
                          {form.site_title_hi || "अभी तक"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] font-bold text-primary">
                        {form.tagline_hi || "सच, समय पर, सबसे पहले"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview 2: Mobile Header */}
              {previewTab === "mobile" && (
                <div className="space-y-3">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Mobile Phone Navigation Bar:
                  </span>
                  <div className="mx-auto max-w-[320px] rounded-2xl border-4 border-muted bg-background shadow-md overflow-hidden">
                    <div className="bg-muted px-4 py-1 text-center text-[10px] font-bold text-muted-foreground">
                      Mobile Screen
                    </div>
                    <div className="flex items-center justify-between border-b bg-background px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={form.logo_url || "/pwa-192.png"}
                          alt="Logo"
                          className="h-8 w-8 rounded-[6px] object-contain shadow-xs"
                          onError={(e) => {
                            e.currentTarget.src = "/pwa-192.png";
                          }}
                        />
                        <div className="leading-tight">
                          <div className="font-serif text-sm font-bold text-foreground">
                            {form.site_title || "Site Title"}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            News Network
                          </div>
                        </div>
                      </div>
                      <div className="h-6 w-14 rounded-full bg-primary/10" />
                    </div>
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      App Feed & Content Area
                    </div>
                  </div>
                </div>
              )}

              {/* Preview 3: Browser Tab Mockup */}
              {previewTab === "tab" && (
                <div className="space-y-3">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Browser Tab & Bookmark Bar:
                  </span>
                  <div className="rounded-lg border bg-muted/60 p-3 shadow-xs">
                    <div className="inline-flex max-w-full items-center gap-2 rounded-t-lg border-t border-x bg-background px-3 py-2 shadow-xs">
                      <img
                        src={form.icon_url || "/favicon.png"}
                        alt="Favicon"
                        className="h-4 w-4 shrink-0 rounded-xs object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/favicon.png";
                        }}
                      />
                      <span className="truncate text-xs font-medium text-foreground">
                        {form.site_title} — {form.description || "District News"}
                      </span>
                    </div>
                    <div className="rounded-b-md border bg-background p-4 text-center text-xs text-muted-foreground">
                      Web page content viewport
                    </div>
                  </div>
                </div>
              )}

              {/* Note about real-time sync */}
              <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <span className="font-semibold text-primary">Instant Cloud Sync:</span> Saving here
                    updates the title, logo, and icon for all visitors on web, desktop, and mobile app immediately
                    without needing to push a new build or app store release.
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isUpdating || uploadingLogo || uploadingIcon}
                  className="w-full gap-2 bg-primary font-semibold"
                >
                  <Save className="h-4 w-4" />
                  {isUpdating ? "Saving Settings..." : "Save and Apply"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
