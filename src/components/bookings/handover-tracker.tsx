import { HANDOVER_CONFIRMATION_WINDOW_HOURS, HANDOVER_PERIOD_OVER_NOTE, handoverPeriodOver, handoverStatusLine, handoverSteps, type HandoverStepState, type HandoverViewer } from "@/lib/handover";
import type { Booking } from "@/lib/bookings";

const SEGMENT: Record<HandoverStepState, string> = {
  done: "bg-success",
  current: "bg-accent",
  upcoming: "bg-line",
};

const STATE_NAME: Record<HandoverStepState, string> = { done: "done", current: "next", upcoming: "to do" };

/**
 * Where a confirmed rental's handover stands (S3-02): a thin bar with a
 * segment per step - green done, red for the one left to do - and one
 * sentence saying what that is, from the reader's own side. The sentence is
 * what a user acts on; the bar only shows how far along they are.
 */
export function HandoverTracker({
  booking,
  viewer,
}: {
  booking: Pick<Booking, "start_date" | "end_date" | "handover_state">;
  viewer: HandoverViewer;
}) {
  const steps = handoverSteps(booking, viewer);
  const current = steps.findIndex((step) => step.state === "current");
  const state = booking.handover_state;
  // The deadline is a reminder for the confirming steps (3 and 4), and only to
  // whoever has still to confirm.
  const confirming = current + 1 === 3 || current + 1 === 4;
  const mineConfirmed = viewer === "renter" ? state?.renter_confirmed_at : state?.owner_confirmed_at;
  const over = handoverPeriodOver(booking);
  const line = over ? HANDOVER_PERIOD_OVER_NOTE : booking.handover_state && handoverStatusLine(booking.handover_state, viewer, booking.start_date);

  return (
    <div>
      <ol aria-label="Handover progress" className="flex gap-1">
        {steps.map((step) => (
          <li key={step.key} aria-current={step.state === "current" ? "step" : undefined} className="flex-1">
            <span className={`block h-1.5 rounded-full ${SEGMENT[step.state]}`} />
            <span className="sr-only">
              {step.label} ({STATE_NAME[step.state]})
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm">
        <span className="eyebrow mr-2">
          Step {current + 1} of {steps.length}
        </span>
        <span className="text-ink">{steps[current]?.label}</span>
      </p>
      {line && <p className="mt-0.5 text-sm text-ink-soft">{line}</p>}
      {confirming && !mineConfirmed && !over && (
        <p className="mt-1 text-xs text-ink-soft">
          Confirm the handover within {HANDOVER_CONFIRMATION_WINDOW_HOURS} hours of the start date.
        </p>
      )}
    </div>
  );
}
