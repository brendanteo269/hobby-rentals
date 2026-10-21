import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { AUDIT_PAGE_SIZE, getBookingAuditTrail, recordEscrowViewed } from "@/lib/audit";
import { ROUTES } from "@/lib/routes";
import { formatDateTime, formatMoney, shortId } from "@/lib/format";
import {
  ESCROW_COMPONENT_LABELS,
  ESCROW_TYPE_LABELS,
  getEscrowRecordById,
  holdStateLabel,
  holdStateTone,
  summariseEscrowComponents,
  type EscrowComponentSummary,
} from "@/lib/escrow";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/bookings";
import { Badge, Container, DescriptionList, EmptyState, Panel } from "@/components/ui";
import { AuditTrail } from "@/components/audit-trail";
import { EscrowOverrideForm } from "@/components/escrow-override-form";

export const metadata = { title: "Escrow record — HobbyRentals Admin" };

const COMPONENT_STATE_LABELS: Record<EscrowComponentSummary["state"], string> = {
  HELD: "Held",
  RELEASED: "Released to renter",
  SETTLED: "Settled",
};

/**
 * S3-15 / S3-16: escrow record - the rental fee and security deposit as
 * separate lifecycles, why settlement is blocked (if it is), and every wallet
 * transaction behind them. The only write is the manual override panel
 * (release held funds to the renter), offered while something is still held
 * and no dispute is open. It moves money only; starting or cancelling the
 * booking itself (S3-02) is on the booking page, which this page points to.
 */
export default async function EscrowRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auditPage?: string }>;
}) {
  await requirePortalSession();
  const { id } = await params;
  const { auditPage: auditPageParam } = await searchParams;
  const auditPage = Math.max(1, Number(auditPageParam) || 1);

  const record = await getEscrowRecordById(id);
  // Covers a malformed id, an unknown one and a rental with no hold alike, so
  // this page cannot be used to probe which ids are real.
  if (!record) notFound();

  // Financial detail is sensitive, so looking is itself recorded - same
  // pattern as the booking detail page.
  await recordEscrowViewed(id, record.renter_id);

  const { entries: auditEntries, total: auditTotal } = await getBookingAuditTrail(id, record.renter_id, auditPage);
  const auditLastPage = Math.max(1, Math.ceil(auditTotal / AUDIT_PAGE_SIZE));

  const components = summariseEscrowComponents(record.ledger);
  const heldParts = components.filter((component) => component.state === "HELD");
  const partyLabel = (userId: string) =>
    userId === record.renter_id ? "Renter" : userId === record.owner_id ? "Owner" : "Other";

  return (
    <Container className="py-12">
      <Link href={ROUTES.escrow} className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
        ← Escrow
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{record.subject_type === "BUNDLE" ? "Bundle escrow" : "Escrow"}</p>
          <h1 className="display-caps mt-3 text-3xl">{record.subject_name}</h1>
          <p className="body-copy mt-2">{shortId(record.id)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={holdStateTone(record.hold_state)}>{holdStateLabel(record.hold_state)}</Badge>
          <Badge tone={bookingStatusTone(record.status)}>{bookingStatusLabel(record.status)}</Badge>
          {record.settlement_blocked && <Badge tone="critical">Settlement blocked</Badge>}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {record.settlement_blocked && (
            <Panel title="Settlement blocked" description="Funds stay in escrow until this claim is resolved.">
              <DescriptionList
                items={[
                  { term: "Reason", value: "Open damage claim" },
                  {
                    term: "Claim state",
                    value: <Badge tone="critical">{record.dispute_status ?? "OPEN"}</Badge>,
                  },
                  {
                    term: "Amount claimed",
                    value: record.dispute_claimed_cents !== null ? formatMoney(record.dispute_claimed_cents) : "—",
                  },
                  { term: "Opened", value: formatDateTime(record.dispute_opened_at) },
                  { term: "Owner's description", value: record.dispute_description ?? "—" },
                  {
                    term: "Claim",
                    value: record.dispute_id ? (
                      <Link href={ROUTES.dispute(record.dispute_id)} className="underline underline-offset-4">
                        View damage dispute
                      </Link>
                    ) : (
                      "—"
                    ),
                  },
                ]}
              />
            </Panel>
          )}

          <Panel
            title="Rental fee and security deposit"
            description="Each part of the hold is tracked on its own."
          >
            {components.length === 0 ? (
              <div className="-mx-6 -my-5">
                <EmptyState title="No holds" body="No escrow hold is recorded for this rental." />
              </div>
            ) : (
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
                    <p className="mt-1 text-xs text-ink-soft">
                      Held {formatDateTime(component.held_at)}
                      {component.closed_at && ` · ${COMPONENT_STATE_LABELS[component.state]} ${formatDateTime(component.closed_at)}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* An open dispute is resolved through arbitration, never overridden; the
              blocked-settlement panel above points there instead. */}
          {record.subject_type === "BOOKING" && record.status === "CONFIRMED" && heldParts.length > 0 && (
            <p className="border border-line bg-white px-4 py-3 text-sm text-ink-soft">
              This booking is still confirmed. To start or cancel it, use{" "}
              <Link href={ROUTES.booking(record.id)} className="underline underline-offset-4">
                the booking page
              </Link>
              . Releasing funds here leaves the booking as it is, and neither party is told.
            </p>
          )}
          {!record.settlement_blocked && heldParts.length > 0 && (
            <EscrowOverrideForm escrowId={record.id} heldParts={heldParts} />
          )}

          {record.settlement_id && (
            <Panel title="Settlement" description={`Settled ${formatDateTime(record.settled_at)}.`}>
              <DescriptionList
                items={[
                  {
                    term: "Paid to owner",
                    value:
                      record.settlement_owner_payout_cents !== null
                        ? formatMoney(record.settlement_owner_payout_cents)
                        : "—",
                  },
                  {
                    term: "Deposit refunded to renter",
                    value:
                      record.settlement_deposit_refund_cents !== null
                        ? formatMoney(record.settlement_deposit_refund_cents)
                        : "—",
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

          <Panel title="Wallet transactions" description="Every ledger entry behind this escrow, oldest first.">
            {record.ledger.length === 0 ? (
              <div className="-mx-6 -my-5">
                <EmptyState title="No transactions" body="No wallet transactions are tied to this rental." />
              </div>
            ) : (
              <ul className="space-y-3">
                {record.ledger.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-line pl-4">
                    <div>
                      <p className="text-sm font-medium">
                        {ESCROW_TYPE_LABELS[entry.type] ?? entry.type}
                        {entry.escrow_component &&
                          ` · ${ESCROW_COMPONENT_LABELS[entry.escrow_component as keyof typeof ESCROW_COMPONENT_LABELS] ?? entry.escrow_component}`}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {formatDateTime(entry.created_at)} · {entry.status} · {partyLabel(entry.user_id)}&apos;s wallet
                      </p>
                      {entry.description && <p className="mt-0.5 text-xs text-ink-soft">{entry.description}</p>}
                    </div>
                    <p className="text-sm font-medium">{formatMoney(Math.abs(entry.amount_cents))}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Parties">
            <DescriptionList
              items={[
                {
                  term: "Renter",
                  value: (
                    <Link href={ROUTES.user(record.renter_id)} className="underline underline-offset-4">
                      {record.renter_display_name ?? "No name"}
                    </Link>
                  ),
                },
                { term: "Renter email", value: record.renter_email ?? "—" },
                {
                  term: "Owner",
                  value: (
                    <Link href={ROUTES.user(record.owner_id)} className="underline underline-offset-4">
                      {record.owner_display_name ?? "No name"}
                    </Link>
                  ),
                },
                { term: "Owner email", value: record.owner_email ?? "—" },
              ]}
            />
          </Panel>

          <Panel title="Identifiers">
            <DescriptionList
              items={[
                {
                  term: record.subject_type === "BUNDLE" ? "Bundle booking ID" : "Booking ID",
                  value: <code className="text-xs">{record.id}</code>,
                },
                { term: "Renter ID", value: <code className="text-xs">{record.renter_id}</code> },
                { term: "Owner ID", value: <code className="text-xs">{record.owner_id}</code> },
                { term: "Created", value: formatDateTime(record.created_at) },
                ...(record.subject_type === "BOOKING"
                  ? [
                      {
                        term: "Booking",
                        value: (
                          <Link href={ROUTES.booking(record.id)} className="underline underline-offset-4">
                            View booking
                          </Link>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Panel>

          <AuditTrail
            entries={auditEntries}
            page={auditPage}
            lastPage={auditLastPage}
            hrefForPage={(p) => (p > 1 ? `${ROUTES.escrowHold(id)}?auditPage=${p}` : ROUTES.escrowHold(id))}
          />
        </div>
      </div>
    </Container>
  );
}
