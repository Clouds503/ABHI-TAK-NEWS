import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Mic,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  Eye,
  MapPin,
  Upload,
  Calendar,
  AlertCircle,
  ExternalLink,
  Trash2,
  Edit,
  Sparkles,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { categoriesQuery, townsQuery, citiesQuery, villagesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UploadNote } from "@/components/UploadNote";
import { uploadMedia } from "@/lib/upload";
import { ArticleGalleryEditor, type GalleryItem } from "@/components/ArticleGalleryEditor";
import { ArticleBodyEditor } from "@/components/ArticleBodyEditor";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/reporter")({
  head: () => ({
    meta: [
      { title: "Reporter Desk (Field Reporter Panel) — Abhitak CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReporterPanel,
});

type Article = Database["public"]["Tables"]["articles"]["Row"];

const emptyStory = {
  id: "",
  title_hi: "",
  title_en: "",
  summary_hi: "",
  summary_en: "",
  body_hi: "",
  body_en: "",
  cover_url: "",
  video_url: "",
  gallery: [] as GalleryItem[],
  category_id: "",
  town_id: "",
  city_id: "",
  village_id: "",
  district: "",
  city: "",
  village: "",
  status: "pending" as Article["status"],
};

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || `report-${Date.now()}`
  );
}

function ReporterPanel() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const { data: towns = [] } = useQuery(townsQuery);
  const { data: cities = [] } = useQuery(citiesQuery);
  const { data: cats = [] } = useQuery(categoriesQuery);

  const [form, setForm] = useState(emptyStory);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter villages by selected town
  const { data: villages = [] } = useQuery(villagesQuery(form.town_id || undefined));

  // Query articles filed by this user
  const { data: myArticles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["reporter-articles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, town:towns(name_en, name_hi), category:categories(name_en, name_hi)")
        .eq("author_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Query local leads from Jan Ki Awaaz in reporter's town
  const reporterTownId = profile?.town_id;
  const { data: localLeads = [] } = useQuery({
    queryKey: ["reporter-leads", reporterTownId],
    queryFn: async () => {
      let q = supabase
        .from("jan_ki_awaaz_posts")
        .select("id, title, description, category, created_at, status")
        .order("created_at", { ascending: false })
        .limit(6);
      if (reporterTownId) {
        q = q.eq("town_id", reporterTownId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["reporter-articles"] });
    qc.invalidateQueries({ queryKey: ["admin-articles"] });
    qc.invalidateQueries({ queryKey: ["articles"] });
  };

  const handleOpenCompose = (articleToEdit?: Article) => {
    if (articleToEdit) {
      const parsedGallery: GalleryItem[] = Array.isArray(articleToEdit.gallery)
        ? (articleToEdit.gallery as unknown as any[])
            .map((item) => ({
              url: typeof item === "string" ? item : (item?.url || ""),
              caption: typeof item === "string" ? "" : (item?.caption || ""),
            }))
            .filter((item) => !!item.url)
        : [];

      const initialDistrict =
        (articleToEdit as any)?.district || towns?.find((t) => t.id === articleToEdit?.town_id)?.name_en || "";
      const initialCity =
        (articleToEdit as any)?.city || cities?.find((c) => c.id === articleToEdit?.city_id)?.name_en || "";
      const initialVillage =
        (articleToEdit as any)?.village || villages?.find((v) => v.id === articleToEdit?.village_id)?.name_en || "";

      setForm({
        id: articleToEdit.id,
        title_hi: articleToEdit.title_hi || "",
        title_en: articleToEdit.title_en || "",
        summary_hi: articleToEdit.summary_hi || "",
        summary_en: articleToEdit.summary_en || "",
        body_hi: articleToEdit.body_hi || "",
        body_en: articleToEdit.body_en || "",
        cover_url: articleToEdit.cover_url || "",
        video_url: (articleToEdit as any)?.video_url || "",
        gallery: parsedGallery,
        category_id: articleToEdit.category_id || "",
        town_id: articleToEdit.town_id || "",
        city_id: articleToEdit.city_id || "",
        village_id: articleToEdit.village_id || "",
        district: initialDistrict,
        city: initialCity,
        village: initialVillage,
        status: articleToEdit.status,
      });
    } else {
      const reporterTownName = towns.find((t) => t.id === reporterTownId)?.name_en || "";
      setForm({
        ...emptyStory,
        town_id: reporterTownId || "",
        district: reporterTownName,
      });
    }
    setOpen(true);
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadMedia(file, "covers");
      setForm((p) => ({ ...p, cover_url: url }));
      toast.success("Scene photo uploaded successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const uploadVideo = async (file: File) => {
    setUploadingVideo(true);
    try {
      const url = await uploadMedia(file, "videos");
      setForm((p) => ({ ...p, video_url: url }));
      toast.success("Scene video uploaded successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Video upload failed");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSaveStory = async () => {
    if (!form.title_hi.trim()) {
      toast.error("Hindi headline is required for regional coverage");
      return;
    }
    setSubmitting(true);
    const slug = slugify(form.title_en || form.title_hi);

    const matchedTown = towns?.find(
      (t) =>
        t.name_en.toLowerCase() === form.district.trim().toLowerCase() ||
        t.name_hi.trim() === form.district.trim(),
    );
    const matchedCity = cities?.find(
      (c) =>
        c.name_en.toLowerCase() === form.city.trim().toLowerCase() ||
        c.name_hi.trim() === form.city.trim(),
    );
    const matchedVillage = villages?.find(
      (v) =>
        v.name_en.toLowerCase() === form.village.trim().toLowerCase() ||
        v.name_hi.trim() === form.village.trim(),
    );

    const payload: any = {
      slug,
      title_hi: form.title_hi.trim(),
      title_en: form.title_en.trim() || null,
      summary_hi: form.summary_hi.trim() || null,
      summary_en: form.summary_en.trim() || null,
      body_hi: form.body_hi.trim() || null,
      body_en: form.body_en.trim() || null,
      cover_url: form.cover_url || null,
      video_url: form.video_url || null,
      gallery: form.gallery.length > 0 ? form.gallery : null,
      category_id: form.category_id || null,
      district: form.district.trim() || null,
      city: form.city.trim() || null,
      village: form.village.trim() || null,
      town_id: matchedTown?.id || form.town_id || null,
      city_id: matchedCity?.id || form.city_id || null,
      village_id: matchedVillage?.id || form.village_id || null,
      status: form.status,
      author_id: user!.id,
    };

    try {
      if (form.id) {
        let { error } = await supabase.from("articles").update(payload).eq("id", form.id);
        if (error) {
          // Fallback if remote DB doesn't have district/city/village/video_url text columns yet
          delete payload.district;
          delete payload.city;
          delete payload.village;
          delete payload.video_url;
          const retry = await supabase.from("articles").update(payload).eq("id", form.id);
          if (retry.error) throw error;
        }
        toast.success("Ground story updated");
      } else {
        let { error } = await supabase.from("articles").insert(payload);
        if (error) {
          // Fallback if remote DB doesn't have district/city/village/video_url text columns yet
          delete payload.district;
          delete payload.city;
          delete payload.village;
          delete payload.video_url;
          const retry = await supabase.from("articles").insert(payload);
          if (retry.error) throw error;
        }
        toast.success(
          form.status === "pending"
            ? "Story filed and sent to Editorial Desk for review!"
            : "Story saved as Draft",
        );
      }

      await supabase.from("admin_activity_logs").insert({
        actor_id: user!.id,
        action: form.id ? "reporter_update" : "reporter_file",
        entity: "article",
        details: { title: form.title_hi, status: form.status },
      });

      setOpen(false);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to file story");
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const publishedCount = myArticles.filter((a) => a.status === "published").length;
  const pendingCount = myArticles.filter((a) => a.status === "pending").length;
  const draftCount = myArticles.filter((a) => a.status === "draft").length;
  const totalViews = myArticles.reduce((acc, a) => acc + (a.views || 0), 0);

  const sel = "mt-1 h-10 w-full rounded-md border border-input bg-card px-2 text-sm";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Reporter Desk</h1>
                <Badge variant="secondary" className="bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300">
                  Field Reporter Panel
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                फील्ड रिपोर्टर डेस्क — File live field reports, submit news leads, and track review status by editors
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleOpenCompose()}
            className="gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Plus className="h-4 w-4" />
            File New Ground Story
          </Button>
        </div>
      </div>

      {/* Reporter Profile & Constituency Banner */}
      <div className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
            {(profile?.full_name || user?.email || "R").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-foreground text-sm">
              {profile?.full_name || "Journalist"}
            </div>
            <div className="text-muted-foreground flex items-center gap-2">
              <span>{user?.email}</span>
              {profile?.phone && <span>· 📞 {profile.phone}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Assigned Beat / Region:</span>
          <Badge variant="outline" className="font-medium text-primary">
            📍 {towns.find((t) => t.id === profile?.town_id)?.name_en || "Regional Newsroom"}
          </Badge>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Filed</span>
            <FileText className="h-4 w-4 text-cyan-500" />
          </div>
          <div className="mt-2 text-2xl font-bold">{myArticles.length}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Ground reports submitted</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pendingCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Under editorial review</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Published Live</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {publishedCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Approved & active on app</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Readership</span>
            <Eye className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold">{totalViews.toLocaleString()}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Citizen views on your stories</p>
        </div>
      </div>

      {/* Main Grid: My Stories Ledger + Local Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stories Ledger (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">My Filed Stories Ledger</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenCompose()}
              className="text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> File Report
            </Button>
          </div>

          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {myArticles.map((a) => (
              <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-muted/30">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">
                      {a.title_hi || a.title_en}
                    </span>
                    <Badge
                      variant={
                        a.status === "published"
                          ? "default"
                          : a.status === "pending"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px] uppercase font-mono"
                    >
                      {a.status}
                    </Badge>
                  </div>
                  {a.title_en && a.title_en !== a.title_hi && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{a.title_en}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {a.town?.name_en && <span>📍 {a.town.name_en}</span>}
                    {a.category?.name_en && <span>🏷️ {a.category.name_en}</span>}
                    <span>Filed: {new Date(a.created_at).toLocaleDateString("en-IN")}</span>
                    <span>· 👁️ {a.views || 0} views</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => handleOpenCompose(a)}
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  {a.status === "published" && (
                    <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                      <Link to={`/news/${a.slug}`} target="_blank">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Live
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {myArticles.length === 0 && !articlesLoading && (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Mic className="mx-auto mb-2 h-8 w-8 text-cyan-500/50" />
                <div className="font-semibold">No stories filed yet</div>
                <p className="mt-1 text-xs">Click "+ File New Ground Story" to submit your first dispatch from the field.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Community Grievance Leads (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Local Ground Leads</h2>
            <Badge variant="outline" className="text-[10px]">Jan Ki Awaaz</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Citizen issues reported in your beat — investigate these ground complaints for upcoming news stories.
          </p>

          <div className="space-y-3">
            {localLeads.map((lead) => (
              <div key={lead.id} className="rounded-xl border bg-card p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-[10px]">
                    {lead.category}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {new Date(lead.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div className="font-semibold text-foreground">{lead.title}</div>
                <p className="text-muted-foreground line-clamp-2">{lead.description}</p>
                <div className="pt-2 border-t flex items-center justify-between">
                  <Badge variant="outline" className="text-[9px] capitalize">{lead.status}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] text-primary"
                    onClick={() => {
                      setForm((p) => ({
                        ...p,
                        title_hi: `जांच रिपोर्ट: ${lead.title}`,
                        summary_hi: `स्थानीय नागरिकों द्वारा उठाई गई समस्या: ${lead.description.slice(0, 150)}…`,
                      }));
                      setOpen(true);
                    }}
                  >
                    Turn into Story →
                  </Button>
                </div>
              </div>
            ))}

            {localLeads.length === 0 && (
              <div className="rounded-xl border p-6 text-center text-xs text-muted-foreground">
                No active civic complaints reported in this area recently.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File / Edit Story Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{form.id ? "Edit Filed Story" : "File Ground Story"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 p-4 text-xs">
            <div>
              <Label className="text-xs">Hindi Headline (स्थानीय शीर्षक) *</Label>
              <Input
                className="mt-1"
                placeholder="e.g. सलेमपुर मार्ग पर पुलिया टूटने से 5 गांवों का संपर्क टूटा"
                value={form.title_hi}
                onChange={(e) => setForm((p) => ({ ...p, title_hi: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-xs">English Headline (Optional)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Culvert Collapse Disrupts Traffic Across 5 Villages"
                value={form.title_en}
                onChange={(e) => setForm((p) => ({ ...p, title_en: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <select
                  className={sel}
                  value={form.category_id}
                  onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
                >
                  <option value="">Select Category</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">District</Label>
                <Input
                  className="mt-1 h-10 text-xs"
                  placeholder="e.g. Shamli, Muzaffarnagar"
                  value={form.district}
                  onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">City</Label>
                <Input
                  className="mt-1 h-10 text-xs"
                  placeholder="e.g. Kairana, Meerut"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                />
              </div>

              <div>
                <Label className="text-xs">Village</Label>
                <Input
                  className="mt-1 h-10 text-xs"
                  placeholder="e.g. Unn, Kandhla"
                  value={form.village}
                  onChange={(e) => setForm((p) => ({ ...p, village: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Ground / Scene Photo</Label>
              <Input
                type="file"
                accept="image/*"
                className="mt-1"
                onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
              />
              <UploadNote
                type="JPG, PNG, WebP"
                maxSize="10 MB"
                ratio="16:9 (Landscape)"
                hint="Capture high quality on-ground photos showing the issue or event."
              />
              {uploading && <div className="mt-1 text-xs text-muted-foreground">Uploading image…</div>}
              {form.cover_url && (
                <img src={form.cover_url} alt="Cover preview" className="mt-2 max-h-36 rounded object-cover" />
              )}
            </div>

            <div>
              <ArticleGalleryEditor
                items={form.gallery}
                onChange={(gallery) => setForm((p) => ({ ...p, gallery }))}
                label="Ground Photo Gallery (Multiple Photos & Captions)"
                hint="Upload multiple scene photos, evidence, or documents with captions to substantiate your ground report."
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Ground Scene Video (Optional)</Label>
                {form.video_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-destructive hover:bg-destructive/10"
                    onClick={() => setForm((p) => ({ ...p, video_url: "" }))}
                  >
                    Remove Video
                  </Button>
                )}
              </div>
              <Input
                type="file"
                accept="video/mp4,video/webm,video/*"
                className="mt-1"
                onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])}
              />
              <UploadNote
                type="MP4, WebM"
                maxSize="50 MB"
                ratio="16:9 (Landscape standard) / 9:16 (Vertical)"
                hint="Upload on-scene field video recorded from the location."
              />
              {uploadingVideo && (
                <div className="mt-1 text-xs text-muted-foreground">Uploading video…</div>
              )}
              {form.video_url && (
                <div className="mt-2 overflow-hidden rounded border bg-black">
                  <video src={form.video_url} controls playsInline className="max-h-40 w-full" />
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Short Summary (Hindi) *</Label>
              <Textarea
                className="mt-1 text-xs"
                placeholder="2-3 sentence overview for news card preview..."
                value={form.summary_hi}
                onChange={(e) => setForm((p) => ({ ...p, summary_hi: e.target.value }))}
              />
            </div>

            <div>
              <ArticleBodyEditor
                label="Full Ground Report Body (Hindi) *"
                value={form.body_hi}
                onChange={(val) => setForm((p) => ({ ...p, body_hi: val }))}
                placeholder="विस्तृत ग्राउंड रिपोर्ट लिखें या पेस्ट करें... (हेडिंग के लिए ## लगाएं या ऊपर H2 बटन दबाएं)"
                minHeight="min-h-40"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Filing Submission Status</Label>
              <div className="mt-1 flex gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="filing_status"
                    checked={form.status === "pending"}
                    onChange={() => setForm((p) => ({ ...p, status: "pending" }))}
                  />
                  <span>Submit to Editorial Desk (Review)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="filing_status"
                    checked={form.status === "draft"}
                    onChange={() => setForm((p) => ({ ...p, status: "draft" }))}
                  />
                  <span>Save as Personal Draft</span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                onClick={handleSaveStory}
                disabled={submitting || uploading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {submitting ? "Filing..." : form.status === "pending" ? "Submit to Editors" : "Save Draft"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}