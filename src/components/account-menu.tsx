"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Header avatar that opens a small menu (Profile, Sign out) instead of
 * showing "Sign out" as a permanently visible link next to the avatar.
 */
export function AccountMenu({
  initial,
  signOutAction,
}: {
  initial: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-full bg-ink text-sm font-semibold uppercase text-white outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-muted"
          >
            Profile
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
