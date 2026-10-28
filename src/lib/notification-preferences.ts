import type { NotificationCategory } from "@/lib/notifications";

/**
 * S4-XX: a member's email choice for one notification category. Turning email
 * off never hides the notification on the site.
 */
export type NotificationPreference = {
  category: NotificationCategory;
  email_enabled: boolean;
  /**
   * What in this category is emailed whatever is chosen (Scenario 3), named by
   * app/notification_catalog.py ALWAYS_EMAILED. Empty when the switch covers it all.
   */
  always_emailed: string[];
};

/** What each category covers, in the words the settings page uses. */
export const CATEGORY_COPY: Record<NotificationCategory, { label: string; description: string }> = {
  BOOKING: { label: "Bookings", description: "Requests, approvals, handovers, returns and reviews." },
  MESSAGE: { label: "Messages", description: "New messages from the people you rent with." },
  MEETUP: { label: "Meetups", description: "Proposed and accepted handover times and places." },
  EXTENSION: { label: "Extensions", description: "Requests to keep an item longer, and their answers." },
  WAITLIST: { label: "Waitlists", description: "Joining a waitlist, and offers when your turn comes up." },
  LISTING: {
    label: "Listings and alerts",
    description:
      "Saved-search matches, availability alerts, HobbyShield reminders, and reports or changes to your listings.",
  },
  // Everything else in this category is always emailed, and listed as such.
  ACCOUNT: { label: "Account", description: "The outcome of reports you've made." },
};

/** Every category, in the order the settings page lists them. */
export const NOTIFICATION_CATEGORIES = Object.keys(CATEGORY_COPY) as NotificationCategory[];

/** The form field that carries one category's choice. */
export function preferenceFieldName(category: NotificationCategory): string {
  return `email_${category}`;
}
