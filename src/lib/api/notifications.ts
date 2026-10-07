import "server-only";

import { backendRequest } from "@/lib/api/client";
import { notificationApiQuery, type NotificationFilters } from "@/lib/notification-params";
import type {
  BulkAction,
  NotificationPage,
  NotificationType,
  OpenedNotification,
} from "@/lib/notifications";

export const NOTIFICATIONS_PAGE_SIZE = 20;

/** One page of the member's notifications, filtered and sorted as the page asks. */
export function getNotifications(filters: NotificationFilters, limit = NOTIFICATIONS_PAGE_SIZE) {
  return backendRequest<NotificationPage>(`/notifications?${notificationApiQuery(filters, limit)}`);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count } = await backendRequest<{ count: number }>("/notifications/unread-count");
  return count;
}

/**
 * Resolves a notification's call to action and marks it read. Changes no
 * booking, so a prefetch or an email scanner can at worst mark it read.
 */
export function openNotification(id: string) {
  return backendRequest<OpenedNotification>(`/notifications/${encodeURIComponent(id)}/open`, {
    method: "POST",
  });
}

export async function updateNotifications(ids: string[], action: BulkAction): Promise<number> {
  const { updated } = await backendRequest<{ updated: number }>("/notifications/bulk", {
    method: "POST",
    body: JSON.stringify({ ids, action }),
  });
  return updated;
}

export async function markAllNotificationsRead(types: NotificationType[]): Promise<number> {
  const { updated } = await backendRequest<{ updated: number }>("/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({ types: types.length ? types : null }),
  });
  return updated;
}
