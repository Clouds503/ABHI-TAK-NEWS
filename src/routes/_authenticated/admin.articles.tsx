import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { exportToCsv, sanitizeExportFilename } from "@/lib/export-data";
import { categoriesQuery, townsQuery, citiesQuery, villagesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UploadNote } from "@/components/UploadNote";
import { uploadMedia } from "@/lib/upload";
import { ArticleGalleryEditor, type GalleryItem } from "@/components/ArticleGalleryEditor";
import type { Database } from "@/integrations/supabase/types";

type Article = Database["public"]["Tables"]["articles"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/articles")({
  component: Articles,
});

const empty = {
  id: "",
  slug: "",
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
  status: "draft" as Article["status"],
  is_breaking: false,
  is_featured: false,
};

const schema = z.object({
  title_hi: z.string().trim().min(5, "Hindi title required").max(250),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, dashes")
    .max(120),
});

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || `story-${Date.now()}`
  );
}

function Articles() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: towns } = useQuery(townsQuery);
  const { data: cities } = useQuery(citiesQuery);
  const { data: cats } = useQuery(categoriesQuery);
  const [f, setF] = useState(empty);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Villages are filtered by the currently selected town_id — cascade dropdown
  const { data: villages } = useQuery(villagesQuery(f.town_id || undefined));

  const { data } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () =>
      (
        await supabase
          .from("articles")
          .select("*, town:towns(name_en), city:cities(name_en), village:villages(name_en)")
          .order("created_at", { ascending: false })
          .limit(100)
      ).data ?? [],
  });

  const edit = (a?: Article) => {
    const galleryItems: GalleryItem[] = Array.isArray(a?.gallery)
      ? (a.gallery as unknown as any[])
          .map((item) => ({
            url: typeof item === "string" ? item : (item?.url || ""),
            caption: typeof item === "string" ? "" : (item?.caption || ""),
          }))
          .filter((item) => !!item.url)
      : [];

    const initialDistrict =
      (a as any)?.district || towns?.find((t) => t.id === a?.town_id)?.name_en || "";
    const initialCity =
      (a as any)?.city || cities?.find((c) => c.id === a?.city_id)?.name_en || "";
    const initialVillage =
      (a as any)?.village || villages?.find((v) => v.id === a?.village_id)?.name_en || "";

    setF(
      a
        ? ({
            ...empty,
            ...Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v ?? ""])),
            district: initialDistrict,
            city: initialCity,
            village: initialVillage,
            gallery: galleryItems,
            is_breaking: a.is_breaking,
            is_featured: a.is_featured,
          } as typeof empty)
        : empty,
    );
    setOpen(true);
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadMedia(file, "covers");
      setF((p) => ({ ...p, cover_url: url }));
      toast.success("Cover image uploaded successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload cover image");
    } finally {
      setUploading(false);
    }
  };

  const uploadVideo = async (file: File) => {
    setUploadingVideo(true);
    try {
      const url = await uploadMedia(file, "videos");
      setF((p) => ({ ...p, video_url: url }));
      toast.success("Story video uploaded successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload video");
    } finally {
      setUploadingVideo(false);
    }
  };

  const save = async () => {
    const slug = f.slug || slugify(f.title_en || f.title_hi);
    const parsed = schema.safeParse({ ...f, slug });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message);
      return;
    }

    const matchedTown = towns?.find(
      (t) =>
        t.name_en.toLowerCase() === f.district.trim().toLowerCase() ||
        t.name_hi.trim() === f.district.trim(),
    );
    const matchedCity = cities?.find(
      (c) =>
        c.name_en.toLowerCase() === f.city.trim().toLowerCase() ||
        c.name_hi.trim() === f.city.trim(),
    );
    const matchedVillage = villages?.find(
      (v) =>
        v.name_en.toLowerCase() === f.village.trim().toLowerCase() ||
        v.name_hi.trim() === f.village.trim(),
    );

    const row: any = {
      slug,
      title_hi: f.title_hi,
      title_en: f.title_en || null,
      summary_hi: f.summary_hi || null,
      summary_en: f.summary_en || null,
      body_hi: f.body_hi || null,
      body_en: f.body_en || null,
      cover_url: f.cover_url || null,
      video_url: f.video_url || null,
      gallery: f.gallery.length > 0 ? f.gallery : null,
      category_id: f.category_id || null,
      district: f.district.trim() || null,
      city: f.city.trim() || null,
      village: f.village.trim() || null,
      town_id: matchedTown?.id || f.town_id || null,
      city_id: matchedCity?.id || f.city_id || null,
      village_id: matchedVillage?.id || f.village_id || null,
      status: f.status,
      is_breaking: f.is_breaking,
      is_featured: f.is_featured,
      published_at: f.status === "published" ? new Date().toISOString() : null,
    };

    let res = f.id
      ? await supabase.from("articles").update(row).eq("id", f.id).select("id").single()
      : await supabase
          .from("articles")
          .insert({ ...row, author_id: user!.id })
          .select("id")
          .single();

    if (res.error) {
      // Fallback if remote DB doesn't have district/city/village/video_url text columns yet
      delete row.district;
      delete row.city;
      delete row.village;
      delete row.video_url;
      res = f.id
        ? await supabase.from("articles").update(row).eq("id", f.id).select("id").single()
        : await supabase
            .from("articles")
            .insert({ ...row, author_id: user!.id })
            .select("id")
            .single();
    }

    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    await supabase.from("admin_activity_logs").insert({
      actor_id: user!.id,
      action: f.id ? "update" : "create",
      entity: "article",
      entity_id: res.data.id,
    });
    toast.success("Saved");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-articles"] });
    qc.invalidateQueries({ queryKey: ["articles"] });
  };

  const hardDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("articles").delete().eq("id", deleteTarget.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (user?.id) {
        await supabase.from("admin_activity_logs").insert({
          actor_id: user.id,
          action: "delete",
          entity: "article",
          entity_id: deleteTarget.id,
        });
      }
      toast.success("Article deleted successfully");
      if (open && f.id === deleteTarget.id) {
        setOpen(false);
      }
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete article");
    } finally {
      setDeleting(false);
    }
  };

  const set =
    (k: keyof typeof empty) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setF((p) => ({ ...p, [k]: e.target.value }));
    };

  const sel = "mt-1 h-10 w-full rounded-md border border-input bg-card px-2 text-sm";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">News</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const id = toast.loading("Syncing from WordPress...");
              try {
                const { fetchWordPressPosts } = await import("@/lib/wp.functions");
                const res = await fetchWordPressPosts();
                if (!res.success || !res.posts) {
                  toast.error(res.error || "Failed to fetch from WordPress", { id });
                  return;
                }

                let imported = 0;
                for (const post of res.posts) {
                  let townId: string | null = null;
                  let categoryId: string | null = null;

                  for (const termName of post.terms) {
                    const matchedTown = towns?.find(
                      (t) => t.name_hi === termName || t.name_en === termName,
                    );
                    if (matchedTown && !townId) townId = matchedTown.id;

                    const matchedCat = cats?.find(
                      (c) => c.name_hi === termName || c.name_en === termName,
                    );
                    if (matchedCat && !categoryId) categoryId = matchedCat.id;
                  }

                  const { downloadAndStoreMedia } = await import("@/lib/media-sync");
                  const persistentCoverUrl = post.cover_url
                    ? await downloadAndStoreMedia(post.cover_url, post.slug, supabase)
                    : null;

                  const articleData = {
                    slug: post.slug,
                    title_hi: post.title_hi,
                    summary_hi: post.summary_hi,
                    body_hi: post.body_hi,
                    cover_url: persistentCoverUrl,
                    published_at: post.published_at,
                    status: "published" as const,
                    town_id: townId,
                    category_id: categoryId,
                  };

                  const { data: existing } = await supabase
                    .from("articles")
                    .select("id")
                    .eq("slug", post.slug)
                    .maybeSingle();

                  if (existing) {
                    await supabase.from("articles").update(articleData).eq("id", existing.id);
                  } else {
                    await supabase.from("articles").insert({
                      ...articleData,
                      author_id: user?.id ?? null,
                    });
                  }
                  imported++;
                }

                toast.success(`Synced ${imported} articles from WordPress`, { id });
                qc.invalidateQueries({ queryKey: ["admin-articles"] });
                qc.invalidateQueries({ queryKey: ["articles"] });
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Sync error", { id });
              }
            }}
          >
            Sync WP
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              if (!data || data.length === 0) {
                toast.error("No articles available to export");
                return;
              }
              exportToCsv(
                sanitizeExportFilename("news_articles", "csv"),
                data,
                [
                  { key: "id", label: "Article ID" },
                  { key: "title_hi", label: "Title (Hindi)" },
                  { key: "title_en", label: "Title (English)" },
                  { key: "slug", label: "Slug" },
                  { key: "status", label: "Status" },
                  { key: "views", label: "Views" },
                  { key: "district", label: "District" },
                  { key: "city", label: "City" },
                  { key: "village", label: "Village" },
                  { key: "is_breaking", label: "Breaking", transform: (v) => (v ? "Yes" : "No") },
                  { key: "is_featured", label: "Featured", transform: (v) => (v ? "Yes" : "No") },
                  { key: "published_at", label: "Published Date" },
                  { key: "created_at", label: "Created Date" },
                ]
              );
              toast.success(`Exported ${data.length} articles to CSV!`);
            }}
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          <Button onClick={() => edit()}>+ New story</Button>
        </div>
      </div>
      <div className="mt-5 divide-y rounded-md border bg-card">
        {data?.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/50"
          >
            <button
              type="button"
              onClick={() => edit(a)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate font-semibold hover:text-primary transition-colors">
                {a.title_hi || a.title_en || "Untitled story"}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {a.town?.name_en && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {a.town.name_en}
                  </span>
                )}
                {a.city?.name_en && (
                  <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                    {a.city.name_en}
                  </span>
                )}
                {a.village?.name_en && (
                  <span className="rounded-full bg-accent/60 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                    {a.village.name_en}
                  </span>
                )}
                <span>{new Date(a.created_at).toLocaleDateString("en-IN")}</span>
                {a.is_breaking && <span className="font-semibold text-primary">· BREAKING</span>}
              </div>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">
                {a.status}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => edit(a)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete "${a.title_hi || a.title_en || "article"}"`}
                title="Delete story"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({
                    id: a.id,
                    title: a.title_hi || a.title_en || "Untitled story",
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No articles found.
          </p>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{f.id ? "Edit story" : "New story"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 p-4">
            <div>
              <Label>Title (Hindi) *</Label>
              <Input className="mt-1" value={f.title_hi} onChange={set("title_hi")} />
            </div>
            <div>
              <Label>Title (English)</Label>
              <Input className="mt-1" value={f.title_en} onChange={set("title_en")} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                className="mt-1"
                placeholder="auto from title"
                value={f.slug}
                onChange={set("slug")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select className={sel} value={f.category_id} onChange={set("category_id")}>
                  <option value="">—</option>
                  {cats?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>District</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Shamli, Muzaffarnagar"
                  value={f.district}
                  onChange={set("district")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Kairana, Budhana, Meerut"
                  value={f.city}
                  onChange={set("city")}
                />
              </div>
              <div>
                <Label>Village</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Unn, Kandhla, Titawi"
                  value={f.village}
                  onChange={set("village")}
                />
              </div>
            </div>

            <div>
              <Label>Summary (Hindi)</Label>
              <Textarea className="mt-1" value={f.summary_hi} onChange={set("summary_hi")} />
            </div>
            <div>
              <Label>Summary (English)</Label>
              <Textarea className="mt-1" value={f.summary_en} onChange={set("summary_en")} />
            </div>
            <div>
              <Label>Body (Hindi)</Label>
              <Textarea className="mt-1 min-h-40" value={f.body_hi} onChange={set("body_hi")} />
            </div>
            <div>
              <Label>Body (English)</Label>
              <Textarea className="mt-1 min-h-40" value={f.body_en} onChange={set("body_en")} />
            </div>
            <div>
              <Label>Cover image</Label>
              <Input
                type="file"
                accept="image/*"
                className="mt-1"
                onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
              />
              <UploadNote
                type="JPG, PNG, WebP"
                maxSize="10 MB"
                ratio="16:9 (Landscape standard)"
                hint="Recommended resolution: 1200×675px or 1920×1080px for crisp news cards and hero banners."
              />
              {uploading && <div className="mt-1 text-xs text-muted-foreground">Uploading…</div>}
              {f.cover_url && !f.cover_url.startsWith("asset:") && (
                <img src={f.cover_url} alt="" className="mt-2 max-h-40 rounded" />
              )}
            </div>

            <div>
              <ArticleGalleryEditor
                items={f.gallery}
                onChange={(gallery) => setF((p) => ({ ...p, gallery }))}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Story Video (Optional)</Label>
                {f.video_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => setF((p) => ({ ...p, video_url: "" }))}
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
                hint="Upload an on-ground video clip to be embedded directly into the story."
              />
              {uploadingVideo && (
                <div className="mt-1 text-xs text-muted-foreground">Uploading video…</div>
              )}
              {f.video_url && (
                <div className="mt-2 overflow-hidden rounded border bg-black">
                  <video src={f.video_url} controls playsInline className="max-h-48 w-full" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={f.is_breaking}
                  onChange={(e) => setF({ ...f, is_breaking: e.target.checked })}
                />{" "}
                Breaking
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={f.is_featured}
                  onChange={(e) => setF({ ...f, is_featured: e.target.checked })}
                />{" "}
                Featured
              </label>
            </div>
            <div>
              <Label>Status</Label>
              <select className={sel} value={f.status} onChange={set("status")}>
                {["draft", "pending", "published", "archived"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={save} className="flex-1">
                Save
              </Button>
              {f.id && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() =>
                    setDeleteTarget({
                      id: f.id,
                      title: f.title_hi || f.title_en || "Untitled story",
                    })
                  }
                  className="gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                "{deleteTarget?.title}"
              </span>
              ? This action cannot be undone and will permanently remove this story, including associated likes and bookmarks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={hardDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete Article"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
