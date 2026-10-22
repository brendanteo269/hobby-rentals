import Link from "next/link";
import { Badge, DescriptionList, EmptyState, Panel } from "./ui";
import { EscrowOverrideForm } from "./escrow-override-form";
import { ROUTES } from "@/lib/routes";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  ESCROW_COMPONENT_LABELS,
  ESCROW_TYPE_LABELS,
  summariseEscrowComponents,
  type AdminEscrowDetail,
  type EscrowComponentSummary,
  type EscrowLedgerRow,
} from "@/lib/escrow";

const COMPONENT_STATE_LABELS: Record<EscrowComponentSummary["state"], string> = {
  HELD: "Held",
  RELEASED: "Released to renter",
  SETTLED: "Settled",
};

/**
 * A booking's escrow on its own page (S3-15 / S3-16): the rental fee, deposit
 * and protection as separate lifecycles, the settlement once it has happened,
 * the wallet transactions behind each part, a pointer to the damage dispute
 * when one is holding settlement up, and the manual override.
 *
 * The page's own handover resolution comes first for a booking that needs it:
 * releasing its funds here would leave it confirmed with nothing held, so the
 * override is not offered then.
 */
export function BookingEscrowPanels({
  record,
  needsHandoverResolution,
}: {
  record: AdminEscrowDetail | null;
  needsHandoverResolution: boolean;
}) {
  if (!record || record.ledger.length === 0) {
    return (
      <Panel title="Escrow" description="Wallet holds and releases tied to this booking.">
        <div className="-mx-6 -my-5">
          <EmptyState title="No escrow activity" body="No hold has been placed for this booking." />
        </div>
      </Panel>
    );
  }

  const components = summariseEscrowComponents(record.ledger);
  const heldParts = components.filter((component) => component.state === "HELD");
  const partyLabel = (userId: string) =>
    userId === record.renter_id ? "Renter" : userId === record.owner_id ? "Owner" : "Other";

  const inComponent = new Set(components.flatMap((component) => component.entries.map((entry) => entry.id)));
  const otherEntries = record.ledger.filter((entry) => !inComponent.has(entry.id));

  // Inside a part the part is already the heading, so a row says only what
  // happened, when, and whose wallet. The ledger's own status is shown only when
  // it adds something (a completed row is the normal case), and a hold's
  // description just repeats its type.
  const entryRow = (entry: EscrowLedgerRow, withComponent = false) => (
    <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-sm">
          {ESCROW_TYPE_LABELS[entry.type] ?? entry.type}
          {withComponent &&
            entry.escrow_component &&
            ` · ${ESCROW_COMPONENT_LABELS[entry.escrow_component as keyof typeof ESCROW_COMPONENT_LABELS] ?? entry.escrow_component}`}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {formatDateTime(entry.created_at)} · {partyLabel(entry.user_id)}&apos;s wallet
          {entry.status !== "COMPLETED" && ` · ${entry.status.toLowerCase()}`}
        </p>
        {entry.description && entry.type !== "ESCROW_HOLD" && (
          <p className="mt-0.5 text-xs text-ink-soft">{entry.description}</p>
        )}
      </div>
      <p className="text-sm">{formatMoney(Math.abs(entry.amount_cents))}</p>
    </li>
  );

  return (
    <>
      <Panel
        title="Escrow"
        description="Each part of the hold, with the wallet transactions behind it, oldest first."
      >
        <ul className="space-y-6">
          {components.map((component) => (
            <li key={component.component} className="border-l-2 border-line pl-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{ESCROW_COMPONENT_LABELS[component.component]}</p>
                <div className="flex items-center gap-3">
                  <Badge tone={component.state === "HELD" ? "positive" : "neutral"}>
                    {COMPONENT_STATE_LABELS[component.state]}
                  </Badge>
                  <p className="text-sm font-medium">{formatMoney(component.amount_cents)}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-2 border-t border-line pt-3">{component.entries.map((entry) => entryRow(entry))}</ul>
            </li>
          ))}
          {otherEntries.length > 0 && (
            <li className="border-l-2 border-line pl-4">
              <p className="text-sm font-medium">Other transactions</p>
              <ul className="mt-3 space-y-2 border-t border-line pt-3">{otherEntries.map((entry) => entryRow(entry, true))}</ul>
            </li>
          )}
        </ul>
      </Panel>

      {record.settlement_blocked && (
        <p className="border border-line bg-white px-4 py-3 text-sm text-ink-soft">
          Settlement is waiting on an open damage dispute. Funds stay in escrow until it is decided.{" "}
          {record.dispute_id && (
            <Link href={ROUTES.dispute(record.dispute_id)} className="text-ink underline underline-offset-4">
              View the dispute
            </Link>
          )}
        </p>
      )}

      {needsHandoverResolution && heldParts.length > 0 && (
        <p className="border border-line bg-white px-4 py-3 text-sm text-ink-soft">
          This booking&apos;s handover was not confirmed. Use &ldquo;Resolve the handover&rdquo; above: cancelling releases the
          funds to the renter and tells both parties, which releasing them here would not.
        </p>
      )}
      {!record.settlement_blocked && !needsHandoverResolution && heldParts.length > 0 && (
        <EscrowOverrideForm escrowId={record.id} heldParts={heldParts} />
      )}

      {record.settlement_id && (
        <Panel title="Settlement" description={`Settled ${formatDateTime(record.settled_at)}.`}>
          <DescriptionList
            items={[
              {
                term: "Paid to owner",
                value:
                  record.settlement_owner_payout_cents !== null ? formatMoney(record.settlement_owner_payout_cents) : "—",
              },
              {
                term: "Deposit refunded to renter",
                value:
                  record.settlement_deposit_refund_cents !== null ? formatMoney(record.settlement_deposit_refund_cents) : "—",
              },
              {
                term: "Deducted for damage",
                value:
                  record.settlement_damage_deduction_cents !== null
                    ? formatMoney(record.settlement_damage_deduction_cents)
                    : "—",
              },
            ]}
          />
        </Panel>
      )}
    </>
  );
}
