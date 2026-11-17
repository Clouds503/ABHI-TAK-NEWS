import type { SupabaseClient } from "@supabase/supabase-js";

export const YOUTUBE_CHANNEL_ID = "UCQVgzFyRv2RImUisFG0DSYA";
export const YOUTUBE_RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
export const WEBSUB_HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";

export type YouTubeRssVideo = {
  id: string; // video ID e.g. "zKlOHmq_2OE"
  title: string;
  published: string;
  thumbnail: string;
  videoUrl: string;
};

export type SyncResult = {
  success: boolean;
  count: number;
  message?: string;
  error?: string;
  latestVideoTitle?: string;
};

/**
 * Decodes XML/HTML entity references cleanly.
 */
export function decodeXmlEntities(s: string): string {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCharCode(Number(code));
      } catch {
        return "";
      }
    });
}

/**
 * Parses Atom XML (from YouTube RSS feed or WebSub webhook payload).
 */
export function parseYouTubeAtomXml(xmlText: string): YouTubeRssVideo[] {
  if (!xmlText) return [];

  const entries: YouTubeRssVideo[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryBlock = match[1];
    if (!entryBlock) continue;

    const videoIdMatch =
      entryBlock.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) ||
      entryBlock.match(/<id>[^<]*yt:video:([^<]+)<\/id>/);

    const titleMatch = entryBlock.match(/<title>([^<]+)<\/title>/);
    const publishedMatch =
      entryBlock.match(/<published>([^<]+)<\/published>/) ||
      entryBlock.match(/<updated>([^<]+)<\/updated>/);

    const mediaThumbMatch = entryBlock.match(/<media:thumbnail[^>]+url="([^"]+)"/);

    const videoId = videoIdMatch?.[1] ? videoIdMatch[1].trim() : null;
    const rawTitle = titleMatch?.[1] ? titleMatch[1].trim() : null;
    const published = publishedMatch?.[1] ? publishedMatch[1].trim() : new Date().toISOString();

    const thumbnail = mediaThumbMatch?.[1]
      ? mediaThumbMatch[1]
      : videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : "";

    if (videoId && rawTitle) {
      entries.push({
        id: videoId,
        title: decodeXmlEntities(rawTitle),
        published,
        thumbnail,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
  }

  return entries;
}

/**
 * Fetches and parses the YouTube channel RSS feed XML.
 */
export async function fetchYouTubeRssVideos(): Promise<YouTubeRssVideo[]> {
  const res = await fetch(YOUTUBE_RSS_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/atom+xml,application/xml,text/xml",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube RSS feed: status ${res.status}`);
  }

  const xmlText = await res.text();
  return parseYouTubeAtomXml(xmlText);
}

/**
 * Syncs YouTube RSS feed videos (or provided WebSub XML payload) into public.videos table in Supabase.
 * Uses atomic upsert on conflict with video_url.
 */
export async function syncYouTubeVideosToDatabase(
  client?: SupabaseClient,
  customXml?: string,
): Promise<SyncResult> {
  try {
    const dbClient =
      client ??
      ((await import("@/integrations/supabase/client")).supabase as unknown as SupabaseClient);

    const videos = customXml ? parseYouTubeAtomXml(customXml) : await fetchYouTubeRssVideos();

    if (!videos.length) {
      return { success: true, count: 0, message: "No videos found in feed/payload" };
    }

    const videoData = videos.map((v) => ({
      title_hi: v.title,
      title_en: v.title,
      video_url: v.videoUrl,
      thumbnail_url: v.thumbnail,
      status: "published" as const,
      published_at: v.published,
    }));

    // Perform atomic upsert on video_url
    const { data, error } = await dbClient
      .from("videos")
      .upsert(videoData, { onConflict: "video_url", ignoreDuplicates: false })
      .select("id, title_hi");

    if (error) {
      console.error("[YouTube Sync] Supabase upsert error:", error);
      return {
        success: false,
        count: 0,
        error: error.message,
        message: `Database sync failed: ${error.message}`,
      };
    }

    const count = data?.length ?? videoData.length;
    return {
      success: true,
      count,
      latestVideoTitle: videos[0]?.title,
      message: `Successfully synced ${count} video(s)`,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[YouTube Sync] Unexpected error:", errMsg);
    return {
      success: false,
      count: 0,
      error: errMsg,
      message: `Sync failed: ${errMsg}`,
    };
  }
}

/**
 * Requests WebSub (PubSubHubbub) subscription from Google Hub for real-time video notifications.
 */
export async function requestWebSubSubscription(
  callbackUrl: string,
  mode: "subscribe" | "unsubscribe" = "subscribe",
): Promise<{ success: boolean; status: number; text: string }> {
  const params = new URLSearchParams({
    "hub.callback": callbackUrl,
    "hub.topic": YOUTUBE_RSS_URL,
    "hub.verify": "async",
    "hub.mode": mode,
    "hub.lease_seconds": "864000", // 10 days
  });

  const res = await fetch(WEBSUB_HUB_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const text = await res.text();
  return {
    success: res.status === 202 || res.status === 204 || res.status === 200,
    status: res.status,
    text,
  };
}
