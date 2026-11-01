import { Zap } from "lucide-react";

/**
 * S5-11 Scenario 1: the owner allowing Trusted Renters to skip their
 * approval.
 *
 * Says what turning it on gives up before it is turned on, because that is
 * the whole decision: the owner is agreeing in advance to bookings they will
 * not see until they are made. Who qualifies is stated outright rather than
 * left as "trusted renters" - an owner cannot judge a rule they have to go
 * and look up.
 *
 * A plain checkbox, not a styled pill: this is a form field the owner reads
 * and answers, not a filter they flick on and off.
 */
export function InstantBookField({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-4">
      <input
        type="checkbox"
        name="instant_book_enabled"
        value="1"
        defaultChecked={defaultChecked}
        className="mt-1 size-4 shrink-0 accent-ink"
      />
      <span>
        <span className="flex items-center gap-1.5 font-medium text-ink">
          <Zap className="size-4" aria-hidden="true" />
          Let Trusted Renters book instantly
        </span>
        <span className="body-copy mt-1 block text-sm">
          Their booking is confirmed the moment they make it, without waiting for you. You will be
          told, but there is nothing to approve. Everyone else still sends you a request to review.
        </span>
        <span className="mt-1 block text-sm text-ink-soft">
          A Trusted Renter has completed at least 3 rentals, returned 95% of them on time, and has
          no more than 1 upheld damage claim.
        </span>
      </span>
    </label>
  );
}
