import Link from "next/link";
import { CalendarOff } from "lucide-react";
import { hasStarted, type AwayPeriod } from "@/lib/away";
import { formatDateRange, formatDayMonth } from "@/lib/format";
import { OWNER_SETTINGS_PATH } from "@/lib/routes";

/**
 * S5-15: tells the owner their listings are paused, wherever they might
 * otherwise wonder why no requests are coming in - across the Owner Portal,
 * and in the listing and bundle forms beside the availability they set.
 *
 * Links to Settings rather than ending away mode here: ending reopens every
 * listing at once, so it keeps its confirmation on the Away mode card.
 */
export function AwayModeReminder({ period, today }: { period: AwayPeriod; today: string }) {
  const message = hasStarted(period, today)
    ? `You're in away mode until ${formatDayMonth(period.end_date)}, so your listings and bundles are not taking bookings.`
    : `Away mode is scheduled for ${formatDateRange(period.start_date, period.end_date)}. Your listings and bundles will not take bookings then.`;

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-surface-muted px-4 py-3 text-sm">
      <CalendarOff className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
      <p className="min-w-0 flex-1">{message}</p>
      <Link href={OWNER_SETTINGS_PATH} className="font-medium underline underline-offset-2 hover:text-accent-dark">
        Manage away mode
      </Link>
    </div>
  );
}
