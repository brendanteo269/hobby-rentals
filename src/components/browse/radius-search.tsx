"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Crosshair, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui";
import { useToast } from "@/components/toast";
import { browseHref, type BrowseFilters } from "@/lib/browse-params";

type PostalResult = { latitude: number; longitude: number };
const rounded = (value: number) => Number(value.toFixed(4));

/** Browser-only origin controls; catalogue reads remain server-rendered. */
export function RadiusSearch({ filters }: { filters: BrowseFilters }) {
  const router = useRouter();
  const toast = useToast();
  const [postal, setPostal] = useState("");
  const [resolving, setResolving] = useState(false);
  const [radius, setRadius] = useState(filters.radius_km ?? 5);
  const active = filters.origin_lat !== null && filters.origin_lng !== null && filters.radius_km !== null;

  function replace(changes: Partial<BrowseFilters>) {
    router.replace(browseHref({ ...filters, ...changes, page: 1 }) as Route, { scroll: false });
  }
  function establish(lat: number, lng: number) {
    setRadius(5);
    replace({ origin_lat: rounded(lat), origin_lng: rounded(lng), radius_km: 5, location_area: [], sort: "newest" });
  }
  function clear() {
    setPostal("");
    setRadius(5);
    replace({ origin_lat: null, origin_lng: null, radius_km: null, sort: "newest" });
  }
  function useCurrentLocation() {
    if (!navigator.geolocation) return toast.show("Location is not supported by this browser.", "error");
    navigator.geolocation.getCurrentPosition(
      (position) => establish(position.coords.latitude, position.coords.longitude),
      () => toast.show("We could not access your location. Allow permission or use a postal code.", "error"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }
  async function resolvePostal() {
    if (!/^\d{6}$/.test(postal)) return;
    setResolving(true);
    try {
      const response = await fetch(`/api/onemap/search?postal=${postal}`);
      const body = await response.json() as { results?: PostalResult[]; error?: string };
      if (!response.ok || !body.results?.[0]) {
        toast.show(body.error ?? "No location was found for that postal code.", "error");
        return;
      }
      establish(body.results[0].latitude, body.results[0].longitude);
    } catch {
      toast.show("Postal-code lookup is temporarily unavailable. Please try again later.", "error");
    } finally { setResolving(false); }
  }
  function commitRadius() {
    if (active && radius !== filters.radius_km) replace({ radius_km: radius });
  }

  return (
    <section aria-label="Search near you" className="min-w-0 flex-1">
      <label htmlFor="postal" className="block text-sm font-medium">Search near you</label>
      <div className="mt-2 flex min-w-0 overflow-hidden rounded-lg border border-line bg-white focus-within:border-ink">
        <span className="flex items-center pl-3 text-ink-soft"><MapPin className="size-4" aria-hidden="true" /></span>
        <Input id="postal" value={postal} onChange={(event) => setPostal(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6-digit postal code" className="min-w-0 border-0 focus:border-0" />
        <button type="button" disabled={!/^\d{6}$/.test(postal) || resolving} onClick={resolvePostal} className="border-l border-line px-3 text-sm font-medium disabled:text-ink-soft">{resolving ? "…" : "Set"}</button>
        <button type="button" onClick={useCurrentLocation} className="flex items-center gap-1 border-l border-line px-3 text-sm font-medium hover:bg-surface-muted"><Crosshair className="size-4" aria-hidden="true" />GPS</button>
        {active && <button type="button" onClick={clear} aria-label="Clear location" className="border-l border-line px-3 text-ink-soft hover:text-ink"><X className="size-4" aria-hidden="true" /></button>}
      </div>
      <div className={`mt-3 max-w-sm ${active ? "" : "pointer-events-none opacity-40"}`}>
        <label htmlFor="radius" className="block text-sm font-medium">Radius: {radius} km</label>
        <input id="radius" type="range" min="1" max="20" value={radius} disabled={!active} onChange={(event) => setRadius(Number(event.target.value))} onPointerUp={commitRadius} onTouchEnd={commitRadius} onKeyUp={commitRadius} className="mt-2 w-full accent-ink" />
      </div>
    </section>
  );
}
