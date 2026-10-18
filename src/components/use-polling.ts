"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `callback` every `intervalMs` while the tab is visible, and once more
 * the moment it becomes visible again so a returning viewer isn't looking at
 * stale data for a full interval. The latest `callback` is always the one
 * run, so callers may close over fresh state without resetting the timer.
 * Callers own overlap protection - a slow request can outlast the interval.
 */
export function usePolling(callback: () => void | Promise<void>, intervalMs: number) {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void latest.current();
    };
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);
}
