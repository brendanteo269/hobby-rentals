"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type RealtimeSignal = {
  /** Unique per subscription, so two components don't share one channel. */
  channel: string;
  table: string;
  event: "INSERT" | "UPDATE";
  /** PostgREST-style row filter, e.g. `conversation_id=eq.<id>`. Omit to rely on Row Level Security alone. */
  filter?: string;
};

/**
 * Calls `onSignal` whenever Supabase Realtime reports a matching change, and
 * again each time the socket reconnects (events during an outage are lost,
 * so the caller must re-check rather than assume it's current).
 *
 * The event payload is deliberately not passed on: a raw row has no signed
 * attachment URLs or meetup data, so callers treat this as "something
 * changed, refetch" and read through their normal API instead. Row Level
 * Security decides which rows a member is told about.
 */
export function useRealtimeSignal({ channel, table, event, filter }: RealtimeSignal, onSignal: () => void) {
  const latest = useRef(onSignal);
  useEffect(() => {
    latest.current = onSignal;
  });

  useEffect(() => {
    const supabase = createClient();
    let connectedBefore = false;
    const subscription = supabase
      .channel(channel)
      .on("postgres_changes", { event, schema: "public", table, ...(filter ? { filter } : {}) }, () => latest.current())
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (connectedBefore) latest.current();
        connectedBefore = true;
      });
    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [channel, table, event, filter]);
}
