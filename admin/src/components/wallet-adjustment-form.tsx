"use client";

import { useActionState } from "react";
import { Button, Field, FormMessage, Panel, RequiredMark, Select, Textarea } from "./ui";
import { applyWalletAdjustment, type WalletAdjustmentState } from "@/app/wallets/actions";

/**
 * The one action this page exposes: a manual, justified credit or debit.
 *
 * A single form rather than separate credit/debit forms — the direction is
 * just another field — because the two share every other input and the
 * validation, error, and confirmation behaviour are identical either way.
 */
export function WalletAdjustmentForm({ walletId }: { walletId: string }) {
  const [state, action, pending] = useActionState<WalletAdjustmentState, FormData>(
    applyWalletAdjustment,
    undefined,
  );

  return (
    <Panel
      title="Manual adjustment"
      description="Credits or debits the available balance directly. Every adjustment is a new ledger entry and is recorded in the audit trail below."
    >
      <form
        action={action}
        className="space-y-5"
        onSubmit={(event) => {
          const formData = new FormData(event.currentTarget);
          const direction = formData.get("direction") === "DEBIT" ? "debit" : "credit";
          const amount = formData.get("amount") || "0";
          if (!window.confirm(`Apply a ${direction} of $${amount} to this wallet?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="wallet_id" value={walletId} />

        <div>
          <label htmlFor="direction" className="block text-sm font-medium">
            Direction
          </label>
          <Select id="direction" name="direction" className="mt-2" defaultValue="CREDIT">
            <option value="CREDIT">Credit (add funds)</option>
            <option value="DEBIT">Debit (remove funds)</option>
          </Select>
        </div>

        <Field
          label="Amount"
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="0.00"
        />

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
            placeholder="Why this adjustment is being made, for the audit trail."
          />
        </div>

        <FormMessage state={state} />

        <Button type="submit" disabled={pending}>
          {pending ? "Applying…" : "Apply adjustment"}
        </Button>
      </form>
    </Panel>
  );
}
