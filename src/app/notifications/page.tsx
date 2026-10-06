import Link from "next/link";
import type { Route } from "next";
import { unstable_rethrow } from "next/navigation";
import { Container, EmptyState } from "@/components/ui";
import { NotificationFiltersBar } from "@/components/notifications/notification-filters";
import { NotificationList } from "@/components/notifications/notification-list";
import { BackendApiError } from "@/lib/api/client";
import { getNotifications } from "@/lib/api/notifications";
import {
  DEFAULT_FILTERS,
  notificationsHref,
  parseNotificationFilters,
  type NotificationFilters,
  type SearchParams,
} from "@/lib/notification-params";
import { toNotificationView, type NotificationPage } from "@/lib/notifications";

export const metadata = { title: "Notifications — HobbyRentals" };

function isFiltered(filters: NotificationFilters): boolean {
  return (
    filters.read !== DEFAULT_FILTERS.read ||
    filters.types.length > 0 ||
    filters.archived !== DEFAULT_FILTERS.archived
  );
}

/**
 * Every notification the member has, filterable and sortable (Scenario 5).
 * The bell shows the newest few; this is where the rest live.
 */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = parseNotificationFilters(await searchParams);

  let page: NotificationPage;
  try {
    page = await getNotifications(filters);
  } catch (error) {
    unstable_rethrow(error);
    // A stale or hand-edited cursor is the one request the backend refuses
    // here; start the list again rather than showing an error page.
    if (error instanceof BackendApiError && error.status === 422 && filters.cursor) {
      page = await getNotifications({ ...filters, cursor: "" });
    } else {
      throw error;
    }
  }

  return (
    <Container className="py-16">
      <p className="eyebrow">Your account</p>
      <h1 className="heading mt-3 text-3xl">Notifications</h1>
      <p className="body-copy mt-2">Every change to your bookings, and what to expect next.</p>

      <NotificationFiltersBar filters={filters} />

      {page.items.length === 0 ? (
        <div className="mt-8">
          {isFiltered(filters) ? (
            <p className="body-copy">No notifications match these filters.</p>
          ) : (
            <EmptyState
              title="No notifications yet"
              body="When one of your bookings changes, you will hear about it here and by email."
            />
          )}
        </div>
      ) : (
        <NotificationList
          items={page.items.map(toNotificationView)}
          showingArchived={filters.archived}
          types={filters.types}
        />
      )}

      {(filters.cursor || page.next_cursor) && (
        <nav className="mt-6 flex justify-between text-sm" aria-label="Notification pages">
          {filters.cursor ? (
            <Link href={notificationsHref({ ...filters, cursor: "" }) as Route} className="underline underline-offset-4">
              Back to the start
            </Link>
          ) : (
            <span />
          )}
          {page.next_cursor && (
            <Link
              href={notificationsHref({ ...filters, cursor: page.next_cursor }) as Route}
              className="underline underline-offset-4"
            >
              {filters.sort === "newest" ? "Older notifications" : "Newer notifications"}
            </Link>
          )}
        </nav>
      )}
    </Container>
  );
}
