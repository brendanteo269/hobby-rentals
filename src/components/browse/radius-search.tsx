"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Crosshair, MapPin } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { LOCATION_AREAS, LOCATION_LABELS, type LocationArea } from "@/lib/listings";
import type { BrowseFilters } from "@/lib/browse-params";

type LocationState = { mode: "near" | "area" | null; postalCode?: string; lat?: number; lng?: number; radiusKm: number; planningArea?: LocationArea; label?: string };
type PostalResult = { latitude: number; longitude: number; address?: string };
const STORAGE_KEY = "hobby-rentals:browse-location";
const rounded = (value: number) => Number(value.toFixed(4));

function fromFilters(filters: BrowseFilters): LocationState {
  if (filters.origin_lat !== null && filters.origin_lng !== null && filters.radius_km !== null) return { mode: "near", lat: filters.origin_lat, lng: filters.origin_lng, radiusKm: filters.radius_km, label: "Current location" };
  if (filters.location_area[0]) return { mode: "area", planningArea: filters.location_area[0], radiusKm: 5 };
  return { mode: null, radiusKm: 5 };
}

/** One compact, accessible location picker. Hidden fields keep the parent GET form contract unchanged. */
export function RadiusSearch({ filters }: { filters: BrowseFilters }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  // The first client render must exactly match the Server Component output.
  // Restore local storage only after hydration, never in a state initializer.
  const [location, setLocation] = useState<LocationState>(() => fromFilters(filters));
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"near" | "area">(location.mode === "area" ? "area" : "near");
  const [postal, setPostal] = useState(location.postalCode ?? "");
  const [postalError, setPostalError] = useState("");
  const [gpsError, setGpsError] = useState("");
  const [loadingGps, setLoadingGps] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const reset = () => clear();
    window.addEventListener("browse-location-reset", reset);
    return () => window.removeEventListener("browse-location-reset", reset);
  });
  useEffect(() => {
    if (restoredRef.current || filters.origin_lat !== null || filters.location_area.length > 0) return;
    restoredRef.current = true;
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as LocationState | null;
        if (saved?.mode === "near" && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) { setLocation(saved); setPostal(saved.postalCode ?? ""); }
        if (saved?.mode === "area" && saved.planningArea && LOCATION_AREAS.includes(saved.planningArea)) setLocation(saved);
      } catch { /* Storage is optional. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [filters.location_area, filters.origin_lat, filters.origin_lng, filters.radius_km]);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) { if (open && panelRef.current && !panelRef.current.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) close(); }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  });
  function persist(next: LocationState) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {} }
  function close() { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); }
  function clear() { const next = { mode: null, radiusKm: 5 } satisfies LocationState; setLocation(next); setPostal(""); setPostalError(""); try { localStorage.removeItem(STORAGE_KEY); } catch {} }
  function setNear(next: Omit<LocationState, "mode" | "radiusKm">) { const value: LocationState = { mode: "near", radiusKm: location.mode === "near" ? location.radiusKm : 5, ...next }; setLocation(value); persist(value); }
  function setArea(area: LocationArea | "") { const value: LocationState = area ? { mode: "area", planningArea: area, radiusKm: 5 } : { mode: null, radiusKm: 5 }; setLocation(value); persist(value); }
  function switchTab(next: "near" | "area") { setTab(next); if ((next === "near" && location.mode === "area") || (next === "area" && location.mode === "near")) clear(); }
  function useGps() {
    if (!navigator.geolocation) { setGpsError("Location access is blocked. Enter a postal code instead."); return; }
    setLoadingGps(true); setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (position) => { setNear({ lat: rounded(position.coords.latitude), lng: rounded(position.coords.longitude), label: "Current location" }); setLoadingGps(false); },
      () => { setGpsError("Location access is blocked. Enter a postal code instead."); setLoadingGps(false); },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }
  async function resolve(value: string) {
    if (!/^\d{6}$/.test(value)) return;
    setResolving(true); setPostalError("");
    try {
      const response = await fetch(`/api/onemap/search?postal=${value}`);
      const body = await response.json() as { results?: PostalResult[]; error?: string };
      if (!response.ok || !body.results?.[0]) { setPostalError(body.error ?? "Enter a valid Singapore postal code."); return; }
      const result = body.results[0]; setNear({ postalCode: value, lat: rounded(result.latitude), lng: rounded(result.longitude), label: result.address || value });
    } catch { setPostalError("Postal-code lookup is temporarily unavailable."); } finally { setResolving(false); }
  }
  function keydown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { const next = tab === "near" ? "area" : "near"; switchTab(next); document.getElementById(`location-tab-${next}`)?.focus(); }
    if (event.key === "Tab" && panelRef.current) { const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, select')]; const index = focusable.indexOf(document.activeElement as HTMLElement); if (event.shiftKey && index === 0) { event.preventDefault(); focusable.at(-1)?.focus(); } else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0]?.focus(); } }
  }
  const near = location.mode === "near";
  const nearUsesPostal = near && Boolean(location.postalCode);
  const nearUsesGps = near && !location.postalCode;
  const label = near ? `${location.postalCode || location.label || "Current location"} · within ${location.radiusKm} km` : location.mode === "area" ? LOCATION_LABELS[location.planningArea!] : "Anywhere";

  return <div className="relative w-full sm:w-[440px]">
    <label className="block text-sm font-medium">Location</label>
    <button ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className="mt-2 flex h-12 w-full items-center justify-between rounded-lg border border-line bg-white px-3 text-sm">
      <span className="flex min-w-0 items-center gap-2 truncate"><MapPin className="size-4 shrink-0" aria-hidden="true" />{label}</span><ChevronDown className="size-4 shrink-0" aria-hidden="true" />
    </button>
    {!location.mode && <p className="mt-2 text-xs text-ink-soft sm:absolute sm:left-[456px] sm:top-7 sm:w-52">Set a location to sort by closest.</p>}
    {open && <><div className="fixed inset-0 z-40 bg-ink/25 sm:hidden" onClick={close} /><div ref={panelRef} role="dialog" aria-modal="true" aria-label="Choose location" onKeyDown={keydown} className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-[#e7e5e4] bg-white p-5 shadow-[0_12px_32px_rgba(28,25,23,.16)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-[76px] sm:w-[440px] sm:rounded-2xl">
      <div role="tablist" aria-label="Location method" className="grid grid-cols-2 rounded-lg bg-surface-muted p-1">
        {(["near", "area"] as const).map((item) => <button type="button" key={item} id={`location-tab-${item}`} role="tab" aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} onClick={() => switchTab(item)} className={`min-h-11 rounded-md text-sm ${tab === item ? "bg-white font-semibold shadow-sm" : "text-ink-soft"}`}>{item === "near" ? "Near me" : "Collection area"}</button>)}
      </div>
      {tab === "near" ? <div className="mt-4 space-y-4"><button type="button" onClick={useGps} disabled={loadingGps || nearUsesPostal} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"><Crosshair className="size-4" />{loadingGps ? "Finding location…" : "Use my current location"}</button>{gpsError && <p role="alert" className="text-xs text-accent-dark">{gpsError}</p>}<div className="flex items-center gap-3 text-xs text-ink-soft"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div><div><label htmlFor="location-postal" className="block text-sm font-medium">Postal code</label><div className="relative mt-2"><Input id="location-postal" value={postal} maxLength={6} inputMode="numeric" disabled={nearUsesGps} onChange={(event) => { const value = event.target.value.replace(/\D/g, ""); setPostal(value); if (value.length === 6) void resolve(value); else setPostalError(""); }} /><span className="absolute right-3 top-3 max-w-40 truncate text-xs text-ink-soft">{resolving ? "Checking…" : near && location.postalCode === postal ? <span className="flex items-center gap-1"><Check className="size-4 shrink-0 text-success" aria-label="Postal code confirmed" />{location.label}</span> : ""}</span></div>{nearUsesGps && <p className="mt-1 text-xs text-ink-soft">Clear location to search by postal code instead.</p>}{nearUsesPostal && <p className="mt-1 text-xs text-ink-soft">Clear location to use your current location instead.</p>}{postalError && <p role="alert" className="mt-1 text-xs text-accent-dark">{postalError}</p>}</div>{near && <div><p className="text-sm font-medium">Radius</p><div className="mt-2 grid grid-cols-5 gap-2">{[1, 2, 5, 10, 20].map((km) => <button key={km} type="button" onClick={() => { const next = { ...location, radiusKm: km }; setLocation(next); persist(next); }} className={`min-h-11 rounded-full border text-sm ${location.radiusKm === km ? "border-accent bg-accent text-white font-bold" : "border-line font-medium"}`}>{km} km</button>)}</div></div>}</div> : <div className="mt-4"><label htmlFor="planning-area" className="block text-sm font-medium">Collection area</label><Select id="planning-area" value={location.planningArea ?? ""} onChange={(event) => setArea(event.target.value as LocationArea | "")} className="mt-2"><option value="">Anywhere</option>{LOCATION_AREAS.map((area) => <option key={area} value={area}>{LOCATION_LABELS[area]}</option>)}</Select></div>}
      <div className="mt-5 flex items-center justify-between"><button type="button" onClick={clear} className="min-h-11 px-2 text-sm font-medium text-ink-soft">Clear</button><button type="button" onClick={close} className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-white">Done</button></div>
    </div></>}
    {near && <><input type="hidden" name="origin_lat" value={location.lat} /><input type="hidden" name="origin_lng" value={location.lng} /><input type="hidden" name="radius_km" value={location.radiusKm} /><input type="hidden" name="sort" value="nearest" /></>}
    {location.mode === "area" && <input type="hidden" name="location_area" value={location.planningArea} />}
  </div>;
}
