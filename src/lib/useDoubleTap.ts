import { useCallback, useRef } from "react";

export type DoubleTapPoint = { x: number; y: number };

export interface UseDoubleTapOptions {
  latency?: number;
  maxDistance?: number;
  onSingleTap?: (e: React.MouseEvent | React.TouchEvent) => void;
  stopPropagationOnDoubleTap?: boolean;
}

export function useDoubleTap(
  onDoubleTap: (e: React.MouseEvent | React.TouchEvent, point: DoubleTapPoint) => void,
  options: UseDoubleTapOptions = {},
) {
  const {
    latency = 300,
    maxDistance = 25,
    onSingleTap,
    stopPropagationOnDoubleTap = true,
  } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): DoubleTapPoint => {
    const firstTouch = "touches" in e ? e.touches[0] : undefined;
    if (firstTouch) {
      return { x: firstTouch.clientX, y: firstTouch.clientY };
    }
    const firstChangedTouch = "changedTouches" in e ? e.changedTouches[0] : undefined;
    if (firstChangedTouch) {
      return { x: firstChangedTouch.clientX, y: firstChangedTouch.clientY };
    }
    const mouseEvent = e as React.MouseEvent;
    return { x: mouseEvent.clientX, y: mouseEvent.clientY };
  };

  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const now = Date.now();
      const coords = getCoordinates(e);

      if (lastTapRef.current) {
        const timeDiff = now - lastTapRef.current.time;
        const dist = Math.hypot(coords.x - lastTapRef.current.x, coords.y - lastTapRef.current.y);

        if (timeDiff < latency && dist < maxDistance) {
          // Double tap detected!
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          if (stopPropagationOnDoubleTap) {
            e.preventDefault();
            e.stopPropagation();
          }
          lastTapRef.current = null;
          onDoubleTap(e, coords);
          return;
        }
      }

      // First tap recorded
      lastTapRef.current = { time: now, x: coords.x, y: coords.y };

      if (onSingleTap) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          onSingleTap(e);
          timerRef.current = null;
          lastTapRef.current = null;
        }, latency);
      }
    },
    [latency, maxDistance, onDoubleTap, onSingleTap, stopPropagationOnDoubleTap],
  );

  return {
    onClick: handleTap,
  };
}
