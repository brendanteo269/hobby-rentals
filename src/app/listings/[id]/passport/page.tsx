import { notFound } from "next/navigation";
import { ButtonLink, Container, FormNotice } from "@/components/ui";
import { PassportTimeline } from "@/components/passport/passport-timeline";
import { ConditionUpdateForm } from "@/components/passport/condition-update-form";
import type { SerialStatus } from "@/lib/listings";
import { getListing, getPassport } from "@/lib/api/listings";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Product Passport — HobbyRentals" };

/**
 * The owner's view of a listing's Product Passport. Renters see the same
 * timeline on the listing page instead (S2-07), so anyone else gets a 404
 * here even though the API would show them a live listing's passport.
 */
export default async function PassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing, passport;
  try {
    [listing, passport] = await Promise.all([getListing(id), getPassport(id)]);
  } catch {
    notFound();
  }
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (user?.id !== listing.owner_id) notFound();

  const missingBaseline = passport.missing.includes("baseline");
  const removed = listing.status === "PENDING_REMOVAL" || listing.status === "REMOVED";

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Product Passport</p>
            <h1 className="heading mt-3 text-3xl">{listing.name}</h1>
          </div>
          <ButtonLink href={`/listings/${id}`} variant="outline" className="px-4 py-2 text-xs">
            ← Back to listing
          </ButtonLink>
        </div>

        {listing.status === "DRAFT" && (
          <div className="mt-8">
            <FormNotice message="This listing is a draft and hidden from renters. It goes live once its condition photos and its serial number (or distinguishing marks) are both recorded." />
          </div>
        )}

        <dl className="mt-8 grid gap-4 border border-line bg-white p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="eyebrow">Serial number</dt>
            <dd className="mt-1">{serialSummary(passport.serial_status, passport.serial_number)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Baseline condition</dt>
            <dd className="mt-1">{missingBaseline ? "Not recorded" : "Recorded"}</dd>
          </div>
        </dl>

        {passport.serial_status === "PENDING" && (
          <ButtonLink href={`/listings/${id}/passport/serial`} variant="outline" className="mt-6 px-4 py-2 text-xs">
            Verify serial number
          </ButtonLink>
        )}

        {passport.serial_status === "DUPLICATE" && (
          <div className="mt-6">
            <FormNotice message="This serial number is already on another member's listing of the same brand. Your listing can still go live, but without a verified badge until an admin reviews it. Renters aren't told about the clash." />
          </div>
        )}

        {missingBaseline && (
          <div className="mt-6 space-y-3">
            <FormNotice message="This item has no baseline condition photos yet. Renters can't rely on its condition record until it does." />
            <ButtonLink href={`/listings/${id}/passport/baseline`} className="px-4 py-2 text-xs">
              Add condition photos
            </ButtonLink>
          </div>
        )}

        {!missingBaseline && !removed && (
          <section className="mt-10">
            <h2 className="heading text-lg">Add a condition update</h2>
            <p className="body-copy mt-1">
              Fixed, serviced or changed something since the baseline? Record it here so renters see the item as
              it is now. The baseline stays on record.
            </p>
            <div className="mt-6">
              <ConditionUpdateForm listingId={id} />
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="heading text-lg">History</h2>
          <p className="body-copy mt-1">Every record is permanent. Nothing here can be edited or deleted.</p>
          <div className="mt-6">
            <PassportTimeline entries={passport.entries} />
          </div>
        </section>
      </div>
    </Container>
  );
}

function serialSummary(status: SerialStatus, serial: string | null): string {
  if (status === "VERIFIED") return serial ?? "Verified";
  if (status === "DUPLICATE") return `${serial} (already registered elsewhere)`;
  if (status === "NO_SERIAL") return "No serial: identified by distinguishing marks";
  return "Serial Verification Pending";
}
