"use client";

import { useState, useTransition } from "react";
import { Badge, Button } from "@/components/ui";
import { changeNotifications, markAllRead, type NotificationActionResult } from "@/app/notifications/actions";
import type { BulkAction, NotificationType, NotificationView } from "@/lib/notifications";
import { NotificationSummary } from "./notification-summary";
import { OpenNotificationLink } from "./open-notification-link";

/**
 * The notifications page's list: each notification with its call to action,
 * plus selection and the actions that apply to a group (Scenario 5).
 *
 * Selection is per page. Once an action lands, the server action revalidates
 * the page, which re-renders with fresh rows, so the selection is cleared
 * rather than left pointing at rows that may have moved.
 */
export function NotificationList({
  items,
  showingArchived,
  types,
}: {
  items: NotificationView[];
  /** Whether archived rows are in view, which turns Archive into Unarchive. */
  showingArchived: boolean;
  /** The type filter in force, so "mark all as read" means "all of these". */
  types: NotificationType[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = items.length > 0 && selected.size === items.length;
  const selectedItems = items.filter((item) => selected.has(item.id));
  const anyArchived = selectedItems.some((item) => item.archived);
  const hasUnread = items.some((item) => !item.read);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  function apply(action: () => Promise<NotificationActionResult>) {
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setSelected(new Set());
    });
  }

  const bulk = (action: BulkAction) => apply(() => changeNotifications([...selected], action));

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={pending} />
          {selected.size ? `${selected.size} selected` : "Select all on this page"}
        </label>

        {selected.size > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Actions for selected notifications">
            <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => bulk("mark_read")}>
              Mark read
            </Button>
            <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => bulk("mark_unread")}>
              Mark unread
            </Button>
            {anyArchived ? (
              <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => bulk("unarchive")}>
                Unarchive
              </Button>
            ) : (
              <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => bulk("archive")}>
                Archive
              </Button>
            )}
          </div>
        ) : (
          hasUnread && (
            <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => apply(() => markAllRead(types))}>
              Mark all as read
            </Button>
          )
        )}
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-accent-dark">{error}</p>}

      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className={`flex gap-3 py-4 ${item.archived ? "opacity-70" : ""}`}>
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              disabled={pending}
              aria-label={`Select "${item.title}"`}
            />
            {/* Stacked on narrow screens; side by side from sm up, with the
                summary taking the slack so a long body never pushes the
                call to action onto its own line. */}
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 sm:flex-1">
                <NotificationSummary notification={item} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {showingArchived && item.archived && <Badge>Archived</Badge>}
                {item.expired && <Badge>Closed</Badge>}
                <OpenNotificationLink id={item.id} className="text-sm font-medium underline underline-offset-4">
                  {item.expired ? "See options" : item.cta_label}
                </OpenNotificationLink>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
