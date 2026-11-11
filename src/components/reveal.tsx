"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Fades its children up into place the first time they scroll into view.
 *
 * Visible by default: the hidden state is only applied from JS, and only to
 * something still below the fold, so a failed hydration, a reduced-motion
 * setting or content already on screen never leaves anything invisible.
 * Children can join in with `group-data-[reveal=hidden]/reveal:` classes,
 * e.g. to stagger a list.
 *
 * The state is written to the DOM directly rather than through React state:
 * it changes once and nothing renders from it.
 */
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    element.dataset.reveal = "hidden";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.dataset.reveal = "shown";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="group/reveal transition-[opacity,translate] duration-500 ease-out data-[reveal=hidden]:translate-y-3 data-[reveal=hidden]:opacity-0"
    >
      {children}
    </div>
  );
}
