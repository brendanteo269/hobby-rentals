import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { getDispute } from "@/lib/disputes";
import { formatDate, formatDateTime, formatMoney, shortId } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { Badge, Container, DescriptionList, Panel } from "@/components/ui";
import { DisputeResolveForm } from "@/components/dispute-resolve-form";
import type { ArbitrationEvidenceBundle, EvidencePhoto } from "@/lib/disputes";

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
  const canResolve = dispute.status === "OPEN" && (Boolean(dispute.bundle_booking_id) || Boolean(dispute.rebutted_at));

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
          <section aria-label="Parties' evidence" className="grid gap-6 xl:grid-cols-2">
            <Panel title="Owner's claim" description={`Claimed ${formatMoney(dispute.claimed_cents)} · reported ${formatDateTime(dispute.created_at)}`}>
              <p className="body-copy whitespace-pre-line">{dispute.description}</p>
              <EvidencePhotos urls={dispute.evidence_photo_urls} label="Owner's evidence photos" />
              <p className="mt-5 text-sm text-ink-soft">
                Owner: <Link href={ROUTES.user(dispute.owner_id)} className="underline underline-offset-4">{dispute.owner_name ?? "No name"}</Link>
              </p>
            </Panel>

            <Panel
              title="Renter's response"
              description={dispute.rebutted_at ? `Disputed ${formatDateTime(dispute.rebutted_at)}` : "No escalation submitted"}
            >
              {dispute.rebutted_at ? (
                <>
                  <p className="body-copy whitespace-pre-line">{dispute.rebuttal}</p>
                  <EvidencePhotos urls={dispute.rebuttal_photo_urls} label="Renter's counter-evidence photos" />
                </>
              ) : (
                <p className="body-copy text-ink-soft">This direct-admin dispute has no renter rebuttal flow.</p>
              )}
              <p className="mt-5 text-sm text-ink-soft">
                Renter: <Link href={ROUTES.user(dispute.renter_id)} className="underline underline-offset-4">{dispute.renter_name ?? "No name"}</Link>
              </p>
            </Panel>
          </section>

          {dispute.evidence_bundle && <ObjectiveEvidence bundle={dispute.evidence_bundle} ownerId={dispute.owner_id} renterId={dispute.renter_id} />}

          <Panel title="Case links">
            <DescriptionList
              items={[
                {
                  term: "Item passport",
                  value: <Link href={ROUTES.listingPassport(dispute.listing_id)} className="underline underline-offset-4">View passport</Link>,
                },
              ]}
            />
          </Panel>

          {canResolve ? (
            <DisputeResolveForm
              disputeId={dispute.id}
              renterId={dispute.renter_id}
              claimedCents={dispute.claimed_cents}
              rental={rental}
            />
          ) : dispute.status === "OPEN" ? (
            <Panel title="Awaiting renter response" description="This single-booking claim is not in arbitration yet.">
              <p className="body-copy">The renter can accept or dispute the claim until their response window ends. Resolution is unavailable to administrators unless they escalate it.</p>
            </Panel>
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

function ObjectiveEvidence({ bundle, ownerId, renterId }: { bundle: ArbitrationEvidenceBundle; ownerId: string; renterId: string }) {
  return (
    <section aria-labelledby="objective-evidence-heading" className="space-y-6">
      <div>
        <p className="eyebrow">Sealed at {bundle.assembled_at ? formatDateTime(bundle.assembled_at) : "escalation"}</p>
        <h2 id="objective-evidence-heading" className="heading mt-2 text-2xl">Objective evidence review</h2>
        <p className="body-copy mt-2">This is the read-only evidence snapshot assembled when the renter escalated the case.</p>
      </div>
      <Panel title="Condition photos" description="Compare the documented handover and return condition before weighing either party’s account.">
        <div className="grid gap-6 xl:grid-cols-2">
          <SnapshotPhotos photos={bundle.pickup_photos} title="Pickup photos" />
          <SnapshotPhotos photos={bundle.return_photos} title="Return photos" />
        </div>
      </Panel>
      <ScanEvidence scan={bundle.condition_scan} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Timeline events={bundle.status_timeline} />
        <ChatHistory messages={bundle.chat_history} ownerId={ownerId} renterId={renterId} />
      </div>
    </section>
  );
}

function SnapshotPhotos({ photos, title }: { photos: EvidencePhoto[]; title: string }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      {photos.length ? (
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {photos.map((photo, index) => photo.photo_url && (
            <li key={`${photo.angle}-${index}`}>
              <a href={photo.photo_url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed evidence URL */}
                <img src={photo.photo_url} alt={`${title}: ${photo.angle ?? "condition"}`} className="aspect-square w-full border border-line object-cover" />
              </a>
              <p className="mt-1 text-xs text-ink-soft">{photo.angle ?? "Condition photo"}{photo.captured_at && ` · ${formatDateTime(photo.captured_at)}`}</p>
              {photo.baseline_photo_url && <a href={photo.baseline_photo_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline underline-offset-4">View the captured baseline reference</a>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-ink-soft">No accepted photos were captured.</p>}
    </div>
  );
}

function ScanEvidence({ scan }: { scan: ArbitrationEvidenceBundle["condition_scan"] }) {
  if (!scan) return <Panel title="AI condition scan"><p className="body-copy text-ink-soft">No scan was available when the case was escalated.</p></Panel>;
  return (
    <Panel title="AI condition scan" description={scan.summary ?? "Recorded condition comparison."}>
      <p className="text-sm text-ink-soft">{scan.verdict ?? scan.status ?? "No verdict"}{scan.anomaly_score != null && ` · anomaly score ${Math.round(scan.anomaly_score * 100)}%`}</p>
      <ul className="mt-5 space-y-6">
        {scan.angles.map((angle, index) => (
          <li key={`${angle.angle}-${index}`} className="border-t border-line pt-5 first:border-t-0 first:pt-0">
            <h3 className="text-sm font-medium">{angle.label ?? angle.angle ?? "Condition comparison"} <span className="font-normal text-ink-soft">· {angle.status ?? "Not recorded"}</span></h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <EvidenceImage url={angle.reference_photo_url} label="Earlier reference" />
              <EvidenceImage url={angle.return_photo_url} label="Return photo" />
              <EvidenceImage url={angle.diff_map_url} label="AI difference map" />
            </div>
            {angle.findings?.length ? <ul className="mt-3 space-y-1 text-sm text-ink-soft">{angle.findings.map((finding, findingIndex) => <li key={findingIndex}>#{finding.number ?? findingIndex + 1} · {[finding.damage_type, finding.severity].filter(Boolean).join(" · ") || "Unclassified"}: {finding.summary}</li>)}</ul> : angle.note && <p className="mt-3 text-sm text-ink-soft">{angle.note}</p>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function EvidenceImage({ url, label }: { url?: string | null; label: string }) {
  return (
    <div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed evidence URL */}
          <img src={url} alt={label} className="aspect-square w-full border border-line object-cover" />
        </a>
      ) : (
        <div className="flex aspect-square items-center justify-center border border-dashed border-line text-xs text-ink-soft">Not available</div>
      )}
      <p className="mt-1 text-xs text-ink-soft">{label}</p>
    </div>
  );
}

function Timeline({ events }: { events: ArbitrationEvidenceBundle["status_timeline"] }) {
  return <Panel title="Booking timeline">{events.length ? <ol className="space-y-3">{events.map((event, index) => <li key={`${event.at}-${index}`} className="border-l-2 border-line pl-3 text-sm"><p className="font-medium">{event.from_status ?? "Created"} → {event.to_status ?? "Updated"}</p><p className="text-ink-soft">{event.actor_role ?? "System"}{event.at && ` · ${formatDateTime(event.at)}`}</p></li>)}</ol> : <p className="body-copy text-ink-soft">No status events were recorded.</p>}</Panel>;
}

function ChatHistory({ messages, ownerId, renterId }: { messages: ArbitrationEvidenceBundle["chat_history"]; ownerId: string; renterId: string }) {
  return (
    <Panel title="Booking chat snapshot" description="Chronological at the time of escalation.">
      {messages.length ? (
        <ol className="space-y-4">
          {messages.map((message, index) => (
            <li key={`${message.sent_at}-${index}`} className="rounded-lg bg-surface-muted p-3 text-sm">
              <p className="whitespace-pre-line">{message.body || "Attachment"}</p>
              <p className="mt-2 text-xs text-ink-soft">{message.sender_id === ownerId ? "Owner" : message.sender_id === renterId ? "Renter" : "Member"} · {message.sent_at ? formatDateTime(message.sent_at) : "Time not recorded"}</p>
              {message.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.attachments.map((attachment, attachmentIndex) => attachment.is_image ? (
                    <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed attachment URL */}
                      <img src={attachment.url} alt={`Chat attachment ${attachmentIndex + 1}`} className="h-20 w-20 border border-line object-cover" />
                    </a>
                  ) : (
                    <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                      Open attachment {attachmentIndex + 1}
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : <p className="body-copy text-ink-soft">No booking messages were captured.</p>}
    </Panel>
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
