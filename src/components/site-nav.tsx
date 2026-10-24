"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

export type NavItem = {
  label: string;
  href: Route;
  /** Path prefixes that also count as being on this item, so a whole section lights it up. */
  matches: string[];
};

/**
 * The header's destinations. Home is not one: the logo goes there.
 * `dashboardPath` is the member's own side of My dashboard, worked out on the
 * server; signed-out visitors get only the marketplace.
 */
export function navItems(dashboardPath: Route | null): NavItem[] {
  const items: NavItem[] = [{ label: "Marketplace", href: "/browse", matches: ["/browse", "/bundles"] }];
  if (dashboardPath) {
    items.push({ label: "My dashboard", href: dashboardPath, matches: ["/rentals", "/listings/mine"] });
  }
  return items;
}

/** Whether the current path is in an item's section: the path itself or anything beneath it. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.matches.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * The header's text links beside the logo, the current section underlined
 * in the accent the portal tabs use. Hidden on small screens, where the
 * mobile menu carries the same items.
 */
export function SiteNav({ dashboardPath }: { dashboardPath: Route | null }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden h-full items-stretch gap-6 md:flex">
      {navItems(dashboardPath).map((item) => {
        const active = isNavItemActive(item, pathname);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center border-b-2 pt-0.5 text-sm transition-colors ${
              active ? "border-accent font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
