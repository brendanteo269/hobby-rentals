"use client";

import { useActionState, useState } from "react";
import { Button, FormMessage, Input, Panel, RequiredMark, Textarea } from "./ui";
import { submitDisputeResolution, type ResolveDisputeState } from "@/app/disputes/[id]/actions";
import { previewDeduction, type DisputeRental } from "@/lib/disputes";
import { formatMoney } from "@/lib/format";

/**
 * S3-10: the decision on an open damage dispute - who is liable and the
 * damage value. Shows what the renter's deposit would cover before it is
 * submitted, since the decision settles the rental at once and can't be undone.
 */
export function DisputeResolveForm({
  disputeId,
  renterId,
  claimedCents,
  rental,
}: {
  disputeId: string;
  renterId: string;
  claimedCents: number;
  rental: DisputeRental | null;
}) {
  const [state, action, pending] = useActionState<ResolveDisputeState, FormData>(submitDisputeResolution, undefined);
  const [liable, setLiable] = useState<"RENTER" | "OWNER">("RENTER");
  const [damage, setDamage] = useState((claimedCents / 100).toFixed(2));
  const damageCents = Math.round(Number(damage || "0") * 100);
  const preview = rental && liable === "RENTER" && damageCents > 0 ? previewDeduction(rental, damageCents) : null;

  return (
    <Panel
      title="Resolve dispute"
      description="The decision settles the rental straight away: the owner is paid, the renter's deposit is returned less any deduction, and the outcome is added to the item's passport. It can't be undone."
    >
      <form
        action={action}
        className="space-y-5"
        onSubmit={(event) => {
          if (!window.confirm("Resolve this dispute and settle the rental? This can't be undone.")) event.preventDefault();
        }}
      >
        <input type="hidden" name="dispute_id" value={disputeId} />
        <input type="hidden" name="renter_id" value={renterId} />

        <fieldset>
          <legend className="text-sm font-medium">
            Who is liable
            <RequiredMark />
          </legend>
          <div className="mt-2 flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="liable_party" value="RENTER" checked={liable === "RENTER"} onChange={() => setLiable("RENTER")} />
              The renter - deduct from their deposit
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="liable_party" value="OWNER" checked={liable === "OWNER"} onChange={() => setLiable("OWNER")} />
              Not the renter - return the full deposit
            </label>
          </div>
        </fieldset>

        {liable === "RENTER" && (
          <div>
            <label htmlFor="damage" className="block text-sm font-medium">
              Damage value (S$)
              <RequiredMark />
            </label>
            <Input
              id="damage"
              name="damage"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={damage}
              onChange={(event) => setDamage(event.target.value)}
              className="mt-2"
            />
            <p className="mt-2 text-xs text-ink-soft">The owner claimed {formatMoney(claimedCents)}.</p>
            {preview && (
              <ul className="mt-3 space-y-1 border-l-2 border-line pl-3 text-xs text-ink-soft">
                <li>Renter owes {formatMoney(preview.liability)}{preview.fromProtection > 0 && `; damage protection pays ${formatMoney(preview.fromProtection)}`}.</li>
                <li>Deducted from the deposit: {formatMoney(preview.deduction)}. Returned to the renter: {formatMoney(preview.depositRefund)}.</li>
                {preview.uncovered > 0 && <li>{formatMoney(preview.uncovered)} is more than the deposit covers and is not collected.</li>}
              </ul>
            )}
          </div>
        )}

        <div>
          <label htmlFor="note" className="block text-sm font-medium">
            Note
            <RequiredMark />
          </label>
          <Textarea
            id="note"
            name="note"
            required
            maxLength={2000}
            rows={3}
            className="mt-2"
            placeholder="What you checked and why. The decision names no admin, so this is its only record."
          />
        </div>

        <FormMessage state={state} />

        <Button type="submit" disabled={pending || Boolean(state?.success)}>
          {pending ? "Resolving…" : "Resolve and settle"}
        </Button>
      </form>
    </Panel>
  );
}
