"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

const NAV: { label: string; href: Route }[] = [
  { label: "Home", href: "/" },
  { label: "Browse products", href: "/browse" },
];

/** Header nav links, highlighting whichever one matches the current route. */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 rounded-full bg-surface-muted p-1 md:flex">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              active ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
