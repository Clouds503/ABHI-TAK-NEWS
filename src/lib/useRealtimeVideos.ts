import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncYouTubeVideosServerFn } from "@/lib/youtube.functions";

const SYNC_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes cooldown between background fetches
const LAST_SYNC_KEY = "abhitak_yt_last_sync";

/**
 * Subscribes to real-time changes on public.videos table via Supabase Realtime WebSocket.
 * Also performs throttled background synchronization with the YouTube RSS feed
 * so new videos are fetched and broadcast in real-time.
 */
export function useRealtimeVideos(options: { autoSync?: boolean } = { autoSync: true }) {
  const qc = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const isSyncingRef = useRef(false);

  // Background sync helper
  const triggerBackgroundSync = useCallback(async (force = false) => {
    if (typeof window === "undefined") return;
    if (isSyncingRef.current) return;

    const now = Date.now();
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    const last = stored ? parseInt(stored, 10) : 0;

    if (!force && now - last < SYNC_COOLDOWN_MS) {
      return;
    }

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);
      localStorage.setItem(LAST_SYNC_KEY, now.toString());

      const res = await syncYouTubeVideosServerFn();
      if (res?.success) {
        setLastSyncTime(new Date());
        void qc.invalidateQueries({ queryKey: ["videos"] });
        void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      }
    } catch (err) {
      console.warn("[useRealtimeVideos] Background sync note:", err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [qc]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Initial background sync check if enabled
    if (options.autoSync) {
      void triggerBackgroundSync();
    }

    // 2. Set up Supabase Realtime WebSocket channel
    const channel = supabase
      .channel("videos-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "videos",
        },
        (payload) => {
          console.log("[useRealtimeVideos] Real-time event received:", payload.eventType);
          setLastSyncTime(new Date());
          void qc.invalidateQueries({ queryKey: ["videos"] });
          void qc.invalidateQueries({ queryKey: ["admin-stats"] });
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    // 3. Tab focus / visibility change sync
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && options.autoSync) {
        void triggerBackgroundSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Periodic background poll (every 4 minutes while app is open)
    let intervalId: any;
    if (options.autoSync) {
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          void triggerBackgroundSync();
        }
      }, 4 * 60 * 1000);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalId) clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [qc, options.autoSync, triggerBackgroundSync]);

  return {
    isConnected,
    isSyncing,
    lastSyncTime,
    triggerManualSync: () => triggerBackgroundSync(true),
  };
}
