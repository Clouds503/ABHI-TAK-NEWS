import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  id: string;
  site_title: string;
  site_title_hi: string;
  tagline: string | null;
  tagline_hi: string | null;
  description: string | null;
  logo_url: string;
  icon_url: string;
  updated_at?: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: "current",
  site_title: "Abhi Tak",
  site_title_hi: "अभी तक",
  tagline: "Truth · Timely · Foremost",
  tagline_hi: "सच, समय पर, सबसे पहले",
  description: "District Bijnor News",
  logo_url: "/pwa-192.png",
  icon_url: "/favicon.png",
};

const CACHE_KEY = "abhitak_site_settings_cache";

export function getCachedSiteSettings(): SiteSettings {
  if (typeof window === "undefined") return DEFAULT_SITE_SETTINGS;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT_SITE_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SITE_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export function cacheSiteSettings(settings: SiteSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function applyHeadBranding(settings: Partial<SiteSettings>) {
  if (typeof document === "undefined") return;
  try {
    if (settings.icon_url) {
      const iconUrl = settings.icon_url;
      // Update standard favicon
      let favIcon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!favIcon) {
        favIcon = document.createElement("link");
        favIcon.rel = "icon";
        document.head.appendChild(favIcon);
      }
      favIcon.href = iconUrl;

      // Update apple-touch-icon
      let appleIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
      if (!appleIcon) {
        appleIcon = document.createElement("link");
        appleIcon.rel = "apple-touch-icon";
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = iconUrl;
    }
  } catch {
    // Ignore DOM head errors
  }
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  // 1. Try querying site_settings table first
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", "current")
      .maybeSingle();

    if (!error && data) {
      const merged: SiteSettings = {
        id: data.id || "current",
        site_title: data.site_title || DEFAULT_SITE_SETTINGS.site_title,
        site_title_hi: data.site_title_hi || DEFAULT_SITE_SETTINGS.site_title_hi,
        tagline: data.tagline ?? DEFAULT_SITE_SETTINGS.tagline,
        tagline_hi: data.tagline_hi ?? DEFAULT_SITE_SETTINGS.tagline_hi,
        description: data.description ?? DEFAULT_SITE_SETTINGS.description,
        logo_url: data.logo_url || DEFAULT_SITE_SETTINGS.logo_url,
        icon_url: data.icon_url || DEFAULT_SITE_SETTINGS.icon_url,
        updated_at: data.updated_at,
      };
      cacheSiteSettings(merged);
      applyHeadBranding(merged);
      return merged;
    }
  } catch {
    // table might not exist yet, fall through to advertisements backup
  }

  // 2. Fallback to advertisements table with placement 'site_branding'
  try {
    const { data: adData, error: adErr } = await supabase
      .from("advertisements")
      .select("*")
      .eq("placement", "site_branding")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!adErr && adData) {
      let extra: { tagline?: string; tagline_hi?: string; description?: string } = {};
      if (adData.video_url) {
        try {
          extra = JSON.parse(adData.video_url);
        } catch {
          // ignore parsing error
        }
      }

      const merged: SiteSettings = {
        id: "current",
        site_title: adData.title || DEFAULT_SITE_SETTINGS.site_title,
        site_title_hi: adData.advertiser || DEFAULT_SITE_SETTINGS.site_title_hi,
        tagline: extra.tagline ?? DEFAULT_SITE_SETTINGS.tagline,
        tagline_hi: extra.tagline_hi ?? DEFAULT_SITE_SETTINGS.tagline_hi,
        description: extra.description ?? DEFAULT_SITE_SETTINGS.description,
        logo_url: adData.image_url || DEFAULT_SITE_SETTINGS.logo_url,
        icon_url: adData.link_url || DEFAULT_SITE_SETTINGS.icon_url,
        updated_at: adData.created_at,
      };
      cacheSiteSettings(merged);
      applyHeadBranding(merged);
      return merged;
    }
  } catch {
    // ignore query errors
  }

  const cached = getCachedSiteSettings();
  applyHeadBranding(cached);
  return cached;
}

export async function saveSiteSettings(updated: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await fetchSiteSettings();
  const merged: SiteSettings = {
    ...current,
    ...updated,
    id: "current",
    updated_at: new Date().toISOString(),
  };

  // 1. Try to upsert into site_settings table
  try {
    await supabase.from("site_settings").upsert({
      id: "current",
      site_title: merged.site_title,
      site_title_hi: merged.site_title_hi,
      tagline: merged.tagline,
      tagline_hi: merged.tagline_hi,
      description: merged.description,
      logo_url: merged.logo_url,
      icon_url: merged.icon_url,
      updated_at: merged.updated_at,
    });
  } catch (err) {
    console.warn("Failed to save to site_settings table, saving to advertisements fallback", err);
  }

  // 2. Sync to advertisements table (where placement = 'site_branding')
  try {
    const extra = JSON.stringify({
      tagline: merged.tagline,
      tagline_hi: merged.tagline_hi,
      description: merged.description,
    });

    const { data: existingAds } = await supabase
      .from("advertisements")
      .select("id")
      .eq("placement", "site_branding")
      .limit(1);

    if (existingAds && existingAds.length > 0) {
      await supabase
        .from("advertisements")
        .update({
          title: merged.site_title,
          advertiser: merged.site_title_hi,
          image_url: merged.logo_url,
          link_url: merged.icon_url,
          video_url: extra,
          is_active: true,
        })
        .eq("id", existingAds[0].id);
    } else {
      await supabase.from("advertisements").insert({
        title: merged.site_title,
        advertiser: merged.site_title_hi,
        image_url: merged.logo_url,
        link_url: merged.icon_url,
        video_url: extra,
        placement: "site_branding",
        campaign_type: "settings",
        media_type: "image",
        is_active: true,
      });
    }
  } catch (err) {
    console.error("Failed to sync branding to advertisements table", err);
  }

  cacheSiteSettings(merged);
  applyHeadBranding(merged);

  return merged;
}

export async function uploadSiteAsset(file: File, type: "logo" | "icon"): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `branding/${type}-${Date.now()}-${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadErr) {
    throw new Error(`Failed to upload ${type}: ${uploadErr.message}`);
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);

  if (signErr || !signed?.signedUrl) {
    throw new Error(signErr?.message || "Failed to generate signed URL");
  }

  return signed.signedUrl;
}

export const siteSettingsQuery = queryOptions({
  queryKey: ["site-settings"],
  queryFn: fetchSiteSettings,
  staleTime: 5 * 60 * 1000,
  initialData: typeof window !== "undefined" ? getCachedSiteSettings() : DEFAULT_SITE_SETTINGS,
});

export function useSiteSettings() {
  const qc = useQueryClient();
  const query = useQuery(siteSettingsQuery);

  const mutation = useMutation({
    mutationFn: saveSiteSettings,
    onSuccess: (data) => {
      qc.setQueryData(["site-settings"], data);
      void qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });

  const settings = query.data ?? DEFAULT_SITE_SETTINGS;

  const getTitle = (lang: string = "hi") =>
    lang === "en" ? settings.site_title : settings.site_title_hi;

  const getTagline = (lang: string = "hi") =>
    lang === "en"
      ? settings.tagline || DEFAULT_SITE_SETTINGS.tagline
      : settings.tagline_hi || DEFAULT_SITE_SETTINGS.tagline_hi;

  return {
    settings,
    isLoading: query.isLoading,
    isError: query.isError,
    updateSettings: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    getTitle,
    getTagline,
  };
}
