import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/sync-youtube")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { syncYouTubeVideosToDatabase } = await import("@/lib/youtube-sync");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await syncYouTubeVideosToDatabase(supabaseAdmin);
          return Response.json(result);
        } catch (err: unknown) {
          console.error("YouTube sync endpoint error:", err);
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : "Internal error" },
            { status: 500 },
          );
        }
      },
      GET: async () => {
        try {
          const { syncYouTubeVideosToDatabase } = await import("@/lib/youtube-sync");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await syncYouTubeVideosToDatabase(supabaseAdmin);
          return Response.json(result);
        } catch (err: unknown) {
          console.error("YouTube sync endpoint error:", err);
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : "Internal error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
