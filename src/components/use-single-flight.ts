"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Wraps an async `task` so at most one run is in flight. A call made while
 * one is running isn't dropped - it queues exactly one re-run for when the
 * current one finishes, because it may carry news the running fetch started
 * too early to see (a realtime event landing mid-request). The returned
 * function is stable and always runs the latest `task`.
 */
export function useSingleFlight(task: () => Promise<void>) {
  const latest = useRef(task);
  const running = useRef(false);
  const rerun = useRef(false);
  useEffect(() => {
    latest.current = task;
  });

  return useCallback(async () => {
    if (running.current) {
      rerun.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        rerun.current = false;
        await latest.current();
      } while (rerun.current);
    } finally {
      running.current = false;
    }
  }, []);
}
