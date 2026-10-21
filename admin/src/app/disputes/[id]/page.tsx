import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { getDispute } from "@/lib/disputes";
import { formatDate, formatDateTime, formatMoney, shortId } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { Badge, Container, DescriptionList, Panel } from "@/components/ui";
import { DisputeResolveForm } from "@/components/dispute-resolve-form";

export const metadata = { title: "Dispute — HobbyRentals Admin" };

/**
 * S3-10: one damage dispute - what the owner reported, the rental's money and
 * protection terms that bound a deduction, and either the form to decide it
 * or the decision and the settlement it produced.
 */
export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePortalSession();
  const { id } = await params;
  const dispute = await getDispute(id);
  if (!dispute) notFound();

  const { rental, settlement } = dispute;

  return (
    <Container className="py-12">
      <Link href={ROUTES.disputes} className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
        ← Disputes
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Damage dispute</p>
          <h1 className="display-caps mt-3 text-3xl">{dispute.listing_name ?? "A listing"}</h1>
          <p className="body-copy mt-2">{shortId(dispute.id)}</p>
        </div>
        <Badge tone={dispute.status === "OPEN" ? "critical" : "positive"}>{dispute.status === "OPEN" ? "Open" : "Resolved"}</Badge>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="What the owner reported">
            <p className="body-copy whitespace-pre-line">{dispute.description}</p>
            <EvidencePhotos urls={dispute.evidence_photo_urls} label="Owner's evidence photos" />
            <div className="mt-5">
              <DescriptionList
                items={[
                  { term: "Claimed", value: formatMoney(dispute.claimed_cents) },
                  { term: "Reported", value: formatDateTime(dispute.created_at) },
                  {
                    term: "Owner",
                    value: (
                      <Link href={ROUTES.user(dispute.owner_id)} className="underline underline-offset-4">
                        {dispute.owner_name ?? "No name"}
                      </Link>
                    ),
                  },
                  {
                    term: "Renter",
                    value: (
                      <Link href={ROUTES.user(dispute.renter_id)} className="underline underline-offset-4">
                        {dispute.renter_name ?? "No name"}
                      </Link>
                    ),
                  },
                  {
                    term: "Item passport",
                    value: (
                      <Link href={ROUTES.listingPassport(dispute.listing_id)} className="underline underline-offset-4">
                        View passport
                      </Link>
                    ),
                  },
                ]}
              />
            </div>
          </Panel>

          {/* S3-08. Only once the renter has answered: before that there is
              nothing to show, and an empty panel would read as the renter
              having said nothing rather than not yet been asked. */}
          {dispute.rebutted_at && (
            <Panel title="What the renter said">
              <p className="body-copy whitespace-pre-line">{dispute.rebuttal}</p>
              <EvidencePhotos urls={dispute.rebuttal_photo_urls} label="Renter's counter-evidence photos" />
              <div className="mt-5">
                <DescriptionList
                  items={[
                    { term: "Disputed", value: formatDateTime(dispute.rebutted_at) },
                  ]}
                />
              </div>
            </Panel>
          )}

          {dispute.status === "OPEN" ? (
            <DisputeResolveForm
              disputeId={dispute.id}
              renterId={dispute.renter_id}
              claimedCents={dispute.claimed_cents}
              rental={rental}
            />
          ) : (
            <Panel title="Decision">
              <DescriptionList
                items={[
                  { term: "Liable", value: dispute.liable_party === "RENTER" ? "Renter" : "Not the renter" },
                  { term: "Damage value", value: formatMoney(dispute.damage_cents ?? 0) },
                  { term: "Resolved", value: dispute.resolved_at ? formatDateTime(dispute.resolved_at) : "—" },
                  { term: "Note", value: <span className="whitespace-pre-line">{dispute.resolution_note ?? "—"}</span> },
                ]}
              />
            </Panel>
          )}

          {settlement && (
            <Panel title="Settlement" description={`Settled ${formatDateTime(settlement.settled_at)}.`}>
              <DescriptionList
                items={[
                  { term: "Rental subtotal", value: formatMoney(settlement.rental_subtotal_cents) },
                  {
                    term: `Commission (${settlement.commission_bps / 100}%)`,
                    value: formatMoney(settlement.commission_cents),
                  },
                  { term: "Deposit held", value: formatMoney(settlement.deposit_held_cents) },
                  { term: "Deducted for damage", value: formatMoney(settlement.damage_deduction_cents) },
                  { term: "Paid by damage protection", value: formatMoney(settlement.protection_payout_cents) },
                  { term: "Returned to renter", value: formatMoney(settlement.deposit_refund_cents) },
                  { term: "Paid to owner", value: formatMoney(settlement.owner_total_payout_cents) },
                ]}
              />
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          {rental && (
            <Panel title="Rental">
              <DescriptionList
                items={[
                  {
                    term: dispute.bundle_booking_id ? "Bundle booking" : "Booking",
                    value: dispute.booking_id ? (
                      <Link href={ROUTES.booking(dispute.booking_id)} className="underline underline-offset-4">
                        {shortId(dispute.booking_id)}
                      </Link>
                    ) : (
                      shortId(rental.id)
                    ),
                  },
                  { term: "Dates", value: `${formatDate(rental.start_date)} – ${formatDate(rental.end_date)}` },
                  { term: "Returned", value: rental.returned_at ? formatDateTime(rental.returned_at) : "—" },
                  { term: "Security deposit", value: formatMoney(rental.deposit_cents ?? 0) },
                  ...(rental.overdue_fee_charged_cents > 0
                    ? [{ term: "Overdue fee", value: formatMoney(rental.overdue_fee_charged_cents) }]
                    : []),
                  {
                    term: "Damage protection",
                    value: rental.damage_protection_selected
                      ? `Cap ${formatMoney(rental.damage_coverage_cap_cents ?? 0)}, excess ${formatMoney(rental.damage_excess_cents ?? 0)}`
                      : "Not selected",
                  },
                ]}
              />
            </Panel>
          )}
        </div>
      </div>
    </Container>
  );
}

/**
 * Evidence photos for one side of a dispute.
 *
 * Plain <img>, not next/image: these are short-lived presigned S3 URLs, so
 * the optimiser would cache a link that has already expired. Each opens full
 * size in a new tab - an arbitrator deciding on damage needs to look closely.
 */
function EvidencePhotos({ urls, label }: { urls?: string[]; label: string }) {
  if (!urls?.length) return null;
  return (
    <div className="mt-5">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {urls.map((url, index) => (
          <li key={url}>
            <a href={url} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element -- S3 URL, possibly short-lived presigned */}
              <img
                src={url}
                alt={`${label} photo ${index + 1}`}
                className="aspect-square w-full border border-line object-cover"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
