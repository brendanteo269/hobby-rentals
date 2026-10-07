import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { AUDIT_PAGE_SIZE, getBookingAuditTrail, recordBookingViewed } from "@/lib/audit";
import { ROUTES } from "@/lib/routes";
import { formatDate, formatDateTime, formatMoney, shortId } from "@/lib/format";
import {
  bookingStatusLabel,
  bookingStatusTone,
  getBookingById,
  paymentStatusLabel,
  paymentStatusTone,
} from "@/lib/bookings";
import { Badge, Container, DescriptionList, EmptyState, Panel } from "@/components/ui";
import { AuditTrail } from "@/components/audit-trail";

export const metadata = { title: "Booking — HobbyRentals Admin" };

const ACTOR_ROLE_LABELS: Record<string, string> = {
  RENTER: "Renter",
  OWNER: "Owner",
  SYSTEM: "System",
};

const ESCROW_TYPE_LABELS: Record<string, string> = {
  ESCROW_HOLD: "Hold placed",
  ESCROW_RELEASE: "Released",
};

const ESCROW_COMPONENT_LABELS: Record<string, string> = {
  RENTAL: "Rental fee",
  DEPOSIT: "Security deposit",
  PROTECTION: "Damage protection",
};

/**
 * S2-27: read-only booking detail - status timeline, renter/owner
 * references, rental period and amount, security deposit, escrow hold/
 * release records, damage protection ("insurance") terms, and admin
 * activity. Nothing on this page writes to a booking; there is no action
 * here that could change its outcome.
 */
export default async function BookingDetailPage({
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

  const booking = await getBookingById(id);
  // Covers both a malformed id and one that does not exist - the two are not
  // distinguished, so this page cannot be used to probe which ids are real.
  if (!booking) notFound();

  // Financial and party detail is sensitive, so looking is itself recorded -
  // same pattern as the listing detail page's own audit entry.
  await recordBookingViewed(id, booking.renter_id);

  const { entries: auditEntries, total: auditTotal } = await getBookingAuditTrail(id, booking.renter_id, auditPage);
  const auditLastPage = Math.max(1, Math.ceil(auditTotal / AUDIT_PAGE_SIZE));

  return (
    <Container className="py-12">
      <Link href={ROUTES.bookings} className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
        ← Bookings
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Booking</p>
          <h1 className="display-caps mt-3 text-3xl">{booking.listing_name}</h1>
          <p className="body-copy mt-2">{shortId(booking.id)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={bookingStatusTone(booking.status)}>{bookingStatusLabel(booking.status)}</Badge>
          <Badge tone={paymentStatusTone(booking.payment_status)}>{paymentStatusLabel(booking.payment_status)}</Badge>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Participants">
            <DescriptionList
              items={[
                {
                  term: "Listing",
                  value: (
                    <Link href={ROUTES.listing(booking.listing_id)} className="underline underline-offset-4">
                      {booking.listing_name}
                    </Link>
                  ),
                },
                {
                  term: "Renter",
                  value: (
                    <Link href={ROUTES.user(booking.renter_id)} className="underline underline-offset-4">
                      {booking.renter_display_name ?? "No name"}
                    </Link>
                  ),
                },
                { term: "Renter email", value: booking.renter_email ?? "—" },
                {
                  term: "Owner",
                  value: (
                    <Link href={ROUTES.user(booking.owner_id)} className="underline underline-offset-4">
                      {booking.owner_display_name ?? "No name"}
                    </Link>
                  ),
                },
                { term: "Owner email", value: booking.owner_email ?? "—" },
              ]}
            />
          </Panel>

          <Panel title="Rental period & pricing">
            <DescriptionList
              items={[
                { term: "Rental period", value: `${formatDate(booking.start_date)} – ${formatDate(booking.end_date)}` },
                { term: "Rental days", value: booking.rental_days ?? "—" },
                {
                  term: "Rate",
                  value:
                    booking.price_per_day_cents !== null
                      ? `${formatMoney(booking.price_per_day_cents)} / day`
                      : "—",
                },
                {
                  term: "Rental subtotal",
                  value: booking.rental_subtotal_cents !== null ? formatMoney(booking.rental_subtotal_cents) : "—",
                },
                {
                  term: "Platform fee",
                  value:
                    booking.platform_fee_cents !== null
                      ? `${formatMoney(booking.platform_fee_cents)}${booking.platform_fee_bps !== null ? ` (${(booking.platform_fee_bps / 100).toFixed(2)}%)` : ""}`
                      : "—",
                },
                {
                  term: "Security deposit",
                  value: booking.deposit_cents !== null ? formatMoney(booking.deposit_cents) : "—",
                },
                {
                  term: "Total amount",
                  value: booking.total_amount_cents !== null ? formatMoney(booking.total_amount_cents) : "—",
                },
                ...(booking.status === "DECLINED"
                  ? [
                      { term: "Decline reason", value: booking.decline_reason ?? "—" },
                      ...(booking.decline_note ? [{ term: "Decline note", value: booking.decline_note }] : []),
                    ]
                  : []),
                ...(booking.respond_by
                  ? [{ term: "Owner's response deadline", value: formatDateTime(booking.respond_by) }]
                  : []),
              ]}
            />
          </Panel>

          <Panel
            title="Damage protection"
            description="The story's 'insurance status' - this platform has no insurer; protection is self-funded from the fees renters pay for it."
          >
            {booking.damage_protection_selected ? (
              <DescriptionList
                items={[
                  { term: "Selected", value: <Badge tone="positive">Yes</Badge> },
                  {
                    term: "Protection fee",
                    value:
                      booking.damage_protection_fee_cents !== null
                        ? formatMoney(booking.damage_protection_fee_cents)
                        : "—",
                  },
                  {
                    term: "Coverage cap",
                    value:
                      booking.damage_coverage_cap_cents !== null
                        ? formatMoney(booking.damage_coverage_cap_cents)
                        : "—",
                  },
                  {
                    term: "Renter's excess",
                    value: booking.damage_excess_cents !== null ? formatMoney(booking.damage_excess_cents) : "—",
                  },
                ]}
              />
            ) : (
              <p className="body-copy">The renter did not select damage protection for this booking.</p>
            )}
          </Panel>

          <Panel
            title="Claim status"
            description="No claims have been filed against this booking."
          >
            <p className="body-copy">
              This platform has no damage-claim workflow yet, so there is nothing to report beyond that absence.
            </p>
          </Panel>

          <Panel title="Escrow ledger" description="Wallet holds and releases tied to this booking.">
            {booking.escrowEntries.length === 0 ? (
              <div className="-mx-6 -my-5">
                <EmptyState title="No escrow activity" body="No hold has been placed for this booking." />
              </div>
            ) : (
              <ul className="space-y-3">
                {booking.escrowEntries.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-line pl-4">
                    <div>
                      <p className="text-sm font-medium">
                        {ESCROW_TYPE_LABELS[entry.type] ?? entry.type}
                        {entry.escrow_component && ` · ${ESCROW_COMPONENT_LABELS[entry.escrow_component] ?? entry.escrow_component}`}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">{formatDateTime(entry.created_at)} · {entry.status}</p>
                    </div>
                    <p className="text-sm font-medium">{formatMoney(Math.abs(entry.amount_cents))}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Status timeline">
            {booking.statusEvents.length === 0 ? (
              <div className="-mx-6 -my-5">
                <EmptyState title="No status history" body="No status changes have been recorded for this booking." />
              </div>
            ) : (
              <ol className="space-y-3">
                {booking.statusEvents.map((event) => (
                  <li key={event.id} className="border-l-2 border-line pl-4">
                    <p className="text-sm font-medium">
                      {event.from_status ? `${bookingStatusLabel(event.from_status)} → ` : ""}
                      {bookingStatusLabel(event.to_status)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {ACTOR_ROLE_LABELS[event.actor_role] ?? event.actor_role} · {formatDateTime(event.created_at)}
                    </p>
                    {event.reason && <p className="mt-1 text-xs text-ink-soft">{event.reason}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Identifiers">
            <DescriptionList
              items={[
                { term: "Booking ID", value: <code className="text-xs">{booking.id}</code> },
                { term: "Listing ID", value: <code className="text-xs">{booking.listing_id}</code> },
                { term: "Renter ID", value: <code className="text-xs">{booking.renter_id}</code> },
                { term: "Owner ID", value: <code className="text-xs">{booking.owner_id}</code> },
                ...(booking.bundle_booking_id
                  ? [{ term: "Bundle booking ID", value: <code className="text-xs">{booking.bundle_booking_id}</code> }]
                  : []),
                { term: "Created", value: formatDateTime(booking.created_at) },
                { term: "Last updated", value: formatDateTime(booking.updated_at) },
              ]}
            />
          </Panel>

          <AuditTrail
            entries={auditEntries}
            page={auditPage}
            lastPage={auditLastPage}
            hrefForPage={(p) => (p > 1 ? `${ROUTES.booking(id)}?auditPage=${p}` : ROUTES.booking(id))}
          />
        </div>
      </div>
    </Container>
  );
}
