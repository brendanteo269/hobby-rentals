import { CalendarOff } from "lucide-react";
import { bookingPauseHeadline, type BookingPause } from "@/lib/away";

/**
 * S5-15 Scenario 2: what a renter sees of an owner's away period - "Not
 * taking bookings until 3 Jan" and the owner's optional message. The owner's
 * settings card renders the same component as its preview, so what they are
 * shown is exactly what renters will read.
 *
 * Amber, the app's tone for "worth noticing, not an error", and placed near
 * the top of each page: the calendar alone shows a run of greyed days without
 * saying why or until when, and a renter should learn it before they scroll
 * to the dates.
 *
 * `today` is passed in rather than read here, so a server-rendered page and
 * its hydration agree on whether the period has started.
 */
export function BookingPauseNotice({ pause, today }: { pause: BookingPause; today: string }) {
  return (
    <div role="status" className="flex gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3">
      <CalendarOff className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p className="font-semibold text-ink">{bookingPauseHeadline(pause, today)}</p>
        {pause.message && <p className="mt-1 text-sm text-ink-soft">&ldquo;{pause.message}&rdquo;</p>}
      </div>
    </div>
  );
}
