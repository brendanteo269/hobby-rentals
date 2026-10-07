/**
 * The notifications page's filters, as carried in the URL.
 *
 * In the query string rather than client state for the same reasons as
 * browse-params: a filtered view survives a reload, works with the back
 * button, and is where an email link or the bell can point. The page that
 * reads them, the filter form, and the API call all go through this module.
 */

import { isNotificationType, type NotificationType } from "@/lib/notifications";
import { NOTIFICATIONS_PATH } from "@/lib/routes";

export type ReadFilter = "all" | "unread" | "read";
export type SortOrder = "newest" | "oldest" | "deadline";

export type NotificationFilters = {
  read: ReadFilter;
  types: NotificationType[];
  listingIds: string[];
  actionable: boolean;
  sort: SortOrder;
  archived: boolean;
  /** Opaque keyset cursor from the previous page; "" for the first page. */
  cursor: string;
};

/** What Next hands a page for `?a=1&a=2`: a string, a list, or nothing. */
export type SearchParams = Record<string, string | string[] | undefined>;

export const DEFAULT_FILTERS: NotificationFilters = {
  read: "all",
  types: [],
  listingIds: [],
  actionable: false,
  sort: "newest",
  archived: false,
  cursor: "",
};

const READ_FILTERS: readonly ReadFilter[] = ["all", "unread", "read"];
const SORT_ORDERS: readonly SortOrder[] = ["newest", "oldest", "deadline"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function first(value: string | string[] | undefined): string {
  return toList(value)[0] ?? "";
}

/**
 * Reads the filters from a page's search params. Anything unrecognised falls
 * back to the default rather than erroring: a hand-edited URL should still
 * show notifications, not a broken page.
 */
export function parseNotificationFilters(params: SearchParams): NotificationFilters {
  const read = first(params.read) as ReadFilter;
  const sort = first(params.sort) as SortOrder;
  return {
    read: READ_FILTERS.includes(read) ? read : DEFAULT_FILTERS.read,
    types: [...new Set(toList(params.type).filter(isNotificationType))],
    listingIds: [...new Set(toList(params.listing).filter((value) => UUID.test(value)))],
    actionable: first(params.actionable) === "1",
    sort: SORT_ORDERS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
    archived: first(params.archived) === "1",
    cursor: first(params.cursor),
  };
}

/** The query string for a set of filters, leaving defaults out. */
export function notificationQuery(filters: Partial<NotificationFilters>): URLSearchParams {
  const merged = { ...DEFAULT_FILTERS, ...filters };
  const query = new URLSearchParams();
  if (merged.read !== DEFAULT_FILTERS.read) query.set("read", merged.read);
  for (const type of merged.types) query.append("type", type);
  for (const listingId of merged.listingIds) query.append("listing", listingId);
  if (merged.actionable) query.set("actionable", "1");
  if (merged.sort !== DEFAULT_FILTERS.sort) query.set("sort", merged.sort);
  if (merged.archived) query.set("archived", "1");
  if (merged.cursor) query.set("cursor", merged.cursor);
  return query;
}

/** A link to the notifications page showing these filters. */
export function notificationsHref(filters: Partial<NotificationFilters>): string {
  const query = notificationQuery(filters).toString();
  return query ? `${NOTIFICATIONS_PATH}?${query}` : NOTIFICATIONS_PATH;
}

/**
 * The backend's query string for these filters. Its parameter names differ
 * from the page's (`include_archived` rather than `archived`), so the page's
 * URL is not simply forwarded.
 */
export function notificationApiQuery(filters: NotificationFilters, limit: number): URLSearchParams {
  const query = new URLSearchParams({ read: filters.read, sort: filters.sort, limit: String(limit) });
  for (const type of filters.types) query.append("type", type);
  for (const listingId of filters.listingIds) query.append("listing_id", listingId);
  if (filters.actionable) query.set("actionable", "true");
  if (filters.archived) query.set("include_archived", "true");
  if (filters.cursor) query.set("cursor", filters.cursor);
  return query;
}
