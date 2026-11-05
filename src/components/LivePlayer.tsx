import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { Volume2, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIVE_CHANNEL_STREAM_URL, getLiveChannelStreamUrl } from "@/lib/live.constants";

interface LivePlayerProps {
  src?: string;
  poster?: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  soundOn?: boolean;
  onSoundChange?: (soundOn: boolean) => void;
  lang?: "hi" | "en";
}

export function LivePlayer({
  src = LIVE_CHANNEL_STREAM_URL,
  poster,
  title = "Abhi Tak Live News",
  className,
  autoPlay = true,
  soundOn = false,
  onSoundChange,
  lang = "hi",
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [internalMuted, setInternalMuted] = useState(!soundOn);

  const resolvedUrl = getLiveChannelStreamUrl(src);

  const initPlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    video.pause();
    video.removeAttribute("src");

    // Safari (iOS / macOS) native HLS support
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = resolvedUrl;
      if (autoPlay) {
        video.play().catch(() => {
          // Autoplay policy might require gesture if unmuted
        });
      }
      return;
    }

    // HLS.js for Chrome, Edge, Firefox, Android WebView
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(resolvedUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay with sound blocked
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("[LivePlayer] Network error, attempting recovery...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("[LivePlayer] Media error, recovering...");
              hls.recoverMediaError();
              break;
            default:
              console.error("[LivePlayer] Fatal unrecoverable HLS error:", data);
              hls.destroy();
              setHasError(true);
              setIsLoading(false);
              break;
          }
        }
      });
    } else {
      console.warn("[LivePlayer] HLS is not supported in this browser.");
      setHasError(true);
      setIsLoading(false);
    }
  }, [resolvedUrl, autoPlay]);

  useEffect(() => {
    initPlayer();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [initPlayer]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const shouldMute = !soundOn;
      video.muted = shouldMute;
      setInternalMuted(shouldMute);
    }
  }, [soundOn]);

  const handleUnmute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      setInternalMuted(false);
      onSoundChange?.(true);
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  };

  const handleVolumeChange = () => {
    const video = videoRef.current;
    if (video) {
      setInternalMuted(video.muted);
      onSoundChange?.(!video.muted && video.volume > 0);
    }
  };

  return (
    <div className={cn("relative h-full w-full bg-black overflow-hidden select-none", className)}>
      <video
        ref={videoRef}
        title={title}
        aria-label={title}
        poster={poster}
        playsInline
        autoPlay={autoPlay}
        muted={internalMuted}
        controls
        preload="auto"
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onVolumeChange={handleVolumeChange}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        className="h-full w-full object-contain"
      />

      {/* Loading Overlay */}
      {isLoading && !hasError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs font-semibold text-white/90">
              {lang === "hi" ? "लाइव स्ट्रीम लोड हो रहा है..." : "Connecting to Live Stream..."}
            </span>
          </div>
        </div>
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/90 p-4 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
          <h4 className="text-base font-bold text-white">
            {lang === "hi"
              ? "लाइव स्ट्रीम लोड करने में असमर्थ"
              : "Live Stream Currently Unavailable"}
          </h4>
          <p className="mt-1 text-xs text-white/70 max-w-sm">
            {lang === "hi"
              ? "कृपया अपने इंटरनेट कनेक्शन की जांच करें या पुनः प्रयास करें।"
              : "Please check your network connection and try again."}
          </p>
          <button
            type="button"
            onClick={initPlayer}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {lang === "hi" ? "पुनः लोड करें" : "Retry Stream"}
          </button>
        </div>
      )}

      {/* Unmute Prompt Button */}
      {internalMuted && !isLoading && !hasError && (
        <button
          type="button"
          onClick={handleUnmute}
          className="absolute bottom-14 right-4 z-10 flex items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xl transition-all hover:scale-105 active:scale-95 sm:bottom-4"
          aria-label={lang === "hi" ? "आवाज़ चालू करें" : "Tap for sound"}
        >
          <Volume2 className="h-4 w-4 animate-pulse" />
          <span>{lang === "hi" ? "🔊 आवाज़ चालू करें" : "🔊 Tap for sound"}</span>
        </button>
      )}
    </div>
  );
}
