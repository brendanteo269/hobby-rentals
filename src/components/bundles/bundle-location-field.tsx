"use client";

import { useEffect, useState } from "react";
import { Check, Crosshair, MapPin } from "lucide-react";
import { Input } from "@/components/ui";
import { BROWSE_LOCATION_STORAGE_KEY } from "@/components/browse/radius-search";

type Location = { lat: number; lng: number; label: string };

const rounded = (value: number) => Number(value.toFixed(4));

/** The location the renter already set while browsing, if there is a usable one. */
function savedLocation(): Location | null {
  try {
    const saved = JSON.parse(localStorage.getItem(BROWSE_LOCATION_STORAGE_KEY) ?? "null") as
      | { mode?: string; lat?: number; lng?: number; postalCode?: string; label?: string }
      | null;
    if (saved?.mode !== "near" || !Number.isFinite(saved.lat) || !Number.isFinite(saved.lng)) return null;
    return { lat: saved.lat!, lng: saved.lng!, label: saved.postalCode || saved.label || "Saved location" };
  } catch {
    return null; // Storage is optional.
  }
}

/**
 * Where the renter is, so the bundle prefers items collected near them and
 * near each other (S5-08 Scenario 3). Optional: without it the bundle still
 * keeps collection areas together, it just cannot say how far they are.
 *
 * Starts from the location set on the browse page, restored after hydration
 * so the first render matches the server's. Submits as origin_lat and
 * origin_lng with the surrounding form.
 */
export function BundleLocationField({ initial }: { initial?: { lat: number; lng: number } }) {
  const [location, setLocation] = useState<Location | null>(
    initial ? { ...initial, label: "Your location" } : null,
  );
  const [postal, setPostal] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) return;
    const frame = requestAnimationFrame(() => setLocation(savedLocation()));
    return () => cancelAnimationFrame(frame);
  }, [initial]);

  async function resolvePostal(value: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/onemap/search?postal=${value}`);
      const body = (await response.json()) as { results?: { latitude: number; longitude: number; address?: string }[]; error?: string };
      const result = body.results?.[0];
      if (!response.ok || !result) {
        setError(body.error ?? "Enter a valid Singapore postal code.");
        return;
      }
      setLocation({ lat: rounded(result.latitude), lng: rounded(result.longitude), label: result.address || value });
    } catch {
      setError("Postal-code lookup is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Location access is blocked. Enter a postal code instead.");
      return;
    }
    setBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: rounded(position.coords.latitude), lng: rounded(position.coords.longitude), label: "Current location" });
        setBusy(false);
      },
      () => {
        setError("Location access is blocked. Enter a postal code instead.");
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <div>
      <label htmlFor="bundle-postal" className="block text-sm font-medium">
        Your location <span className="font-normal text-ink-soft">(optional)</span>
      </label>
      {location ? (
        <div className="mt-2 flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line px-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
            <span className="truncate">{location.label}</span>
          </span>
          <button type="button" onClick={() => { setLocation(null); setPostal(""); }} className="shrink-0 font-medium text-ink-soft">
            Clear
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <MapPin className="pointer-events-none absolute left-3 top-3.5 size-4 text-ink-soft" aria-hidden="true" />
            <Input
              id="bundle-postal"
              value={postal}
              maxLength={6}
              inputMode="numeric"
              placeholder="Postal code"
              className="pl-9"
              disabled={busy}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, "");
                setPostal(value);
                setError("");
                if (value.length === 6) void resolvePostal(value);
              }}
            />
          </div>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={busy}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium disabled:opacity-60"
          >
            <Crosshair className="size-4" aria-hidden="true" />
            Use mine
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-accent-dark">{error}</p>}
      {location && (
        <>
          <input type="hidden" name="origin_lat" value={location.lat} />
          <input type="hidden" name="origin_lng" value={location.lng} />
        </>
      )}
    </div>
  );
}
