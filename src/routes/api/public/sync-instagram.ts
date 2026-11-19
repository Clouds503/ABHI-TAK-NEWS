import { createFileRoute } from "@tanstack/react-router";

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

          const customItems = shortcode
            ? [{ shortcode: shortcode.trim(), caption: caption ? caption.trim() : null }]
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
          let customItems;
          const contentType = request.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const body = await request.json().catch(() => null);
            if (body && Array.isArray(body.reels)) {
              customItems = body.reels;
            } else if (body && body.shortcode) {
              customItems = [
                {
                  shortcode: body.shortcode,
                  caption: body.caption || null,
                  videoUrl: body.video_url || body.videoUrl || null,
                },
              ];
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
