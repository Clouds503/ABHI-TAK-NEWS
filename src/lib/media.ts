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
  return fallbackPool[hash % fallbackPool.length];
}

/** Resolves seeded "asset:key" references to bundled images; passes real URLs through. */
export function img(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("asset:")) return map[url.slice(6)] ?? river;
  if (url.includes("wp-content") || url.includes("abhitaknews.in/wp-content")) {
    return getStableFallback(url);
  }
  return url;
}
