"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendApiError } from "@/lib/api/client";
import {
  getNotifications,
  markAllNotificationsRead,
  openNotification,
  updateNotifications,
} from "@/lib/api/notifications";
import { NOTIFICATIONS_PATH, notificationPath, safeNextPath } from "@/lib/routes";
import { DEFAULT_FILTERS } from "@/lib/notification-params";
import {
  toNotificationView,
  type BulkAction,
  type NotificationType,
  type NotificationView,
  type OpenedNotification,
} from "@/lib/notifications";

export type NotificationActionResult = { updated: number } | { error: string };

/** How many the bell's dropdown shows; the full list is one click away. */
const RECENT_COUNT = 5;

async function run(change: () => Promise<number>): Promise<NotificationActionResult> {
  try {
    const updated = await change();
    // The layout, not just this page: the header's unread badge has to drop
    // with the list.
    revalidatePath("/", "layout");
    return { updated };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

/** Applies one action to a group of the member's notifications. */
export async function changeNotifications(ids: string[], action: BulkAction) {
  return run(() => updateNotifications(ids, action));
}

/** Marks everything unread as read, within the types the member is filtering to. */
export async function markAllRead(types: NotificationType[]) {
  return run(() => markAllNotificationsRead(types));
}

/**
 * The newest few notifications, fetched when the bell opens rather than on
 * every page render: the header shows on every page, and the count alone is
 * all most of those renders need.
 */
export async function recentNotifications(): Promise<{ items: NotificationView[] } | { error: string }> {
  try {
    const page = await getNotifications(DEFAULT_FILTERS, RECENT_COUNT);
    return { items: page.items.map(toNotificationView) };
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
}

/**
 * Opens a notification from the site - the bell or the list - and goes where
 * its call to action leads.
 *
 * The site does this through an action rather than a plain link to
 * /notifications/[id] because the header's unread badge lives in the root
 * layout, which Next keeps as it is across in-app navigation: following the
 * link marked the notification read but left the badge counting it. An action
 * can revalidate the layout before it redirects. The email link still lands on
 * the page, which is a full load and so renders a fresh header anyway.
 */
export async function openFromSite(id: string): Promise<{ error: string }> {
  let opened: OpenedNotification;
  try {
    opened = await openNotification(id);
  } catch (error) {
    if (error instanceof BackendApiError) return { error: error.message };
    throw error;
  }
  revalidatePath("/", "layout");
  // A closed window is explained by the notification's own page.
  redirect(
    (opened.expired ? notificationPath(id) : (safeNextPath(opened.target_path) ?? NOTIFICATIONS_PATH)) as Route,
  );
}
