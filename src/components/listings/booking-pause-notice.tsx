import { CalendarOff } from "lucide-react";
import { bookingPauseHeadline, type BookingPause } from "@/lib/away";

/**
 * S5-15 Scenario 2: what a renter sees of an owner's away period - "Not
 * taking bookings until 3 Jan" and the owner's optional message. The owner's
 * settings card renders the same component as its preview, so what they are
 * shown is exactly what renters will read.
 *
 * `today` is passed in rather than read here, so a server-rendered page and
 * its hydration agree on whether the period has started.
 */
export function BookingPauseNotice({ pause, today }: { pause: BookingPause; today: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-line bg-surface-muted p-3 text-sm">
      <CalendarOff className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden="true" />
      <div>
        <p className="font-medium text-ink">{bookingPauseHeadline(pause, today)}</p>
        {pause.message && <p className="mt-1 text-ink-soft">&ldquo;{pause.message}&rdquo;</p>}
      </div>
    </div>
  );
}
