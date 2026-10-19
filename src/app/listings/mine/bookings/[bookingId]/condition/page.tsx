import { notFound } from "next/navigation";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { ConditionReport } from "@/components/bookings/condition-report";
import { ReportDamageButton } from "@/components/bookings/report-damage-button";
import { RefreshWhile } from "@/components/refresh-while";
import { BackendApiError } from "@/lib/api/client";
import { getOwnerBookings } from "@/lib/api/bookings";
import { getConditionScan } from "@/lib/api/returns";
import { canReportDamage } from "@/lib/settlement";

export const metadata = { title: "Condition report — HobbyRentals" };

/** S3-05: the AI's check of a returned booking, for its owner to decide whether to claim. */
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

  // Offered whatever the verdict: the AI can miss damage the owner finds.
  const windowEndsAt = booking.settlement_state?.claim_window_ends_at;
  return (
    <OwnerPortal active="Bookings" title={`Condition report · ${booking.listing_name ?? "Your item"}`}>
      <RefreshWhile active={scan.status === "PROCESSING"} />
      <ConditionReport
        scan={scan}
        action={
          canReportDamage(booking.settlement_state) && windowEndsAt ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-line px-4 py-3">
              <p className="body-copy">Found damage when you checked the item? Report it before the claim window closes.</p>
              <ReportDamageButton kind="booking" id={booking.id} windowEndsAt={windowEndsAt} />
            </div>
          ) : undefined
        }
      />
    </OwnerPortal>
  );
}
