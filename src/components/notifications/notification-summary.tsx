import type { NotificationView } from "@/lib/notifications";

/**
 * A notification's words: unread marker, title, body, what happens next and
 * when. Shared by the bell's dropdown and the notifications page, which wrap
 * it in their own controls.
 */
export function NotificationSummary({
  notification,
  compact = false,
}: {
  notification: NotificationView;
  /** The dropdown drops the "what happens next" line to stay short. */
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.read ? "bg-transparent" : "bg-accent"}`}
      />
      <div className="min-w-0">
        <p className={`text-sm ${notification.read ? "text-ink" : "font-semibold text-ink"}`}>
          {notification.title}
          {!notification.read && <span className="sr-only"> (unread)</span>}
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">{notification.body}</p>
        {!compact && <p className="mt-1 text-sm text-ink">{notification.next_step}</p>}
        <p className="mt-1 text-xs text-ink-soft">{notification.when}</p>
      </div>
    </div>
  );
}
