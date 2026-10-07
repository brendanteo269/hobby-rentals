"use client";

import { useEffect } from "react";

/** The attribute set on the element the URL's fragment names; style it with `data-[hash-target]:`. */
const ATTRIBUTE = "data-hash-target";

/**
 * Marks the element named by the URL's #fragment, so a link such as a
 * notification's "View booking" can show which booking it meant.
 *
 * CSS `:target` would do this on a full page load, but Next's client-side
 * navigation updates the URL through the History API, which never sets
 * `:target` - so after an in-app jump the right booking was scrolled to but
 * not highlighted. Runs after every render rather than once: arriving at
 * another booking on the same page re-renders this without remounting it,
 * and the History API fires no event to listen for.
 */
export function HashTargetHighlight({ autoClearMs }: { autoClearMs?: number } = {}) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    for (const marked of document.querySelectorAll(`[${ATTRIBUTE}]`)) {
      if (marked !== target) marked.removeAttribute(ATTRIBUTE);
    }
    target?.setAttribute(ATTRIBUTE, "");
    if (!target) return;

    // A deep link is guidance, not a permanent validation state. Once the
    // member starts correcting the named area (or after a short pause), clear
    // both its accent and the fragment so a later re-render cannot revive it.
    const clear = () => {
      target.removeAttribute(ATTRIBUTE);
      if (window.location.hash === `#${encodeURIComponent(id)}`) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }
    };
    target.addEventListener("focusin", clear, { once: true });
    target.addEventListener("input", clear, { once: true });
    const timer = autoClearMs ? window.setTimeout(clear, autoClearMs) : undefined;
    return () => {
      target.removeEventListener("focusin", clear);
      target.removeEventListener("input", clear);
      if (timer) window.clearTimeout(timer);
    };
  }, [autoClearMs]);
  return null;
}
