"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Heart, Menu, MessageCircle, X } from "lucide-react";
import { headerIconButton } from "./ui";
import { useDismiss } from "./use-dismiss";
import { CREATE_OPTIONS } from "./create-menu";
import { isNavItemActive, navItems } from "./site-nav";

const rowClass = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-surface-muted";

/**
 * The header on small screens: everything the desktop header spreads across
 * its nav links and "+ New" menu, behind one button. The panel hangs from the
 * bottom of the header (its nearest positioned ancestor), full width.
 */
export function MobileMenu({ dashboardPath }: { dashboardPath: Route }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const pathname = usePathname();
  useDismiss(rootRef, open, close);

  return (
    <div ref={rootRef} className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className={headerIconButton}
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>

      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full border-b border-line bg-white px-4 pb-4 pt-2 shadow-lg">
          <nav aria-label="Main">
            {navItems(dashboardPath).map((item) => {
              const active = isNavItemActive(item, pathname);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                  className={`${rowClass} ${active ? "font-medium text-ink" : "text-ink-soft"}`}
                >
                  <span className={`size-1.5 rounded-full ${active ? "bg-accent" : "bg-transparent"}`} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <p className="eyebrow mt-3 px-3">Create</p>
          <div className="mt-1">
            {CREATE_OPTIONS.map(({ href, icon: Icon, title }) => (
              <Link key={href} href={href} onClick={close} className={`${rowClass} text-ink`}>
                <Icon className="size-4 text-accent" aria-hidden="true" />
                New {title.toLowerCase()}
              </Link>
            ))}
          </div>

          {/* The header shows these as icons from sm up; below that they live here. */}
          <div className="mt-2 border-t border-line pt-2 sm:hidden">
            <Link href="/favourites" onClick={close} className={`${rowClass} text-ink`}>
              <Heart className="size-4 text-ink-soft" aria-hidden="true" />
              Favourites
            </Link>
            <Link href="/messages" onClick={close} className={`${rowClass} text-ink`}>
              <MessageCircle className="size-4 text-ink-soft" aria-hidden="true" />
              Messages
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
