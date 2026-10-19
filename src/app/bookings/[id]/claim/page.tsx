import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { ClaimSummary } from "@/components/bookings/claim-summary";
import { ClaimResponseOptions } from "@/components/bookings/claim-response-options";
import { ConditionReport } from "@/components/bookings/condition-report";
import { BackendApiError } from "@/lib/api/client";
import { getDamageClaim, getMyBookings } from "@/lib/api/bookings";
import { claimPendingRenter } from "@/lib/settlement";

export const metadata = { title: "Damage claim — HobbyRentals" };

/**
 * S3-06 Scenario 3: the renter reviews a damage claim on their booking - the
 * owner's explanation, repair cost and evidence, and the AI's comparison of
 * the baseline and return photos - with the option to accept or dispute it
 * while the response window is open.
 */
export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The renter's own bookings only: an owner, or anyone else, gets a 404.
  const booking = (await getMyBookings()).find((candidate) => candidate.id === id);
  if (!booking) notFound();
  let claim;
  try {
    claim = await getDamageClaim(id);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-4xl space-y-10">
        <div>
          <p className="eyebrow">Damage claim · {claim.listing_name ?? booking.listing_name ?? "Your rental"}</p>
          <h1 className="heading mt-3 text-3xl">Review the owner&apos;s claim</h1>
        </div>
        <ClaimSummary claim={claim} viewer="renter" />
        {claimPendingRenter(claim) && <ClaimResponseOptions />}
        {claim.scan ? (
          <ConditionReport scan={claim.scan} viewer="renter" />
        ) : (
          <p className="body-copy">There is no AI condition check for this rental.</p>
        )}
      </div>
    </Container>
  );
}
