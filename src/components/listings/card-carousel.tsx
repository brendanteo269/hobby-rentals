"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const arrowClass =
  "flex size-9 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-surface-muted disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white";

/**
 * A titled row of cards that scrolls sideways and snaps to a card. The cards
 * start flush with the title; the arrows sit in the title row (so they can
 * never cover a card) and step one card at a time, greyed out at either end.
 * Touch and trackpad scrolling work natively. Children are the `<li>` cards,
 * sized by the caller; they stretch to the tallest card's height.
 */
export function CardCarousel({ title, children }: { title: string; children: ReactNode }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState({ back: false, forward: false });

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanScroll({
      back: track.scrollLeft > 1,
      forward: track.scrollLeft + track.clientWidth < track.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => observer.disconnect();
  }, [update]);

  function step(direction: 1 | -1) {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: "smooth" });
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label={title}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="heading text-lg">{title}</h2>
        {(canScroll.back || canScroll.forward) && (
          <div className="hidden gap-2 md:flex">
            <button type="button" onClick={() => step(-1)} disabled={!canScroll.back} aria-label="Previous" className={arrowClass}>
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => step(1)} disabled={!canScroll.forward} aria-label="Next" className={arrowClass}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <ul
        ref={trackRef}
        onScroll={update}
        className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
    </div>
  );
}
