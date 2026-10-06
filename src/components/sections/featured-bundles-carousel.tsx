"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FeaturedBundleCard } from "./featured-bundles-card";
import type { FeaturedBundleCard as Card } from "@/lib/bundles";

const CARD_STEP_PX = 316;

/**
 * S2-30: the bundle showcase's rail.
 *
 * Deliberately the same control as the popular-listings rail - same step,
 * same snap, same arrow behaviour - so the landing page scrolls one way
 * throughout rather than two.
 */
export function FeaturedBundlesCarousel({ bundles }: { bundles: Card[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canMove, setCanMove] = useState({ left: false, right: true });

  const syncPosition = () => {
    const track = trackRef.current;
    if (!track) return;
    const tolerance = 2;
    setCanMove({
      left: track.scrollLeft > tolerance,
      right: track.scrollLeft + track.clientWidth < track.scrollWidth - tolerance,
    });
  };
  const move = (direction: number) => trackRef.current?.scrollBy({ left: direction * CARD_STEP_PX, behavior: "smooth" });

  useEffect(() => {
    syncPosition();
    window.addEventListener("resize", syncPosition);
    return () => window.removeEventListener("resize", syncPosition);
  }, []);

  return (
    <div className="relative mt-8">
      <div className="-mx-1 overflow-hidden px-1">
        <ul ref={trackRef} onScroll={syncPosition} className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 pr-6 [scrollbar-width:thin]" aria-label="Gear bundles">
          {bundles.map((bundle) => <FeaturedBundleCard key={bundle.id} bundle={bundle} className="min-w-[17rem] snap-start sm:min-w-[18.5rem]" />)}
        </ul>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button type="button" onClick={() => move(-1)} disabled={!canMove.left} aria-label="Show previous bundle" className="flex size-10 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-4" /></button>
        <button type="button" onClick={() => move(1)} disabled={!canMove.right} aria-label="Show next bundle" className="flex size-10 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="size-4" /></button>
      </div>
    </div>
  );
}
