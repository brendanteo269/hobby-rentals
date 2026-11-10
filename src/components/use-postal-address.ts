"use client";

import { useEffect, useRef, useState } from "react";

export type PostalLookupStatus = "idle" | "loading" | "found" | "not-found" | "error";

/** Where a postal code resolved to. */
export type PostalPoint = { lat: number; lng: number };

/**
 * A Singapore postal code, the address it resolves to, and where that is -
 * shared by the meetup modal (which keeps only the address) and the delivery
 * form (which also needs the point, to check the radius).
 *
 * The address is freely editable after a lookup; a lookup never overwrites
 * something the person has typed over. The point stays the postal code's, which
 * is what the radius is checked against, so editing the address text cannot
 * move it.
 *
 * `enabled` pauses lookups (the modal's "Choose an area" mode) without losing
 * what has been typed.
 */
export function usePostalAddress(enabled = true) {
  const [postal, setPostalState] = useState("");
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<PostalPoint | null>(null);
  const [status, setStatus] = useState<PostalLookupStatus>("idle");

  // The postal code a lookup has already resolved. Pausing and resuming
  // re-runs the effect, but re-fetching the same code would silently overwrite
  // any edit made to the address since - so it is skipped unless the code
  // itself changed.
  const resolvedPostalRef = useRef<string | null>(null);

  // Looks up the postal code once it is a complete 6-digit code, debounced so
  // it does not fire on every keystroke.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!enabled || !/^\d{6}$/.test(postal)) {
        setStatus("idle");
        return;
      }
      if (postal === resolvedPostalRef.current) {
        setStatus("found");
        return;
      }
      setStatus("loading");
      void (async () => {
        try {
          const response = await fetch(`/api/onemap/search?postal=${postal}`, { signal: controller.signal });
          const body = (await response.json()) as {
            results?: { address: string; latitude: number; longitude: number }[];
            error?: string;
          };
          if (!response.ok || !body.results) {
            setStatus("error");
            return;
          }
          if (body.results.length === 0) {
            setStatus("not-found");
            return;
          }
          const [first] = body.results;
          resolvedPostalRef.current = postal;
          setAddress(first.address);
          setPoint({ lat: first.latitude, lng: first.longitude });
          setStatus("found");
        } catch (caught) {
          if (!(caught instanceof DOMException && caught.name === "AbortError")) setStatus("error");
        }
      })();
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, postal]);

  /** Changing the code drops the old point at once: it no longer describes what is typed. */
  function setPostal(next: string) {
    if (next !== postal) setPoint(null);
    setPostalState(next);
  }

  return { postal, setPostal, address, setAddress, point, status };
}

export type PostalAddress = ReturnType<typeof usePostalAddress>;
