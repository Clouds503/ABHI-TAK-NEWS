import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncInstagramReelsServerFn } from "@/lib/instagram.functions";

const REELS_SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown between background fetches
const LAST_REELS_SYNC_KEY = "abhitak_reels_last_sync";

/**
 * Subscribes to real-time changes on public.reels and public.reel_likes tables via Supabase Realtime.
 * Invalidates the TanStack Query 'reels' and 'admin-reels' query keys whenever reels are inserted,
 * updated, or deleted.
 */
export function useRealtimeReels(options: { autoSync?: boolean } = { autoSync: true }) {
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
    const stored = localStorage.getItem(LAST_REELS_SYNC_KEY);
    const last = stored ? parseInt(stored, 10) : 0;

    if (!force && now - last < REELS_SYNC_COOLDOWN_MS) {
      return;
    }

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);
      localStorage.setItem(LAST_REELS_SYNC_KEY, now.toString());

      const res = await syncInstagramReelsServerFn();
      if (res?.success) {
        setLastSyncTime(new Date());
        void qc.invalidateQueries({ queryKey: ["reels"] });
        void qc.invalidateQueries({ queryKey: ["admin-reels"] });
      }
    } catch (err) {
      console.warn("[useRealtimeReels] Background sync note:", err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [qc]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Initial background sync if enabled
    if (options.autoSync) {
      void triggerBackgroundSync();
    }

    // 2. Set up Supabase Realtime WebSocket channel for reels and likes
    const channel = supabase
      .channel("reels-realtime")
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
          void qc.invalidateQueries({ queryKey: ["reels"] });
          void qc.invalidateQueries({ queryKey: ["admin-reels"] });
          void qc.invalidateQueries({ queryKey: ["reel-metrics"] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reel_likes",
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["reel-metrics"] });
          void qc.invalidateQueries({ queryKey: ["admin-reel-likes-summary"] });
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    // 3. Tab visibility sync
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && options.autoSync) {
        void triggerBackgroundSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Periodic background poll (every 5 minutes)
    let intervalId: any;
    if (options.autoSync) {
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          void triggerBackgroundSync();
        }
      }, 5 * 60 * 1000);
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
