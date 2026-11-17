import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/sync-instagram")({
  server: {
    handlers: {
      /**
       * GET Handler:
       * Triggered by cron jobs, scheduled tasks, or monitoring to auto-fetch new reels.
       */
      GET: async () => {
        try {
          const { syncInstagramReelsToDatabase } = await import("@/lib/instagram-sync");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await syncInstagramReelsToDatabase(supabaseAdmin);
          return Response.json(result);
        } catch (err: unknown) {
          console.error("[sync-instagram GET] Error:", err);
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : "Internal error" },
            { status: 500 },
          );
        }
      },

      /**
       * POST Handler:
       * Triggered by webhooks, admin panels, or automation triggers.
       */
      POST: async ({ request }: { request: Request }) => {
        try {
          let customItems;
          const contentType = request.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const body = await request.json().catch(() => null);
            if (body && Array.isArray(body.reels)) {
              customItems = body.reels;
            }
          }

          const { syncInstagramReelsToDatabase } = await import("@/lib/instagram-sync");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await syncInstagramReelsToDatabase(supabaseAdmin, customItems);
          return Response.json(result);
        } catch (err: unknown) {
          console.error("[sync-instagram POST] Error:", err);
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : "Internal error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
