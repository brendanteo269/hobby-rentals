"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { endAwayMode, previewAwayClashes, saveAwayMode } from "@/app/listings/mine/settings/actions";
import { BookingPauseNotice } from "@/components/listings/booking-pause-notice";
import { useToast } from "@/components/toast";
import { Badge, Button, Field, FormError, FormNotice, Modal, TextareaField } from "@/components/ui";
import {
  AWAY_MESSAGE_MAX_LENGTH,
  awayMessagePlaceholder,
  hasStarted,
  isDeclinable,
  latestAwayEnd,
  type AwayClash,
  type AwayPeriod,
} from "@/lib/away";
import { formatDateRange } from "@/lib/format";

type Review = { clashes: AwayClash[]; changed: boolean };

/**
 * S5-15: the owner turns Away mode on, changes it, or ends it.
 *
 * Saving is two steps only when it has to be. The range is previewed first;
 * with nothing in it the period saves straight away, and otherwise the owner
 * sees every booking and request it lands on (Scenario 3) before anything is
 * written. Keyed by the period in the page, so a save that comes back from
 * the server starts this card afresh rather than keeping the form's old state.
 */
export function AwayModeCard({ period, today }: { period: AwayPeriod | null; today: string }) {
  const started = period ? hasStarted(period, today) : false;
  const [editing, setEditing] = useState(period === null);
  const [startDate, setStartDate] = useState(period?.start_date ?? "");
  const [endDate, setEndDate] = useState(period?.end_date ?? "");
  const [message, setMessage] = useState(period?.message ?? "");
  const [review, setReview] = useState<Review | null>(null);
  const [declineIds, setDeclineIds] = useState<Set<string>>(new Set());
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { show } = useToast();

  const draft: AwayPeriod | null =
    startDate && endDate ? { start_date: startDate, end_date: endDate, message: message.trim() || null } : null;
  const verb = period ? "Save changes" : "Turn on away mode";

  /** A fresh review ticks every pending request: declining is the usual reason to go away. */
  function openReview(clashes: AwayClash[], changed: boolean) {
    setReview({ clashes, changed });
    setDeclineIds(new Set(clashes.filter(isDeclinable).map((clash) => clash.id)));
  }

  function save(clashes: AwayClash[], decline: Set<string>) {
    startTransition(async () => {
      const result = await saveAwayMode({
        startDate,
        endDate,
        message,
        acknowledgedIds: clashes.map((clash) => clash.id),
        declineIds: [...decline],
      });
      if ("saved" in result) {
        setReview(null);
        const declined = result.saved.declined.length;
        const skipped = result.saved.not_declined.length;
        show(
          [
            period ? "Away mode updated." : "Away mode is on.",
            declined ? `${declined} request${declined === 1 ? "" : "s"} declined.` : "",
            skipped ? `${skipped} had already been answered.` : "",
          ].filter(Boolean).join(" "),
          "success",
        );
        return;
      }
      if (result.clashesChanged) {
        const fresh = await previewAwayClashes(startDate, endDate);
        if ("clashes" in fresh) openReview(fresh.clashes, true);
        else setError(fresh.error);
        return;
      }
      setReview(null);
      setError(result.error);
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await previewAwayClashes(startDate, endDate);
      if ("error" in result) setError(result.error);
      else if (result.clashes.length === 0) save([], new Set());
      else openReview(result.clashes, false);
    });
  }

  function end() {
    startTransition(async () => {
      const result = await endAwayMode();
      setConfirmingEnd(false);
      if ("error" in result) setError(result.error);
      else show(started ? "Away mode ended. Your listings are taking bookings again." : "Away mode cancelled.", "success");
    });
  }

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="heading text-lg">Away mode</h2>
        {period && <Badge variant={started ? "warning" : "info"}>{started ? "Away now" : "Scheduled"}</Badge>}
      </div>
      <p className="body-copy mt-2">
        Pause every listing and bundle while you are unavailable. Renters see that you are not taking bookings for those
        dates.
      </p>

      {period && !editing ? (
        <div className="mt-5 space-y-4">
          <p className="text-sm font-medium">{formatDateRange(period.start_date, period.end_date)}</p>
          <div>
            <p className="eyebrow">Renters see</p>
            <div className="mt-2">
              <BookingPauseNotice pause={period} today={today} />
            </div>
          </div>
          <FormError message={error ?? undefined} />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="outline" onClick={() => setConfirmingEnd(true)}>
              {started ? "End now" : "Cancel away mode"}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="From"
              id="away_start"
              type="date"
              required
              value={startDate}
              min={started ? undefined : today}
              // Once under way, the days behind it are history: only the end can move.
              disabled={started}
              hint={started ? "Away mode has started, so only the end date can change." : undefined}
              onChange={(event) => {
                setStartDate(event.target.value);
                if (endDate && event.target.value && endDate < event.target.value) setEndDate("");
              }}
            />
            <Field
              label="Until"
              id="away_end"
              type="date"
              required
              value={endDate}
              min={startDate || today}
              max={startDate ? latestAwayEnd(startDate) : undefined}
              hint="Up to 90 days, including both dates."
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <TextareaField
            label="Message to renters (optional)"
            id="away_message"
            rows={2}
            maxLength={AWAY_MESSAGE_MAX_LENGTH}
            value={message}
            placeholder={awayMessagePlaceholder(endDate)}
            hint={`${message.length}/${AWAY_MESSAGE_MAX_LENGTH} · No contact details.`}
            onChange={(event) => setMessage(event.target.value)}
          />
          {draft && (
            <div>
              <p className="eyebrow">Renters will see</p>
              <div className="mt-2">
                <BookingPauseNotice pause={draft} today={today} />
              </div>
            </div>
          )}
          <FormError message={error ?? undefined} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending || !draft}>
              {pending ? "Checking your bookings…" : verb}
            </Button>
            {period && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}

      {review && (
        <ClashReview
          review={review}
          declineIds={declineIds}
          onToggle={(id) =>
            setDeclineIds((current) => {
              const next = new Set(current);
              if (!next.delete(id)) next.add(id);
              return next;
            })
          }
          verb={verb}
          pending={pending}
          onBack={() => setReview(null)}
          onConfirm={() => save(review.clashes, declineIds)}
        />
      )}

      {confirmingEnd && (
        <Modal title={started ? "End away mode now?" : "Cancel away mode?"} onClose={() => setConfirmingEnd(false)}>
          <p className="body-copy mt-4">
            Your listings and bundles take bookings again for these dates straight away. Renters waiting on them are
            told.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmingEnd(false)}>
              Keep it
            </Button>
            <Button disabled={pending} onClick={end}>
              {started ? "End now" : "Cancel away mode"}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}

/**
 * Scenario 3: everything the period lands on, before it is saved. Confirmed
 * and active bookings are kept and only listed, so the owner plans the
 * handover; pending requests each carry a box, ticked to decline.
 */
function ClashReview({
  review,
  declineIds,
  onToggle,
  verb,
  pending,
  onBack,
  onConfirm,
}: {
  review: Review;
  declineIds: Set<string>;
  onToggle: (id: string) => void;
  verb: string;
  pending: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const kept = review.clashes.filter((clash) => !isDeclinable(clash));
  const requests = review.clashes.filter(isDeclinable);
  const declining = requests.filter((clash) => declineIds.has(clash.id)).length;

  return (
    <Modal title="Before you go away" onClose={onBack}>
      {review.changed && (
        <div className="mt-4">
          <FormNotice message="Something changed since you looked. Check the updated list." />
        </div>
      )}

      {kept.length > 0 && (
        <div className="mt-5">
          <h3 className="font-medium">Confirmed bookings — kept</h3>
          <ul className="mt-2 space-y-2">
            {kept.map((clash) => (
              <li key={clash.id} className="flex gap-3 rounded-lg border border-line p-3 text-sm">
                <Lock className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden="true" />
                <div>
                  <p>
                    <span className="font-medium">{clash.item_name}</span>
                    {clash.renter_name && ` · ${clash.renter_name}`} · {formatDateRange(clash.start_date, clash.end_date)}
                  </p>
                  <p className="mt-1 text-ink-soft">You will still need to hand this over and take it back.</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {requests.length > 0 && (
        <fieldset className="mt-5">
          <legend className="font-medium">Pending requests — choose what to decline</legend>
          <ul className="mt-2 space-y-2">
            {requests.map((clash) => (
              <li key={clash.id}>
                <label className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 text-sm has-checked:border-ink">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-ink"
                    checked={declineIds.has(clash.id)}
                    onChange={() => onToggle(clash.id)}
                  />
                  <span>
                    <span className="font-medium">{clash.item_name}</span>
                    {clash.renter_name && ` · ${clash.renter_name}`} · {formatDateRange(clash.start_date, clash.end_date)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-soft">
            Declined renters are told the dates are unavailable, and their holds are released. Requests you keep stay open
            for you to answer.
          </p>
        </fieldset>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button disabled={pending} onClick={onConfirm}>
          {pending ? "Saving…" : declining ? `Decline ${declining} & ${verb.toLowerCase()}` : verb}
        </Button>
      </div>
    </Modal>
  );
}
