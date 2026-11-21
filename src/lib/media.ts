import river from "@/assets/news-river.webp";
import sugarcane from "@/assets/news-sugarcane.webp";
import market from "@/assets/news-market.webp";
import school from "@/assets/news-school.webp";
import health from "@/assets/news-health.webp";
import cricket from "@/assets/news-cricket.webp";
import road from "@/assets/news-road.webp";
import homeBanner from "@/assets/home-banner.webp";

export { homeBanner };

const map: Record<string, string> = {
  river,
  sugarcane,
  market,
  school,
  health,
  cricket,
  road,
  ad: market,
  "home-banner": homeBanner,
};

const fallbackPool = [river, sugarcane, market, school, health, cricket, road];

function getStableFallback(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return fallbackPool[hash % fallbackPool.length] ?? river;
}

export const DEFAULT_SHARE_IMAGE = "https://abhitak.in/pwa-512.png";
export const SITE_URL = "https://abhitak.in";

/** Resolves seeded "asset:key" references to bundled images; passes real URLs through. */
export function img(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("asset:")) return map[url.slice(6)] ?? river;
  if (url.includes("wp-content") || url.includes("abhitaknews.in/wp-content")) {
    return getStableFallback(url);
  }
  return url;
}

/**
 * Resolves an article/story image to an absolute URL suitable for Open Graph / WhatsApp / social preview cards.
 */
export function getShareImageUrl(url: string | null | undefined): string {
  if (!url) return DEFAULT_SHARE_IMAGE;

  const resolved = img(url);
  if (!resolved) return DEFAULT_SHARE_IMAGE;

  // Already an absolute URL (e.g. Supabase storage CDN, external media)
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    return resolved;
  }

  const site =
    typeof window !== "undefined" && window.location.origin && !window.location.origin.includes("localhost")
      ? window.location.origin
      : SITE_URL;

  if (resolved.startsWith("/")) {
    return `${site}${resolved}`;
  }
  return `${site}/${resolved}`;
}
