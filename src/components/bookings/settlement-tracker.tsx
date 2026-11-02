"use client";

import { Lock } from "lucide-react";
import { remaining, useSecondsLeft } from "@/components/bookings/request-countdown";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  heldInEscrowLine,
  secondsUntil,
  settlementLine,
  settlementReceipt,
  settlementReference,
  settlementSteps,
  type EscrowAmounts,
  type RentalSettlement,
  type SettlementState,
  type SettlementStepState,
} from "@/lib/settlement";

const SEGMENT: Record<SettlementStepState, string> = {
  done: "bg-success",
  current: "bg-info",
  held: "bg-warning",
  upcoming: "bg-line",
};

const LABEL: Record<SettlementStepState, string> = {
  done: "text-success",
  current: "text-info",
  held: "text-warning",
  upcoming: "text-ink-soft",
};

const STATE_NAME: Record<SettlementStepState, string> = { done: "done", current: "in progress", held: "on hold", upcoming: "to come" };

/** Time left in the claim window, ticking down; the step's own date once it has passed. */
function WindowCountdown({ endsAt, fallback }: { endsAt: string; fallback?: string }) {
  const seconds = useSecondsLeft(secondsUntil(endsAt));
  if (seconds === null || seconds <= 0) return <>{fallback}</>;
  return <span suppressHydrationWarning>Closes in {remaining(seconds)}</span>;
}

/**
 * S3-10: where a returned rental's money stands - returned, the claim window,
 * settled - as a bar with a labelled segment per step, then the sentence for
 * the reader's side, what escrow still holds, and once settled the receipt.
 */
export function SettlementTracker({
  state,
  amounts = {},
  viewer,
}: {
  state: SettlementState;
  amounts?: EscrowAmounts;
  viewer: "renter" | "owner";
}) {
  const steps = settlementSteps(state);
  const held = heldInEscrowLine(state, amounts, viewer);

  return (
    <div>
      <ol aria-label="Payout progress" className="grid grid-cols-3 gap-2">
        {steps.map((step) => (
          <li key={step.key} aria-current={step.state === "current" || step.state === "held" ? "step" : undefined}>
            <span className={`block h-1.5 rounded-full ${SEGMENT[step.state]}`} />
            <span className={`mt-1.5 block text-xs font-semibold ${LABEL[step.state]}`}>
              {step.label}
              <span className="sr-only"> ({STATE_NAME[step.state]})</span>
            </span>
            <span className="block text-xs text-ink-soft">
              {step.key === "window" && step.state === "current" && state.claim_window_ends_at ? (
                <WindowCountdown endsAt={state.claim_window_ends_at} fallback={step.detail} />
              ) : (
                step.detail
              )}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-ink">{settlementLine(state, viewer)}</p>
      {held && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
          <Lock aria-hidden className="h-3.5 w-3.5" />
          {held}
        </p>
      )}
      {state.settlement && <SettlementReceipt settlement={state.settlement} viewer={viewer} />}
    </div>
  );
}

function signed(cents: number, total?: boolean): string {
  if (total || cents >= 0) return formatMoney(cents);
  return `−${formatMoney(-cents)}`;
}

/** The settlement line by line, with its reference: the same on every view, so a rerun of the job visibly changed nothing. */
function SettlementReceipt({ settlement, viewer }: { settlement: RentalSettlement; viewer: "renter" | "owner" }) {
  const lines = settlementReceipt(settlement, viewer);
  if (lines.length === 0) return null;
  const total = lines[lines.length - 1];

  return (
    <details className="mt-2 rounded-md border border-line bg-white px-3 py-2 text-xs">
      <summary className="cursor-pointer select-none">
        <span className="font-semibold text-success">{formatMoney(total.cents)}</span>{" "}
        <span className="text-ink">{viewer === "renter" ? "returned to your wallet" : "paid to your wallet"}</span>
        <span className="text-ink-soft"> · See breakdown</span>
      </summary>
      <dl className="mt-2 space-y-1">
        {lines.map((line) => (
          <div
            key={line.label}
            className={`flex justify-between gap-4 ${line.total ? "border-t border-line pt-1 font-semibold text-ink" : "text-ink-soft"}`}
          >
            <dt>{line.label}</dt>
            <dd className="tabular-nums">{signed(line.cents, line.total)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-ink-soft">
        Settled {formatDateTime(settlement.settled_at)} · Ref {settlementReference(settlement)}
      </p>
    </details>
  );
}
