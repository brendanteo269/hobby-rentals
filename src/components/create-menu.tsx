"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ChevronDown, Layers, Plus, Tag, type LucideIcon } from "lucide-react";
import { Button } from "./ui";
import { useDismiss } from "./use-dismiss";

/** What a member can create, shared with the mobile menu so both offer the same choices. */
export const CREATE_OPTIONS: { href: "/listings/new" | "/listings/mine/bundles/new"; icon: LucideIcon; title: string; body: string }[] = [
  { href: "/listings/new", icon: Tag, title: "Listing", body: "Put one piece of gear up for rent" },
  { href: "/listings/mine/bundles/new", icon: Layers, title: "Bundle", body: "Group listings at a package rate" },
];

/**
 * The header's one "+ New" button, opening a choice of what to create. A
 * single accent button rather than one per kind, so the header has one primary
 * action and the two kinds are explained where the choice is made.
 */
export function CreateMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismiss(rootRef, open, close);

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <Button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-9 gap-1.5 whitespace-nowrap py-0 pl-3.5 pr-3"
      >
        <Plus className="size-4" aria-hidden="true" />
        New
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-lg"
        >
          {CREATE_OPTIONS.map(({ href, icon: Icon, title, body }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={close}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-muted"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-medium text-ink">{title}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{body}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
