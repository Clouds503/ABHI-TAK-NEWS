export const LIVE_CHANNEL_STREAM_URL =
  "http://abhitaknews.livebox.co.in/AbhitakNewshls/ABHITAKNEWS.m3u8";
export const LIVE_CHANNEL_STREAM_HTTPS_URL =
  "https://abhitaknews.livebox.co.in/AbhitakNewshls/ABHITAKNEWS.m3u8";

/**
 * Returns the correct protocol URL to prevent browser Mixed-Content blocking on HTTPS.
 */
export function getLiveChannelStreamUrl(customUrl?: string): string {
  const url = customUrl || LIVE_CHANNEL_STREAM_URL;
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return url.replace(/^http:\/\//i, "https://");
  }
  return url;
}
