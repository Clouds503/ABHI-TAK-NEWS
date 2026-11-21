import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const reelInput = z.object({
  shortcode: z.string().regex(/^[A-Za-z0-9_-]{5,40}$/),
});

const reelMetricInput = z.object({
  reelId: z.string().uuid(),
  shortcode: z.string().optional(),
});

const INSTAGRAM_HOSTS = [".cdninstagram.com", ".fbcdn.net"];
const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";

function decodeJsonString(value: string): string | null {
  try {
    const decoded = JSON.parse(`"${value}"`) as unknown;
    if (typeof decoded !== "string") return null;
    return decoded
      .replace(/\\\//g, "/")
      .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      );
  } catch {
    return null;
  }
}

function allowedMediaUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !INSTAGRAM_HOSTS.some((host) => url.hostname.endsWith(host)))
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Resolves the raw playable MP4 stream URL from Instagram for a reel shortcode.
 */
export const getInstagramReelMedia = createServerFn({ method: "GET" })
  .inputValidator((input) => reelInput.parse(input))
  .handler(async ({ data }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    try {
      const response = await fetch(
        `https://www.instagram.com/reel/${data.shortcode}/embed/captioned/`,
        {
          headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
          signal: controller.signal,
        },
      );
      if (!response.ok) return { videoUrl: null };

      const html = await response.text();
      const encodedUrl =
        html.match(/\\"video_url\\":\\"((?:\\\\.|[^"\\])*)\\"/)?.[1] ??
        html.match(/"video_url":"((?:\\.|[^"\\])*)"/)?.[1];

      return { videoUrl: allowedMediaUrl(decodeJsonString(encodedUrl ?? "")) };
    } catch {
      return { videoUrl: null };
    } finally {
      clearTimeout(timeout);
    }
  });

/**
 * Server function to auto-sync reels from @abhitaknews channel to the database.
 */
export const syncInstagramReelsServerFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const { syncInstagramReelsToDatabase } = await import("@/lib/instagram-sync");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return await syncInstagramReelsToDatabase(supabaseAdmin);
  } catch (err: unknown) {
    console.error("[syncInstagramReelsServerFn] Error:", err);
    return {
      success: false,
      count: 0,
      added: 0,
      updated: 0,
      error: err instanceof Error ? err.message : "Internal server error during Instagram sync",
    };
  }
});

/**
 * Server function to fetch caption and thumbnail from Instagram embed without login.
 */
export const fetchReelInfoServerFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      shortcode: z.string().min(3).max(60),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    try {
      const { fetchInstagramEmbedInfo } = await import("@/lib/instagram-sync");
      return await fetchInstagramEmbedInfo(data.shortcode);
    } catch {
      return { caption: null, posterUrl: null };
    }
  });

/**
 * Server function to add/update a single reel using supabaseAdmin (bypasses client RLS).
 */
export const saveReelServerFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      shortcode: z.string().min(3).max(60),
      caption: z.string().optional().nullable(),
      videoUrl: z.string().optional().nullable(),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { fetchInstagramEmbedInfo } = await import("@/lib/instagram-sync");

      let caption = data.caption?.trim() || null;
      const videoUrl = data.videoUrl?.trim() || null;

      // Auto-fetch caption from Instagram if not provided
      if (!caption) {
        const info = await fetchInstagramEmbedInfo(data.shortcode);
        if (info.caption) {
          caption = info.caption;
        }
      }

      const payload: Record<string, unknown> = {
        shortcode: data.shortcode,
        caption: caption ? caption.slice(0, 500) : null,
        is_active: true,
      };

      if (videoUrl) {
        payload["video_url"] = videoUrl;
      }

      const { data: inserted, error } = await supabaseAdmin
        .from("reels")
        .upsert(payload, { onConflict: "shortcode" })
        .select()
        .single();

      if (error) throw error;
      return { success: true, reel: inserted };
    } catch (err: unknown) {
      console.error("[saveReelServerFn] Error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save reel",
      };
    }
  });

/**
 * Server function to add multiple reels using supabaseAdmin (bypasses client RLS).
 */
export const bulkSaveReelsServerFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      shortcodes: z.array(z.string().min(3).max(60)),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { fetchInstagramEmbedInfo } = await import("@/lib/instagram-sync");

      let added = 0;
      for (const code of data.shortcodes) {
        let caption: string | null = null;
        try {
          const info = await fetchInstagramEmbedInfo(code);
          if (info.caption) caption = info.caption;
        } catch {}

        const { error } = await supabaseAdmin.from("reels").upsert(
          {
            shortcode: code,
            caption: caption ? caption.slice(0, 500) : null,
            is_active: true,
          },
          { onConflict: "shortcode" },
        );
        if (!error) added++;
      }

      return { success: true, count: added };
    } catch (err: unknown) {
      console.error("[bulkSaveReelsServerFn] Error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to bulk save reels",
      };
    }
  });

/**
 * Server function to toggle reel active state using supabaseAdmin.
 */
export const toggleReelActiveServerFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      isActive: z.boolean(),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("reels")
        .update({ is_active: data.isActive })
        .eq("id", data.id);

      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      console.error("[toggleReelActiveServerFn] Error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to toggle reel status",
      };
    }
  });

/**
 * Server function to attach uploaded video URL to a reel using supabaseAdmin.
 */
export const attachReelVideoServerFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      videoUrl: z.string(),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("reels")
        .update({ video_url: data.videoUrl })
        .eq("id", data.id);

      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      console.error("[attachReelVideoServerFn] Error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to attach video",
      };
    }
  });

/**
 * Server function to delete a reel using supabaseAdmin.
 */
export const deleteReelServerFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("reels").delete().eq("id", data.id);

      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      console.error("[deleteReelServerFn] Error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete reel",
      };
    }
  });

/**
 * Server function to record a reel view atomic and race-condition-free.
 */
export const recordReelViewServerFn = createServerFn({ method: "POST" })
  .inputValidator((input) => reelMetricInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 1. Try atomic RPC increment
      await supabaseAdmin.rpc("increment_reel_views", { _reel_id: data.reelId }).catch((rpcErr) => {
        console.debug("[recordReelViewServerFn] RPC note (column/function pending migration):", rpcErr);
      });

      // 2. Insert analytics event
      await supabaseAdmin.from("app_analytics_events").insert({
        event_type: "reel_view",
        entity_type: "reel",
        entity_id: data.reelId,
        platform: "web",
      });

      return { recorded: true };
    } catch (err: unknown) {
      console.warn("[recordReelViewServerFn] Recording note:", err);
      return { recorded: false };
    }
  });

/**
 * Server function to fetch combined metrics (views & likes) for a reel.
 */
export const getReelMetricsServerFn = createServerFn({ method: "GET" })
  .inputValidator((input) => reelMetricInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { VERIFIED_ABHITAK_REELS } = await import("@/lib/instagram-sync");

      // Initial metrics from catalog (if present)
      const catalogItem = VERIFIED_ABHITAK_REELS.find(
        (r) => r.shortcode === data.shortcode,
      );
      const baseViews = catalogItem?.initialViews ?? 0;
      const baseLikes = catalogItem?.initialLikes ?? 0;

      // In-app views from analytics events
      const { count: appViews } = await supabaseAdmin
        .from("app_analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", "reel")
        .eq("entity_id", data.reelId)
        .eq("event_type", "reel_view");

      // In-app likes from reel_likes table
      const { count: appLikes } = await supabaseAdmin
        .from("reel_likes")
        .select("id", { count: "exact", head: true })
        .eq("reel_id", data.reelId);

      return {
        views: baseViews + (appViews ?? 0),
        likes: baseLikes + (appLikes ?? 0),
      };
    } catch (err: unknown) {
      console.warn("[getReelMetricsServerFn] Error:", err);
      return { views: 0, likes: 0 };
    }
  });
