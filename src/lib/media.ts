import river from "@/assets/news-river.webp";
import sugarcane from "@/assets/news-sugarcane.webp";
import market from "@/assets/news-market.webp";
import school from "@/assets/news-school.webp";
import health from "@/assets/news-health.webp";
import cricket from "@/assets/news-cricket.webp";
import road from "@/assets/news-road.webp";

const map: Record<string, string> = {
  river,
  sugarcane,
  market,
  school,
  health,
  cricket,
  road,
  ad: market,
};

/** Resolves seeded "asset:key" references to bundled images; passes real URLs through. */
export function img(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("asset:")) return map[url.slice(6)];
  return url;
}
