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
export function HashTargetHighlight() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    for (const marked of document.querySelectorAll(`[${ATTRIBUTE}]`)) {
      if (marked !== target) marked.removeAttribute(ATTRIBUTE);
    }
    target?.setAttribute(ATTRIBUTE, "");
  });
  return null;
}
