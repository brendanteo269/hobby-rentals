"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

/**
 * Table rows that start folded behind one summary line: the listings whose
 * outlook asks nothing of the owner. A client leaf only because rows cannot
 * sit inside a <details> element.
 */
export function DemandForecastQuietRows({ summary, columns, children }: { summary: string; columns: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr>
        <td colSpan={columns} className="pt-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
          >
            <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            {summary}
          </button>
        </td>
      </tr>
      {open && children}
    </>
  );
}
