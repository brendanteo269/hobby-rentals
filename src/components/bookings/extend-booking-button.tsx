"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, FormNotice, Modal } from "@/components/ui";
import { quoteExtension, submitExtensionRequest } from "@/app/bookings/actions";
import { formatDate, formatMoney } from "@/lib/format";
import { extensionLines, type ExtensionQuote } from "@/lib/extensions";

/**
 * S3-17: the renter's way to keep an item for longer without starting a new
 * booking.
 *
 * Two steps, for the same reason CancelBookingButton has two: the renter picks
 * a number of days and is quoted - what the extra days cost and what the new
 * return date would be - and only then commits. The quote also answers
 * Scenario 1's availability check, so dates the item is not free for are
 * refused here rather than after the owner has been asked.
 *
 * Nothing is charged by submitting. The hold only grows if the owner approves.
 */
export function ExtendBookingButton({ bookingId, endDate }: { bookingId: string; endDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(1);
  const [quote, setQuote] = useState<ExtensionQuote | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoting, startQuoting] = useTransition();
  const [submitting, startSubmitting] = useTransition();

  function openDialog() {
    setOpen(true);
    setDays(1);
    setQuote(null);
    setSubmitted(false);
    setError(null);
    priceFor(1);
  }

  function close() {
    setOpen(false);
    // The request is now on the booking, and the owner has been notified.
    if (submitted) router.refresh();
  }

  function priceFor(additionalDays: number) {
    setDays(additionalDays);
    setQuote(null);
    setError(null);
    startQuoting(async () => {
      const result = await quoteExtension(bookingId, additionalDays);
      if ("error" in result) setError(result.error);
      else setQuote(result.quote);
    });
  }

  function submit() {
    setError(null);
    startSubmitting(async () => {
      const result = await submitExtensionRequest(bookingId, days);
      if ("error" in result) setError(result.error);
      else setSubmitted(true);
    });
  }

  return (
    <>
      <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={openDialog}>
        Request extension
      </Button>
      {open && (
        <Modal title={submitted ? "Extension requested" : "Keep this item longer?"} onClose={close}>
          <div className="mt-4 space-y-4 text-sm">
            {submitted ? (
              <Submitted newEndDate={quote?.new_end_date} onClose={close} />
            ) : (
              <>
                <div>
                  <label htmlFor="additional-days" className="block font-medium text-ink">
                    How many extra days?
                  </label>
                  <p className="mt-1 text-ink-soft">
                    You have it until {formatDate(endDate)} at the moment.
                  </p>
                  <input
                    id="additional-days"
                    type="number"
                    min={1}
                    max={90}
                    value={days}
                    disabled={submitting}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      // Re-prices on every valid change rather than behind a
                      // button: the availability answer matters as much as the
                      // price, and a renter should not have to ask for it.
                      if (Number.isInteger(next) && next >= 1 && next <= 90) priceFor(next);
                      else setDays(next);
                    }}
                    className="mt-3 w-24 border border-line px-3 py-2"
                  />
                </div>
                {quoting && <p className="text-ink-soft">Checking those days…</p>}
                {quote && (
                  <>
                    <p className="text-ink">
                      You would have it until <span className="font-medium">{formatDate(quote.new_end_date)}</span>.
                    </p>
                    <dl className="divide-y divide-line border-y border-line">
                      {extensionLines(quote).map((line) => (
                        <div
                          key={line.label}
                          className={`flex justify-between gap-4 py-2 ${line.tone === "total" ? "font-medium text-ink" : "text-ink-soft"}`}
                        >
                          <dt>{line.label}</dt>
                          <dd>{formatMoney(line.cents)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-xs text-ink-soft">
                      Nothing is charged now. If the owner approves, {formatMoney(quote.total_delta_cents)} is
                      held from your wallet alongside what this booking already holds. Your deposit does not
                      change.
                    </p>
                  </>
                )}
                <FormNotice message={error ?? undefined} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" disabled={submitting} onClick={close}>
                    Never mind
                  </Button>
                  <Button disabled={!quote || quoting || submitting} onClick={submit}>
                    {submitting ? "Sending…" : "Ask the owner"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function Submitted({ newEndDate, onClose }: { newEndDate?: string; onClose: () => void }) {
  return (
    <>
      <p className="text-ink">
        Your request is with the owner. We will let you know as soon as they answer
        {newEndDate && `, and your return date moves to ${formatDate(newEndDate)} if they approve`}.
      </p>
      <p className="text-xs text-ink-soft">
        Until then, the return date you already have still stands.
      </p>
      <div className="flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </>
  );
}
