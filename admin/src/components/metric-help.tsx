"use client";

import { useId, useRef, useState, type ReactNode } from "react";

/** Accessible, compact help for a metric heading. It is deliberately transient so it never obscures the table after hover. */
export function MetricHelp({ label, children }: { label: string; children: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const visible = hovered;
  function show() {
    const box = buttonRef.current?.getBoundingClientRect();
    if (box) setPosition({ left: Math.max(8, Math.min(box.left, window.innerWidth - 304)), top: box.bottom + 6 });
    setHovered(true);
  }
  return <span className="relative ml-1 inline-flex align-middle">
    <button
      ref={buttonRef}
      type="button"
      aria-label={`Explain ${label}`}
      aria-describedby={visible ? id : undefined}
      aria-expanded={visible}
      onMouseEnter={show}
      onMouseLeave={() => setHovered(false)}
      onFocus={show}
      onBlur={() => setHovered(false)}
      className="inline-flex size-4 items-center justify-center rounded-full border border-ink-soft text-[10px] font-semibold text-ink-soft hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
    >
      ?
    </button>
    {visible && <span id={id} role="tooltip" style={{ left: position.left, top: position.top }} className="fixed z-50 w-72 border border-line bg-white p-3 text-left text-xs font-normal leading-relaxed text-ink shadow-sm">
      {children}
    </span>}
  </span>;
}
