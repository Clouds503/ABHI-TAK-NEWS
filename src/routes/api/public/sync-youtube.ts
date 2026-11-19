import { createFileRoute } from "@tanstack/react-router";
import { YOUTUBE_CHANNEL_ID, YOUTUBE_RSS_URL } from "@/lib/youtube-sync";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/public/sync-youtube")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      },

      /**
       * GET Handler:
       * 1. Handles Google WebSub (PubSubHubbub) challenge verification.
       * 2. Handles manual / cron GET requests to trigger video sync.
       */
      GET: async ({ request }: { request: Request }) => {
        try {
          const url = new URL(request.url);
          const challenge = url.searchParams.get("hub.challenge");
          const mode = url.searchParams.get("hub.mode");
          const topic = url.searchParams.get("hub.topic");

          // WebSub verification handshake from Google PubSubHubbub
          if (challenge) {
            console.log(
              `[WebSub] Received verification request: mode=${mode}, topic=${topic}, challenge length=${challenge.length}`,
            );

            // Verify topic channel if present
            if (topic && !topic.includes(YOUTUBE_CHANNEL_ID) && !topic.includes("videos.xml")) {
              console.warn(`[WebSub] Topic mismatch: ${topic}`);
              return new Response("Topic mismatch", { status: 404, headers: CORS_HEADERS });
            }

            // Return challenge as plain text with 200 OK
            return new Response(challenge, {
              status: 200,
              headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
            });
          }

          // Optional action to trigger WebSub subscription
          if (url.searchParams.get("action") === "subscribe") {
            const callbackUrl = `${url.origin}/api/public/sync-youtube`;
            const { requestWebSubSubscription } = await import("@/lib/youtube-sync");
            const subRes = await requestWebSubSubscription(callbackUrl);
            return Response.json(
              {
                action: "subscribe",
                callbackUrl,
                topic: YOUTUBE_RSS_URL,
                result: subRes,
              },
              { headers: CORS_HEADERS },
            );
          }

          // Normal GET request (cron job, healthcheck, or admin trigger)
          const { syncYouTubeVideosToDatabase } = await import("@/lib/youtube-sync");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await syncYouTubeVideosToDatabase(supabaseAdmin);
          return Response.json(result, { headers: CORS_HEADERS });
        } catch (err: unknown) {
          console.error("YouTube sync GET endpoint error:", err);
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : "Internal error" },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },

      /**
       * POST Handler:
       * 1. Receives real-time WebSub push notifications (application/atom+xml).
       * 2. Handles standard manual POST requests to sync videos.
       */
      POST: async ({ request }: { request: Request }) => {
        try {
          const contentType = request.headers.get("content-type") || "";
          let xmlPayload: string | undefined;

          // If YouTube WebSub sends an Atom XML push notification
          if (contentType.includes("xml")) {
            xmlPayload = await request.text();
            console.log(
              `[WebSub] Received Atom XML push notification (length: ${xmlPayload.length})`,
            );
          }

          const { syncYouTubeVideosToDatabase } = await import("@/lib/youtube-sync");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await syncYouTubeVideosToDatabase(supabaseAdmin, xmlPayload);

          return Response.json(result, { headers: CORS_HEADERS });
        } catch (err: unknown) {
          console.error("YouTube sync POST endpoint error:", err);
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : "Internal error" },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});
