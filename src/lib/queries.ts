import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export { siteSettingsQuery } from "./site-settings";

const ARTICLE_COLS =
  "id, slug, title_hi, title_en, summary_hi, summary_en, cover_url, is_breaking, is_featured, published_at, author_name, town:towns(slug,name_hi,name_en), category:categories(slug,name_hi,name_en)";

export const townsQuery = queryOptions({
  queryKey: ["towns"],
  staleTime: 30 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("towns")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const citiesQuery = queryOptions({
  queryKey: ["cities"],
  staleTime: 30 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  staleTime: 30 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const villagesQuery = (townId?: string) =>
  queryOptions({
    queryKey: ["villages", townId],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      let q = supabase.from("villages").select("*").eq("is_active", true).order("name_en");
      if (townId) q = q.eq("town_id", townId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const articlesQuery = (
  opts: {
    town?: string | undefined;
    city?: string | undefined;
    village?: string | undefined;
    category?: string | undefined;
    limit?: number;
    fromDate?: string | undefined;
    toDate?: string | undefined;
  } = {},
) =>
  queryOptions({
    queryKey: ["articles", opts],
    queryFn: async () => {
      let q = supabase
        .from("articles")
        .select(
          ARTICLE_COLS.replace(
            "town:towns(",
            opts.town ? "town:towns!inner(" : "town:towns(",
          ).replace(
            "category:categories(",
            opts.category ? "category:categories!inner(" : "category:categories(",
          ),
        )
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(opts.limit ?? 20);
      if (opts.town) q = q.eq("town.slug", opts.town);
      if (opts.category) q = q.eq("category.slug", opts.category);
      if (opts.city) q = q.eq("city_id", opts.city);
      if (opts.village) q = q.eq("village_id", opts.village);
      if (opts.fromDate) q = q.gte("published_at", opts.fromDate);
      if (opts.toDate) q = q.lte("published_at", opts.toDate);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as ArticleCard[];
    },
    staleTime: 2 * 60_000,
  });

export type GalleryItem = {
  url: string;
  caption?: string;
};

export type ArticleCard = {
  id: string;
  slug: string;
  title_hi: string;
  title_en: string | null;
  summary_hi: string | null;
  summary_en: string | null;
  cover_url: string | null;
  video_url?: string | null;
  gallery?: GalleryItem[] | null;
  is_breaking: boolean;
  is_featured: boolean;
  published_at: string | null;
  author_name: string | null;
  district?: string | null;
  city?: string | null;
  village?: string | null;
  town: { slug: string; name_hi: string; name_en: string } | null;
  category: { slug: string; name_hi: string; name_en: string } | null;
};

export type ArticleDetail = ArticleCard & {
  body_hi: string | null;
  body_en: string | null;
  category_id: string | null;
  district?: string | null;
  city?: string | null;
  village?: string | null;
  video_url?: string | null;
  gallery?: GalleryItem[] | null;
};

export const articleQuery = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug],
    queryFn: async () => {
      let { data, error } = await supabase
        .from("articles")
        .select(`${ARTICLE_COLS}, body_hi, body_en, category_id, gallery, video_url`)
        .eq("slug", slug)
        .maybeSingle();
      if (error) {
        // Fallback if gallery or video_url columns not yet present in remote db
        let fb = await supabase
          .from("articles")
          .select(`${ARTICLE_COLS}, body_hi, body_en, category_id, gallery`)
          .eq("slug", slug)
          .maybeSingle();
        if (fb.error) {
          fb = await supabase
            .from("articles")
            .select(`${ARTICLE_COLS}, body_hi, body_en, category_id`)
            .eq("slug", slug)
            .maybeSingle();
        }
        if (fb.error) throw error;
        data = fb.data as any;
      }
      return data as unknown as ArticleDetail | null;
    },
  });

export const videosQuery = queryOptions({
  queryKey: ["videos"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("videos")
      .select(
        "id,title_hi,title_en,video_url,thumbnail_url,duration,published_at,town:towns(name_hi,name_en)",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60_000,
});

export const liveQuery = queryOptions({
  queryKey: ["live"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("live_streams")
      .select("*")
      .order("is_live", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const adsQuery = (placement: string) =>
  queryOptions({
    queryKey: ["ads", placement],
    queryFn: async () => {
      const now = new Date().toISOString();
      const placementVariants = [
        placement,
        `${placement}_all`,
        `${placement}_mobile`,
        `${placement}_desktop`,
      ];
      const { data, error } = await supabase
        .from("advertisements")
        .select("id,title,advertiser,image_url,link_url,campaign_type,media_type,video_url,placement,device_visibility")
        .in("placement", placementVariants)
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        if (error.message.includes("device_visibility")) {
          const { data: fbData, error: fbError } = await supabase
            .from("advertisements")
            .select("id,title,advertiser,image_url,link_url,campaign_type,media_type,video_url,placement")
            .in("placement", placementVariants)
            .eq("is_active", true)
            .or(`starts_at.is.null,starts_at.lte.${now}`)
            .or(`ends_at.is.null,ends_at.gt.${now}`)
            .order("created_at", { ascending: false })
            .limit(10);
          if (fbError) throw fbError;
          return (fbData ?? []).map((row) => ({
            ...row,
            device_visibility: (row.placement.endsWith("_desktop")
              ? "desktop"
              : row.placement.endsWith("_mobile")
                ? "mobile"
                : "all") as "all" | "mobile" | "desktop",
          }));
        }
        throw error;
      }

      return (data ?? []).map((row) => ({
        ...row,
        device_visibility: (row.device_visibility ||
          (row.placement.endsWith("_desktop")
            ? "desktop"
            : row.placement.endsWith("_mobile")
              ? "mobile"
              : "all")) as "all" | "mobile" | "desktop",
      }));
    },
    staleTime: 5 * 60_000,
  });

export const jkaPublicQuery = (
  opts: { town?: string | undefined; category?: string | undefined; limit?: number } = {},
) =>
  queryOptions({
    queryKey: ["jka", opts],
    queryFn: async () => {
      let q = supabase
        .from("jka_public")
        .select(
          "id,reporter_name,category,town_id,area,district,title,description,photo_url,video_url,is_featured,status,created_at,updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(opts.limit ?? 50);
      if (opts.town) q = q.eq("town_id", opts.town);
      if (opts.category) q = q.eq("category", opts.category);
      let { data, error } = await q;
      if (error) {
        // Fallback without district if remote view not yet updated
        let fb = supabase
          .from("jka_public")
          .select(
            "id,reporter_name,category,town_id,area,title,description,photo_url,video_url,is_featured,status,created_at,updated_at",
          )
          .order("created_at", { ascending: false })
          .limit(opts.limit ?? 50);
        if (opts.town) fb = fb.eq("town_id", opts.town);
        if (opts.category) fb = fb.eq("category", opts.category);
        const fbRes = await fb;
        if (fbRes.error) throw error;
        data = fbRes.data;
      }
      return data;
    },
    staleTime: 2 * 60_000,
  });

export const epapersQuery = queryOptions({
  queryKey: ["epapers"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("epapers")
      .select("*")
      .eq("status", "published")
      .order("edition_date", { ascending: false });
    if (error) throw error;
    return data;
  },
});
