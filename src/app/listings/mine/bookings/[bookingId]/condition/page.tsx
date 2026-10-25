import { cache } from "react";
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

/**
 * The owner's booking and its AI scan (null when the AI did not check the
 * return), shared by the title and the page so they are fetched once. The
 * owner's own bookings only: anyone else is a 404.
 */
const loadBooking = cache(async (bookingId: string) => {
  const booking = (await getOwnerBookings()).find((candidate) => candidate.id === bookingId);
  if (!booking) notFound();
  try {
    return { booking, scan: await getConditionScan(bookingId) };
  } catch (error) {
    if (!(error instanceof BackendApiError && error.status === 404)) throw error;
    return { booking, scan: null };
  }
});

/** Named like the page's heading: a return the AI did not check is only its claim. */
export async function generateMetadata({ params }: { params: Promise<{ bookingId: string }> }) {
  const { scan } = await loadBooking((await params).bookingId);
  return { title: `${scan ? "Condition report" : "Damage claim"} — HobbyRentals` };
}

/**
 * S3-05: the AI's check of a returned booking, for its owner - and S3-06:
 * where they make a damage claim, or follow the claim they made. A return the
 * AI did not check still has its claim here, so there is one place to claim
 * from and one to see the renter's answer.
 */
export default async function ConditionReportPage({ params }: { params: Promise<{ bookingId: string }> }) {
  await requireOwner();
  const { bookingId } = await params;
  const { booking, scan } = await loadBooking(bookingId);

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
        hasScan={scan !== null}
      />
    );
  } else if (booking.status === "ACTIVE") {
    action = (
      <p className="body-copy rounded-xl border border-line px-4 py-3">
        You can make a damage claim once you and the renter have both confirmed the return.
      </p>
    );
  }
  // Without a scan the page is only its claim; with neither there is nothing to show.
  if (!scan && !action) notFound();

  const name = booking.listing_name ?? "Your item";
  return (
    <OwnerPortal active="Bookings" title={scan ? `Condition report · ${name}` : `Damage claim · ${name}`}>
      {scan ? (
        <>
          <RefreshWhile active={scan.status === "PROCESSING"} />
          <ConditionReport scan={scan} action={action} />
        </>
      ) : (
        <div className="space-y-6">
          <p className="body-copy">The AI did not check this return, so your claim rests on your description and photos.</p>
          {action}
        </div>
      )}
    </OwnerPortal>
  );
}
