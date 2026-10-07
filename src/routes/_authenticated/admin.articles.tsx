import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { categoriesQuery, townsQuery, citiesQuery, villagesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UploadNote } from "@/components/UploadNote";
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
  category_id: "",
  town_id: "",
  city_id: "",
  village_id: "",
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
    setF(
      a
        ? ({
            ...empty,
            ...Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v ?? ""])),
            is_breaking: a.is_breaking,
            is_featured: a.is_featured,
          } as typeof empty)
        : empty,
    );
    setOpen(true);
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    const path = `${user!.id}/cover-${crypto.randomUUID()}-${file.name.replace(/[^\w.]/g, "_")}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = await supabase.storage
      .from("media")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    setF((p) => ({ ...p, cover_url: data?.signedUrl ?? "" }));
    setUploading(false);
  };

  const save = async () => {
    const slug = f.slug || slugify(f.title_en || f.title_hi);
    const parsed = schema.safeParse({ ...f, slug });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message);
      return;
    }
    const row = {
      slug,
      title_hi: f.title_hi,
      title_en: f.title_en || null,
      summary_hi: f.summary_hi || null,
      summary_en: f.summary_en || null,
      body_hi: f.body_hi || null,
      body_en: f.body_en || null,
      cover_url: f.cover_url || null,
      category_id: f.category_id || null,
      town_id: f.town_id || null,
      city_id: f.city_id || null,
      village_id: f.village_id || null,
      status: f.status,
      is_breaking: f.is_breaking,
      is_featured: f.is_featured,
      published_at: f.status === "published" ? new Date().toISOString() : null,
    };
    const res = f.id
      ? await supabase.from("articles").update(row).eq("id", f.id).select("id").single()
      : await supabase
          .from("articles")
          .insert({ ...row, author_id: user!.id })
          .select("id")
          .single();
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

  const set =
    (k: keyof typeof empty) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (k === "town_id") {
        // Clear village when town changes (village belongs to a town)
        setF((p) => ({ ...p, town_id: e.target.value, village_id: "" }));
      } else {
        setF((p) => ({ ...p, [k]: e.target.value }));
      }
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
          <Button onClick={() => edit()}>+ New story</Button>
        </div>
      </div>
      <div className="mt-5 divide-y rounded-md border bg-card">
        {data?.map((a) => (
          <button
            key={a.id}
            onClick={() => edit(a)}
            className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 p-3 text-left hover:bg-muted"
          >
            <div className="min-w-0">
              <div className="truncate font-semibold">{a.title_hi}</div>
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
            </div>
            <span className="self-center rounded bg-muted px-2 py-0.5 text-xs capitalize">
              {a.status}
            </span>
          </button>
        ))}
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
                <Label>Town</Label>
                <select className={sel} value={f.town_id} onChange={set("town_id")}>
                  <option value="">—</option>
                  {towns?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name_en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <select className={sel} value={f.city_id} onChange={set("city_id")}>
                  <option value="">—</option>
                  {cities?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Village</Label>
                <select
                  className={sel}
                  value={f.village_id}
                  onChange={set("village_id")}
                  disabled={!f.town_id}
                >
                  <option value="">—</option>
                  {villages?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name_en}
                    </option>
                  ))}
                </select>
                {!f.town_id && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Select a Town first</p>
                )}
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
            <Button onClick={save} className="w-full">
              Save
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
