import Link from "next/link";
import type { Route } from "next";
import { Button, Select } from "@/components/ui";
import {
  notificationsHref,
  type NotificationFilters,
  type ReadFilter,
} from "@/lib/notification-params";
import { NOTIFICATION_TYPES, NOTIFICATION_TYPE_LABELS } from "@/lib/notifications";
import { NOTIFICATIONS_PATH } from "@/lib/routes";

const READ_TABS: { value: ReadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

/**
 * Filter and sort controls. A plain GET form, so it works without JavaScript
 * and every choice lands in the URL. Changing a filter always starts again at
 * the first page: a cursor from one filtered list means nothing in another.
 */
export function NotificationFiltersBar({ filters }: { filters: NotificationFilters }) {
  return (
    <div className="mt-8 space-y-4">
      <nav className="flex gap-6 border-b border-line" aria-label="Read status">
        {READ_TABS.map((tab) => {
          const active = tab.value === filters.read;
          return (
            <Link
              key={tab.value}
              href={notificationsHref({ ...filters, read: tab.value, cursor: "" }) as Route}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 pb-3 text-sm ${active ? "border-ink font-semibold text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <form action={NOTIFICATIONS_PATH} method="get" className="flex flex-wrap items-end gap-3">
        {filters.read !== "all" && <input type="hidden" name="read" value={filters.read} />}
        <label className="text-sm">
          <span className="mb-1 block text-xs text-ink-soft">Type</span>
          <Select name="type" defaultValue={filters.types[0] ?? ""}>
            <option value="">All types</option>
            {NOTIFICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {NOTIFICATION_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-ink-soft">Sort</span>
          <Select name="sort" defaultValue={filters.sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </Select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-ink-soft">
          <input type="checkbox" name="archived" value="1" defaultChecked={filters.archived} />
          Include archived
        </label>
        <Button type="submit" variant="outline" className="px-4 py-2 text-xs">
          Apply
        </Button>
      </form>
    </div>
  );
}
