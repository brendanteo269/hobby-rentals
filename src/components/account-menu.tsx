"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Clock, LogOut, UserRound } from "lucide-react";
import { useDismiss } from "./use-dismiss";

/**
 * Header avatar that opens the account menu: who is signed in, then Profile
 * and Sign out. Naming the account at the top, as Gmail does, is what tells a
 * member sharing a device which account they are about to act as.
 */
export function AccountMenu({
  name,
  email,
  signOutAction,
}: {
  /** The display name, or null for a member who has not set one. */
  name: string | null;
  email: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const initial = (name || email || "?").charAt(0);

  useDismiss(rootRef, open, close);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${name ?? email}`}
        className="flex size-9 items-center justify-center rounded-full bg-ink text-sm font-semibold uppercase text-white outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-white shadow-lg"
        >
          <div className="flex flex-col items-center px-5 pb-4 pt-5 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-ink text-xl font-semibold uppercase text-white">
              {initial}
            </span>
            {name && <p className="mt-3 max-w-full truncate text-base font-medium text-ink">{name}</p>}
            <p className={`max-w-full truncate text-sm text-ink-soft ${name ? "mt-0.5" : "mt-3"}`}>{email}</p>
            <Link
              href="/profile"
              role="menuitem"
              onClick={close}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
            >
              <UserRound className="size-4" aria-hidden="true" />
              Manage your profile
            </Link>
          </div>
          <div className="border-t border-line p-1.5">
            <Link
              href="/recently-viewed"
              role="menuitem"
              onClick={close}
              className="flex w-full items-center gap-2 rounded-lg px-3.5 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted"
            >
              <Clock className="size-4 text-ink-soft" aria-hidden="true" />
              Recently viewed
            </Link>
          </div>
          <form action={signOutAction} className="border-t border-line p-1.5">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-3.5 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted"
            >
              <LogOut className="size-4 text-ink-soft" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
