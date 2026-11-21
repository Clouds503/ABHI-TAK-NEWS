import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncInstagramReelsServerFn } from "@/lib/instagram.functions";

const REELS_SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown between background fetches
const LAST_REELS_SYNC_KEY = "abhitak_reels_last_sync";

export interface UseRealtimeReelsOptions {
  autoSync?: boolean;
}

/**
 * Subscribes to real-time changes on public.reels and public.reel_likes tables via Supabase Realtime.
 * Invalidates the TanStack Query query keys (reels, admin-reels, reel-metrics, admin-reel-likes-summary)
 * whenever reels or reel likes are inserted, updated, or deleted.
 */
export function useRealtimeReels(options: UseRealtimeReelsOptions = { autoSync: true }) {
  const autoSync = options.autoSync ?? true;
  const qc = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const isSyncingRef = useRef(false);

  const invalidateReelQueries = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["reels"] });
    void qc.invalidateQueries({ queryKey: ["admin-reels"] });
    void qc.invalidateQueries({ queryKey: ["reel-metrics"] });
    void qc.invalidateQueries({ queryKey: ["admin-reel-likes-summary"] });
  }, [qc]);

  // Background sync helper
  const triggerBackgroundSync = useCallback(
    async (force = false) => {
      if (typeof window === "undefined") return { success: false };
      if (isSyncingRef.current) return { success: false };

      const now = Date.now();
      const stored = localStorage.getItem(LAST_REELS_SYNC_KEY);
      const last = stored ? parseInt(stored, 10) : 0;

      if (!force && now - last < REELS_SYNC_COOLDOWN_MS) {
        return { success: false, throttled: true };
      }

      try {
        isSyncingRef.current = true;
        setIsSyncing(true);
        localStorage.setItem(LAST_REELS_SYNC_KEY, now.toString());

        const res = await syncInstagramReelsServerFn();
        if (res?.success) {
          setLastSyncTime(new Date());
          invalidateReelQueries();
        }
        return res;
      } catch (err) {
        console.warn("[useRealtimeReels] Background sync note:", err);
        return { success: false, error: err };
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [invalidateReelQueries],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Initial background sync if enabled
    if (autoSync) {
      void triggerBackgroundSync();
    }

    // 2. Set up Supabase Realtime WebSocket channel for reels and likes with unique channel id
    const channelId = `reels-realtime-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reels",
        },
        (payload) => {
          console.log("[useRealtimeReels] Realtime event on reels:", payload.eventType);
          setLastSyncTime(new Date());
          invalidateReelQueries();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reel_likes",
        },
        (payload) => {
          console.log("[useRealtimeReels] Realtime event on reel_likes:", payload.eventType);
          setLastSyncTime(new Date());
          invalidateReelQueries();
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    // 3. Tab visibility sync
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && autoSync) {
        void triggerBackgroundSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Periodic background poll (every 5 minutes)
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (autoSync) {
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          void triggerBackgroundSync();
        }
      }, REELS_SYNC_COOLDOWN_MS);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalId) clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [autoSync, triggerBackgroundSync, invalidateReelQueries]);

  return {
    isConnected,
    isSyncing,
    lastSyncTime,
    triggerManualSync: () => triggerBackgroundSync(true),
  };
}
