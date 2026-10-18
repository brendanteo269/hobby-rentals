"use client";

import { useActionState, useEffect } from "react";
import { Button, FormMessage, Panel, RequiredMark, Select, Textarea } from "./ui";
import { useToast } from "./toast";
import { overrideEscrow, type EscrowOverrideState } from "@/app/finances/escrow/[id]/actions";
import { formatMoney } from "@/lib/format";
import { ESCROW_COMPONENT_LABELS, type EscrowComponentSummary } from "@/lib/escrow";

/**
 * The one action this page exposes: a manual, justified release of held funds
 * back to the renter (S3-16).
 *
 * Only live holds are offered, and the picker only ever offers "everything"
 * or the deposit on its own: settlement reads whatever stays held beyond the
 * rental and protection fees as the deposit, so those two can only go with
 * it (admin_override_escrow enforces this too). A single lump hold (a
 * bundle's) or a lone deposit has nothing to choose between, so the picker
 * is left out. The success message is a toast, not inline text, because releasing
 * the last hold makes the page stop rendering this panel.
 */
export function EscrowOverrideForm({
  escrowId,
  heldParts,
}: {
  escrowId: string;
  /** The parts still held; never empty (the page does not render the form otherwise). */
  heldParts: EscrowComponentSummary[];
}) {
  const [state, action, pending] = useActionState<EscrowOverrideState, FormData>(overrideEscrow, undefined);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) show(state.success, "success");
  }, [show, state]);

  const deposit = heldParts.find((part) => part.component === "DEPOSIT");
  const hasChoice = Boolean(deposit) && heldParts.length > 1;
  const heldTotal = heldParts.reduce((sum, part) => sum + part.amount_cents, 0);

  return (
    <Panel
      title="Manual override"
      description="Releases held funds back to the renter's available balance. This adds a corrective ledger entry - existing entries are never changed or removed - and is recorded in the audit trail."
    >
      <form
        action={action}
        className="space-y-5"
        onSubmit={(event) => {
          const formData = new FormData(event.currentTarget);
          const amount = formatMoney(formData.get("component") === "DEPOSIT" && deposit ? deposit.amount_cents : heldTotal);
          if (!window.confirm(`Release ${amount} to the renter? This can't be undone.`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="escrow_id" value={escrowId} />
        {/* The state this page was showing; the override is refused if it has changed since. */}
        <input type="hidden" name="expected_status" value="HELD" />

        {hasChoice && deposit && (
          <div>
            <label htmlFor="component" className="block text-sm font-medium">
              Release
            </label>
            <Select id="component" name="component" className="mt-2" defaultValue="">
              <option value="">Everything held ({formatMoney(heldTotal)})</option>
              <option value="DEPOSIT">
                {ESCROW_COMPONENT_LABELS.DEPOSIT} only ({formatMoney(deposit.amount_cents)})
              </option>
            </Select>
          </div>
        )}

        <div>
          <label htmlFor="reason" className="block text-sm font-medium">
            Justification
            <RequiredMark />
          </label>
          <Textarea
            id="reason"
            name="reason"
            required
            rows={3}
            className="mt-2"
            placeholder="Why these funds are being released, for the audit trail."
          />
        </div>

        <FormMessage state={state?.error ? state : undefined} />

        <Button type="submit" disabled={pending}>
          {pending ? "Releasing…" : "Release to renter"}
        </Button>
      </form>
    </Panel>
  );
}
