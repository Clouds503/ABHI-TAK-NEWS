import { createFileRoute } from "@tanstack/react-router";
import type { InstagramReelItem } from "@/lib/instagram-sync";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/public/sync-instagram")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      },

      /**
       * GET Handler:
       * Triggered by cron jobs, scheduled tasks, or webhooks to auto-fetch new reels.
       * Also supports ?shortcode=XYZ to quickly register a reel.
       */
      GET: async ({ request }: { request: Request }) => {
        try {
          const url = new URL(request.url);
          const shortcode = url.searchParams.get("shortcode");
          const caption = url.searchParams.get("caption");
          const postedAt = url.searchParams.get("posted_at") || url.searchParams.get("postedAt");
          const thumbnailUrl = url.searchParams.get("thumbnail_url") || url.searchParams.get("thumbnailUrl");
          const videoUrl = url.searchParams.get("video_url") || url.searchParams.get("videoUrl");

          const customItems: InstagramReelItem[] | undefined = shortcode
            ? [
                {
                  shortcode: shortcode.trim(),
                  caption: caption ? caption.trim() : null,
                  postedAt: postedAt ? postedAt.trim() : null,
                  thumbnailUrl: thumbnailUrl ? thumbnailUrl.trim() : null,
                  videoUrl: videoUrl ? videoUrl.trim() : null,
                },
              ]
            : undefined;

          const { syncInstagramReelsToDatabase } = await import("@/lib/instagram-sync");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await syncInstagramReelsToDatabase(supabaseAdmin, customItems);
          return Response.json(result, { headers: CORS_HEADERS });
        } catch (err: unknown) {
          console.error("[sync-instagram GET] Error:", err);
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : "Internal error" },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },

      /**
       * POST Handler:
       * Triggered by webhooks, admin panels, or automation triggers with JSON payload.
       */
      POST: async ({ request }: { request: Request }) => {
        try {
          let customItems: InstagramReelItem[] | undefined;
          const contentType = request.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const body = await request.json().catch(() => null);
            if (body && Array.isArray(body.reels)) {
              customItems = (body.reels as Record<string, unknown>[])
                .map((r) => {
                  const shortcode = String(r["shortcode"] || "").trim();
                  if (!shortcode) return null;
                  return {
                    shortcode,
                    caption: typeof r["caption"] === "string" ? r["caption"].trim() : null,
                    videoUrl:
                      typeof (r["videoUrl"] ?? r["video_url"]) === "string"
                        ? String(r["videoUrl"] ?? r["video_url"]).trim()
                        : null,
                    thumbnailUrl:
                      typeof (r["thumbnailUrl"] ?? r["thumbnail_url"]) === "string"
                        ? String(r["thumbnailUrl"] ?? r["thumbnail_url"]).trim()
                        : null,
                    postedAt:
                      typeof (r["postedAt"] ?? r["posted_at"]) === "string"
                        ? String(r["postedAt"] ?? r["posted_at"]).trim()
                        : null,
                  };
                })
                .filter((it): it is InstagramReelItem => it !== null);
            } else if (body && body.shortcode) {
              const shortcode = String(body.shortcode).trim();
              if (shortcode) {
                customItems = [
                  {
                    shortcode,
                    caption: typeof body.caption === "string" ? body.caption.trim() : null,
                    videoUrl:
                      typeof (body.videoUrl ?? body.video_url) === "string"
                        ? String(body.videoUrl ?? body.video_url).trim()
                        : null,
                    thumbnailUrl:
                      typeof (body.thumbnailUrl ?? body.thumbnail_url) === "string"
                        ? String(body.thumbnailUrl ?? body.thumbnail_url).trim()
                        : null,
                    postedAt:
                      typeof (body.postedAt ?? body.posted_at) === "string"
                        ? String(body.postedAt ?? body.posted_at).trim()
                        : null,
                  },
                ];
              }
            } else if (body && Array.isArray(body.entry)) {
              // Webhook format from Meta (e.g. Instagram Webhooks)
              const parsed: InstagramReelItem[] = [];
              for (const entry of body.entry) {
                if (Array.isArray(entry.changes)) {
                  for (const change of entry.changes) {
                    const val = change?.value;
                    const code = val?.media_id || val?.id || val?.shortcode;
                    if (code) {
                      parsed.push({
                        shortcode: String(code).trim(),
                        caption: typeof val?.caption === "string" ? val.caption.trim() : null,
                        videoUrl: typeof val?.video_url === "string" ? val.video_url.trim() : null,
                        thumbnailUrl: typeof val?.thumbnail_url === "string" ? val.thumbnail_url.trim() : null,
                        postedAt:
                          typeof val?.timestamp === "string" || typeof val?.posted_at === "string"
                            ? String(val?.timestamp ?? val?.posted_at).trim()
                            : typeof entry.time === "number"
                              ? new Date(entry.time * 1000).toISOString()
                              : null,
                      });
                    }
                  }
                }
              }
              if (parsed.length) {
                customItems = parsed;
              }
            }
          }

          const { syncInstagramReelsToDatabase } = await import("@/lib/instagram-sync");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await syncInstagramReelsToDatabase(supabaseAdmin, customItems);
          return Response.json(result, { headers: CORS_HEADERS });
        } catch (err: unknown) {
          console.error("[sync-instagram POST] Error:", err);
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : "Internal error" },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});
