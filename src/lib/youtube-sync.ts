import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultSupabase } from "@/integrations/supabase/client";

export const YOUTUBE_CHANNEL_ID = "UCQVgzFyRv2RImUisFG0DSYA";
export const YOUTUBE_RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;

export type YouTubeRssVideo = {
  id: string; // video ID e.g. "dQw4w9WgXcQ"
  title: string;
  published: string;
  thumbnail: string;
  videoUrl: string;
};

/**
 * Fetches and parses the YouTube channel RSS feed XML cleanly without external dependencies.
 */
export async function fetchYouTubeRssVideos(): Promise<YouTubeRssVideo[]> {
  const res = await fetch(YOUTUBE_RSS_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube RSS feed: status ${res.status}`);
  }

  const xmlText = await res.text();
  const entries: YouTubeRssVideo[] = [];

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryBlock = match[1];
    if (!entryBlock) continue;

    const videoIdMatch = entryBlock.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entryBlock.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entryBlock.match(/<published>([^<]+)<\/published>/);
    const mediaThumbMatch = entryBlock.match(/<media:thumbnail[^>]+url="([^"]+)"/);

    const videoId = videoIdMatch?.[1] ? videoIdMatch[1].trim() : null;
    const title = titleMatch?.[1] ? titleMatch[1].trim() : null;
    const published = publishedMatch?.[1] ? publishedMatch[1].trim() : new Date().toISOString();
    const thumbnail = mediaThumbMatch?.[1]
      ? mediaThumbMatch[1]
      : videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : "";

    if (videoId && title) {
      entries.push({
        id: videoId,
        title,
        published,
        thumbnail,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
  }

  return entries;
}

/**
 * Syncs YouTube RSS feed videos into public.videos table in Supabase.
 */
export async function syncYouTubeVideosToDatabase(
  client: SupabaseClient = defaultSupabase as unknown as SupabaseClient,
) {
  const videos = await fetchYouTubeRssVideos();
  if (!videos.length) {
    return { success: true, count: 0, message: "No videos found in RSS feed" };
  }

  let synced = 0;
  for (const v of videos) {
    const { data: existing } = await client
      .from("videos")
      .select("id")
      .eq("video_url", v.videoUrl)
      .maybeSingle();

    const videoData = {
      title_hi: v.title,
      title_en: v.title,
      video_url: v.videoUrl,
      thumbnail_url: v.thumbnail,
      status: "published" as const,
      published_at: v.published,
    };

    if (existing) {
      await client.from("videos").update(videoData).eq("id", existing.id);
    } else {
      await client.from("videos").insert(videoData);
    }
    synced++;
  }

  return { success: true, count: synced };
}
