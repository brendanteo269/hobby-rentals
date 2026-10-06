"use client";

import { useEffect, useRef, useState } from "react";
import { fieldBase } from "./ui";

export type MultiSelectOption = { value: string; label: string };

/**
 * A collapsed dropdown that opens a checkbox panel - the multi-value
 * equivalent of Select, for a search filter that needs to hold more than one
 * value but still look like the rest of the row. A native <select multiple>
 * matches the "dropdown" idea with no client code, but renders as an
 * always-open listbox rather than a closed field; this is the version that
 * actually collapses, shared by every such filter rather than rebuilt per
 * field (category, status, ...).
 *
 * The checkboxes carry name={name} so the control still behaves like a form
 * field (labels, accessibility tree), but selection changes are also
 * reported live via onChange - the search this backs applies a filter change
 * immediately rather than waiting for an explicit submit.
 */
export function MultiSelectDropdown({
  name,
  label,
  options,
  selected,
  onChange,
  noneLabel,
  allLabel,
  noun,
}: {
  name: string;
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  /** Called with the full selection every time a box is checked or unchecked. */
  onChange: (selected: string[]) => void;
  /** Shown when nothing is checked. */
  noneLabel: string;
  /** Shown when every option is checked. */
  allLabel: string;
  /** Plural noun for the "N ___" summary once more than one is checked, e.g. "statuses". */
  noun: string;
}) {
  const [open, setOpen] = useState(false);
  const checked = selected;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerId = `${name}-filter-trigger`;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function toggle(value: string) {
    onChange(checked.includes(value) ? checked.filter((v) => v !== value) : [...checked, value]);
  }

  const summary =
    checked.length === 0
      ? noneLabel
      : checked.length === options.length
        ? allLabel
        : checked.length === 1
          ? (options.find((o) => o.value === checked[0])?.label ?? checked[0])
          : `${checked.length} ${noun}`;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={triggerId} className="block text-sm font-medium">
        {label}
      </label>
      <button
        type="button"
        id={triggerId}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`${fieldBase} mt-2 flex items-center justify-between gap-3 text-left`}
      >
        {summary}
        <span aria-hidden="true" className="text-ink-soft">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-56 rounded-sm border border-line bg-white py-1.5 shadow-md">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-sand">
              <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={checked.includes(option.value)}
                onChange={() => toggle(option.value)}
                className="accent-ink"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
