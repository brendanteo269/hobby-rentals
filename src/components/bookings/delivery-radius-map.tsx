"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { ONEMAP_ATTRIBUTION, ONEMAP_TILE_URL } from "@/lib/delivery";

type Point = { lat: number; lng: number };

/**
 * S6-09 Scenario 2: the delivery radius on a map, with a pin where the renter
 * asked for delivery, so "inside" and "outside" are things they can see.
 *
 * The circle is centred on the listing's collection area, because that is what
 * the server measures from. The meetup card's embedded Google map cannot draw a
 * shape, which is why this one is Leaflet on OneMap's tiles.
 *
 * Leaflet touches `window` as it loads, so it is imported inside the effect:
 * the map is built after mount and rebuilt when the radius or pin moves, which
 * is cheap at this size and avoids keeping a map instance in sync by hand.
 */
export function DeliveryRadiusMap({
  centre,
  radiusKm,
  point,
  className = "",
}: {
  centre: Point;
  radiusKm: number;
  /** Where delivery was asked for; shown even when it is outside the circle. */
  point?: Point | null;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  // Plain numbers, so the effect rebuilds when the pin moves and not when the parent re-renders with a new object.
  const pinLat = point?.lat;
  const pinLng = point?.lng;

  useEffect(() => {
    let cancelled = false;
    let removeMap: (() => void) | undefined;

    void (async () => {
      const L = await import("leaflet");
      const element = container.current;
      if (cancelled || !element) return;

      const map = L.map(element, { scrollWheelZoom: false, minZoom: 10, maxZoom: 18 });
      L.tileLayer(ONEMAP_TILE_URL, { attribution: ONEMAP_ATTRIBUTION, maxZoom: 18, detectRetina: true }).addTo(map);

      // currentColor, so the shapes take the container's text colour and follow the theme.
      const circle = L.circle([centre.lat, centre.lng], {
        radius: radiusKm * 1000,
        color: "currentColor",
        weight: 2,
        fillColor: "currentColor",
        fillOpacity: 0.12,
      }).addTo(map);
      const bounds = circle.getBounds();

      if (pinLat !== undefined && pinLng !== undefined) {
        // A circle marker rather than the default pin: Leaflet's marker images are
        // looked up by a path bundlers rewrite, and arrive broken.
        L.circleMarker([pinLat, pinLng], {
          radius: 7,
          color: "#ffffff",
          weight: 2,
          fillColor: "currentColor",
          fillOpacity: 1,
        }).addTo(map);
        bounds.extend([pinLat, pinLng]);
      }

      map.fitBounds(bounds, { padding: [16, 16] });
      removeMap = () => map.remove();
    })();

    return () => {
      cancelled = true;
      removeMap?.();
    };
  }, [centre.lat, centre.lng, radiusKm, pinLat, pinLng]);

  return (
    <div
      ref={container}
      role="img"
      aria-label={`Map showing the ${radiusKm} km delivery radius${point ? " and the delivery address" : ""}`}
      className={`h-56 w-full overflow-hidden rounded-xl border border-line text-accent-dark ${className}`}
    />
  );
}
