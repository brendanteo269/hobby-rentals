"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { recentNotifications } from "@/app/notifications/actions";
import type { NotificationView } from "@/lib/notifications";
import { NOTIFICATIONS_PATH, notificationPath } from "@/lib/routes";
import { useDismiss } from "../use-dismiss";
import { NotificationSummary } from "./notification-summary";

/** How often an open tab re-checks the unread count. */
const REFRESH_MS = 60_000;

/**
 * The header's bell: the unread count, and on click the newest few
 * notifications. The count is rendered by the server (SiteHeader); this keeps
 * it current by refreshing the page's server components every minute while
 * the tab is visible, and whenever the tab regains focus.
 */
export function NotificationBell({ unreadCount }: { unreadCount: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, open, close);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  function toggle() {
    const opening = !open;
    setOpen(opening);
    if (!opening) return;
    // Fetched on every open, so the list matches the badge that was clicked.
    startLoading(async () => {
      const result = await recentNotifications();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setItems(result.items);
    });
  }

  const label = unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
        className="relative flex size-9 items-center justify-center rounded-full text-ink-soft outline-none transition-colors hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
      >
        <Bell className="size-5" aria-hidden="true" />
        {!!unreadCount && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-semibold leading-4 text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          <p className="border-b border-line px-4 py-3 text-sm font-semibold">Notifications</p>
          {error && <p role="alert" className="px-4 py-3 text-sm text-accent-dark">{error}</p>}
          {!error && items === null && loading && <p className="px-4 py-3 text-sm text-ink-soft">Loading…</p>}
          {!error && items?.length === 0 && <p className="px-4 py-3 text-sm text-ink-soft">You are all caught up.</p>}
          {!error && !!items?.length && (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  {/* prefetch off: opening a notification marks it read, and
                      a hover prefetch must not do that. */}
                  <Link
                    href={notificationPath(item.id) as Route}
                    prefetch={false}
                    onClick={close}
                    className="block px-4 py-3 transition-colors hover:bg-surface-muted"
                  >
                    <NotificationSummary notification={item} compact />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={NOTIFICATIONS_PATH}
            onClick={close}
            className="block border-t border-line px-4 py-3 text-center text-sm font-medium hover:bg-surface-muted"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
