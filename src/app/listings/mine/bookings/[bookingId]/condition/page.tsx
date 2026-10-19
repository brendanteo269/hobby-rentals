import { notFound } from "next/navigation";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { ConditionReport } from "@/components/bookings/condition-report";
import { ClaimForm } from "@/components/bookings/claim-form";
import { ClaimSummary } from "@/components/bookings/claim-summary";
import { RefreshWhile } from "@/components/refresh-while";
import { BackendApiError } from "@/lib/api/client";
import { getDamageClaim, getOwnerBookings } from "@/lib/api/bookings";
import { getConditionScan } from "@/lib/api/returns";
import { canReportDamage, secondsUntil } from "@/lib/settlement";

export const metadata = { title: "Condition report — HobbyRentals" };

/**
 * S3-05: the AI's check of a returned booking, for its owner - and S3-06:
 * where they make a damage claim from it, or see the claim they made.
 */
export default async function ConditionReportPage({ params }: { params: Promise<{ bookingId: string }> }) {
  await requireOwner();
  const { bookingId } = await params;
  // The owner's own bookings only: anyone else, or no scan yet, is a 404.
  const booking = (await getOwnerBookings()).find((candidate) => candidate.id === bookingId);
  if (!booking) notFound();
  let scan;
  try {
    scan = await getConditionScan(bookingId);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) notFound();
    throw error;
  }

  const state = booking.settlement_state;
  const windowEndsAt = state?.claim_window_ends_at;
  let action;
  if (state?.dispute) {
    action = <ClaimSummary claim={await getDamageClaim(bookingId)} viewer="owner" />;
  } else if (canReportDamage(state) && windowEndsAt) {
    // Offered whatever the verdict: the AI can miss damage the owner finds.
    action = (
      <ClaimForm
        bookingId={booking.id}
        windowEndsAt={windowEndsAt}
        windowSecondsLeft={secondsUntil(windowEndsAt)}
        depositCents={booking.deposit_cents ?? null}
      />
    );
  } else if (booking.status === "ACTIVE") {
    action = (
      <p className="body-copy border border-line px-4 py-3">
        You can make a damage claim once you and the renter have both confirmed the return.
      </p>
    );
  }

  return (
    <OwnerPortal active="Bookings" title={`Condition report · ${booking.listing_name ?? "Your item"}`}>
      <RefreshWhile active={scan.status === "PROCESSING"} />
      <ConditionReport scan={scan} action={action} />
    </OwnerPortal>
  );
}
