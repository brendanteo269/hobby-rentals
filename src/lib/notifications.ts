/**
 * The shapes the notifications API returns, and the labels for its types.
 *
 * Notification text arrives already rendered by the backend's catalog, so
 * nothing here formats a title or body: the site and the email say the same
 * thing because only one place writes it.
 */

import { formatDateTime } from "@/lib/format";

export type NotificationType =
  | "BOOKING_REQUESTED"
  | "BOOKING_ACCEPTED"
  | "BOOKING_DECLINED"
  | "BOOKING_WITHDRAWN"
  | "BOOKING_EXPIRED"
  | "BOOKING_STARTED"
  | "BOOKING_COMPLETED"
  | "BOOKING_CANCELLED"
  // The owner's side of a request lapsing before they answered it.
  | "BOOKING_REQUEST_EXPIRED_OWNER"
  // A bundle booking notifies once per change, as one order.
  | "BUNDLE_REQUESTED"
  | "BUNDLE_ACCEPTED"
  | "BUNDLE_DECLINED"
  | "BUNDLE_WITHDRAWN"
  | "BUNDLE_EXPIRED"
  | "BUNDLE_STARTED"
  | "BUNDLE_COMPLETED"
  | "BUNDLE_CANCELLED"
  | "BUNDLE_REQUEST_EXPIRED_OWNER"
  // S2-15. A waitlist offer's call to action expires on a clock rather than
  // on a booking's status, so these carry an expires_at that matters.
  | "WAITLIST_JOINED"
  | "WAITLIST_OFFERED"
  | "WAITLIST_OFFER_EXPIRED"
  // S2-19: handover meetup coordination on a confirmed booking.
  | "MEETUP_PROPOSED"
  | "MEETUP_ACCEPTED"
  // S2-23: an administrator deactivated or reactivated the listing - the
  // one lifecycle change the owner did not initiate themselves.
  | "LISTING_DEACTIVATED"
  | "LISTING_REACTIVATED"
  // S2-16: the other party sent a plain text/attachment message.
  | "MESSAGE_RECEIVED";

export type AppNotification = {
  id: string;
  type: NotificationType;
  category: "BOOKING" | "WAITLIST" | "MEETUP" | "LISTING" | "MESSAGE";
  title: string;
  body: string;
  /** What the member can expect to happen next. */
  next_step: string;
  cta_label: string;
  booking_id: string | null;
  /** Set instead of booking_id when the notification is about a bundle. */
  bundle_booking_id: string | null;
  created_at: string;
  read: boolean;
  archived: boolean;
  expires_at: string | null;
  /** The call to action no longer applies; show it as closed. */
  expired: boolean;
};

export type NotificationPage = {
  items: AppNotification[];
  /** Pass back as `cursor` for the next page; null on the last one. */
  next_cursor: string | null;
};

/** What opening a notification's call to action resolved to. */
export type OpenedNotification =
  | { expired: false; target_path: string; closed_at: null; remediation: null }
  | {
      expired: true;
      target_path: null;
      closed_at: string;
      remediation: { label: string; path: string } | null;
    };

export type BulkAction = "mark_read" | "mark_unread" | "archive" | "unarchive";

/** Filter labels, in the order a member meets these events. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  BOOKING_REQUESTED: "Request sent",
  BOOKING_ACCEPTED: "Accepted",
  BOOKING_DECLINED: "Declined",
  BOOKING_WITHDRAWN: "Withdrawn",
  BOOKING_EXPIRED: "Expired",
  BOOKING_STARTED: "Rental started",
  BOOKING_COMPLETED: "Rental completed",
  BOOKING_CANCELLED: "Cancelled",
  BOOKING_REQUEST_EXPIRED_OWNER: "Request expired unanswered",
  BUNDLE_REQUESTED: "Bundle request sent",
  BUNDLE_ACCEPTED: "Bundle accepted",
  BUNDLE_DECLINED: "Bundle declined",
  BUNDLE_WITHDRAWN: "Bundle withdrawn",
  BUNDLE_EXPIRED: "Bundle expired",
  BUNDLE_STARTED: "Bundle rental started",
  BUNDLE_COMPLETED: "Bundle rental completed",
  BUNDLE_CANCELLED: "Bundle cancelled",
  BUNDLE_REQUEST_EXPIRED_OWNER: "Bundle request expired unanswered",
  WAITLIST_JOINED: "Waitlist joined",
  WAITLIST_OFFERED: "Waitlist dates free",
  WAITLIST_OFFER_EXPIRED: "Waitlist offer closed",
  MEETUP_PROPOSED: "Meetup proposed",
  MEETUP_ACCEPTED: "Meetup confirmed",
  LISTING_DEACTIVATED: "Listing deactivated",
  LISTING_REACTIVATED: "Listing reactivated",
  MESSAGE_RECEIVED: "New message",
};

export const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[];

export function isNotificationType(value: string): value is NotificationType {
  return value in NOTIFICATION_TYPE_LABELS;
}

/**
 * A notification with its time already formatted. Formatted on the server and
 * passed down as text, because the lists that show it are client components:
 * formatting there again would use the browser's clock and time zone, and
 * the two renders would disagree at hydration.
 */
export type NotificationView = AppNotification & { when: string };

export function toNotificationView(notification: AppNotification): NotificationView {
  return { ...notification, when: formatDateTime(notification.created_at) };
}
