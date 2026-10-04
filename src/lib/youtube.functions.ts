import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const YT_CHANNEL_ID = "UCQVgzFyRv2RImUisFG0DSYA";

export type YtVideo = { id: string; title: string; published: string; thumb: string };

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const thumbOf = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

async function fromFeed(): Promise<YtVideo[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`);
  if (!res.ok) return [];
  const xml = await res.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((m) => {
      const e = m[1] ?? "";
      const id = e.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] ?? "";
      return {
        id,
        title: decode(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
        published: e.match(/<published>(.*?)<\/published>/)?.[1] ?? "",
        thumb: thumbOf(id),
      };
    })
    .filter((v) => v.id);
}

const UNIT_MS: Record<string, number> = {
  sec: 1e3,
  second: 1e3,
  min: 6e4,
  minute: 6e4,
  hour: 36e5,
  day: 864e5,
  week: 6048e5,
  month: 2592e6,
  year: 31536e6,
};
function relToIso(text: string | undefined): string {
  const m = text
    ?.replace(/\u00a0/g, " ")
    .match(/(\d+)\s*(sec|second|min|minute|hour|day|week|month|year)/i);
  const ms = m ? Number(m[1]) * (UNIT_MS[m[2]!.toLowerCase()] ?? 0) : 0;
  return new Date(Date.now() - ms).toISOString();
}

type InnerCtx = { apiKey: string; clientVersion: string; visitorData: string };

function parseCtx(html: string): InnerCtx | null {
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];
  const visitorData = html.match(/"VISITOR_DATA":"([^"]+)"/)?.[1] ?? "";
  return apiKey && clientVersion ? { apiKey, clientVersion, visitorData } : null;
}

// Recursively collect videos + the next continuation token from parsed YouTube JSON.
function walk(node: unknown, videos: YtVideo[], seen: Set<string>, tokens: string[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, videos, seen, tokens);
    return;
  }
  const o = node as Record<string, unknown>;
  const raw =
    typeof o["videoId"] === "string"
      ? o["videoId"]
      : typeof o["contentId"] === "string"
        ? o["contentId"]
        : null;
  const id = raw && /^[\w-]{11}$/.test(raw) ? raw : null;
  if (id && !seen.has(id)) {
    const titleObj = o["title"] as { runs?: { text?: string }[] } | undefined;
    const lockupVm = o["lockupMetadataViewModel"] as { title?: { content?: string } } | undefined;
    const meta = o["metadata"] as
      { lockupMetadataViewModel?: { title?: { content?: string } } } | undefined;
    const title: string =
      titleObj?.runs?.[0]?.text ??
      lockupVm?.title?.content ??
      meta?.lockupMetadataViewModel?.title?.content ??
      "";
    if (title) {
      seen.add(id);
      videos.push({ id, title: decode(title), published: "", thumb: thumbOf(id) });
    }
  }
  const continuationCmd = o["continuationCommand"] as { token?: unknown } | undefined;
  const token: unknown = continuationCmd?.token;
  if (typeof token === "string" && token.length > 20) tokens.push(token);
  for (const value of Object.values(o)) walk(value, videos, seen, tokens);
}

type ChannelPage = { videos: YtVideo[]; continuation: string | null };

// Read one catalog page at a time so the first videos appear immediately.
async function fromChannelPage(
  tab: "videos" | "streams",
  continuation?: string | null,
): Promise<ChannelPage> {
  const res = await fetch(`https://www.youtube.com/channel/${YT_CHANNEL_ID}/${tab}`, {
    headers: { "User-Agent": UA, "Accept-Language": "en" },
  });
  if (!res.ok) return { videos: [], continuation: null };
  const html = await res.text();
  const videos: YtVideo[] = [];
  const seen = new Set<string>();

  if (continuation) {
    const ctx = parseCtx(html);
    if (!ctx) return { videos: [], continuation: null };
    const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${ctx.apiKey}`, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/json", "Accept-Language": "en" },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: ctx.clientVersion,
            visitorData: ctx.visitorData,
          },
        },
        continuation,
      }),
    });
    if (!response.ok) return { videos: [], continuation: null };
    const json: unknown = await response.json();
    const tokens: string[] = [];
    walk(json, videos, seen, tokens);
    return { videos, continuation: tokens[tokens.length - 1] ?? null };
  }

  // First page: parse rendered items (relative dates available here).
  const parts = html.split('"richItemRenderer":').slice(1);
  for (const s of parts) {
    const chunk = s.slice(0, 15000);
    const id =
      chunk.match(/"contentId":"([\w-]{11})"/)?.[1] ?? chunk.match(/"videoId":"([\w-]{11})"/)?.[1];
    if (!id || seen.has(id)) continue;
    const title =
      chunk.match(/"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"/)?.[1] ??
      chunk.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/)?.[1] ??
      "";
    let t = title;
    try {
      t = JSON.parse(`"${title}"`);
    } catch {
      /* keep raw */
    }
    seen.add(id);
    videos.push({
      id,
      title: decode(t),
      published: relToIso(chunk.match(/"(?:content|simpleText)":"([^"]{1,40} ago)"/)?.[1]),
      thumb: thumbOf(id),
    });
  }

  return {
    videos,
    continuation: html.match(/"continuationCommand":\{"token":"([^"]+)"/)?.[1] ?? null,
  };
}

export const getChannelVideos = createServerFn({ method: "GET" }).handler(
  async (): Promise<YtVideo[]> => {
    const feed = await fromFeed().catch(() => [] as YtVideo[]);
    if (feed.length) return feed;
    const catalog = await fromChannelPage("videos").catch(() => ({
      videos: [],
      continuation: null,
    }));
    return catalog.videos;
  },
);

export type YtVideoPage = { videos: YtVideo[]; continuation: string | null };

export const getChannelVideoPage = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ continuation: z.string().nullable().optional() }).parse(data),
  )
  .handler(async ({ data }): Promise<YtVideoPage> => {
    if (data.continuation) {
      return fromChannelPage("videos", data.continuation).catch(() => ({
        videos: [],
        continuation: null,
      }));
    }

    const [feed, catalog] = await Promise.all([
      fromFeed().catch(() => [] as YtVideo[]),
      fromChannelPage("videos").catch(() => ({ videos: [], continuation: null })),
    ]);
    const merged = new Map<string, YtVideo>();
    for (const video of [...feed, ...catalog.videos])
      merged.set(video.id, merged.get(video.id) ?? video);
    return { videos: [...merged.values()], continuation: catalog.continuation };
  });

export const getLiveStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ live: boolean; videoId: string | null; title: string | null }> => {
    try {
      const res = await fetch(`https://www.youtube.com/channel/${YT_CHANNEL_ID}/live`, {
        headers: { "User-Agent": UA, "Accept-Language": "en" },
      });
      const html = await res.text();
      const live = /"isLiveNow":true/.test(html) || /"isLive":true/.test(html);
      if (!live) return { live: false, videoId: null, title: null };
      const videoId =
        html.match(
          /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/,
        )?.[1] ??
        html.match(/"videoId":"([\w-]{11})"/)?.[1] ??
        null;
      const title = html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? null;
      return { live: !!videoId, videoId, title: title ? decode(title) : null };
    } catch {
      return { live: false, videoId: null, title: null };
    }
  },
);
