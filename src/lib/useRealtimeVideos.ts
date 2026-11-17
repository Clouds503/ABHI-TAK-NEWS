import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to real-time changes on the public.videos table via Supabase Realtime.
 * Invalidates the TanStack Query 'videos' query key whenever videos are inserted or updated.
 */
export function useRealtimeVideos() {
  const qc = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Only subscribe in browser environments
    if (typeof window === "undefined") return;

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
          // Invalidate video queries across the app (Video Galaxy, Home, Admin)
          void qc.invalidateQueries({ queryKey: ["videos"] });
          void qc.invalidateQueries({ queryKey: ["admin-stats"] });
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return { isConnected, lastSyncTime };
}
