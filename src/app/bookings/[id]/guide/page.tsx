import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, ButtonLink, Container } from "@/components/ui";
import { GuideView } from "@/components/guides/guide-view";
import { PrintGuideButton } from "@/components/guides/print-guide-button";
import { MessageButton } from "@/components/messages/message-button";
import { BackendApiError } from "@/lib/api/client";
import { getRenterGuide } from "@/lib/api/guides";
import { formatDate, formatDateRange } from "@/lib/format";
import { updatedSinceBooking } from "@/lib/guides";
import { RENTER_BOOKINGS_PATH } from "@/lib/routes";

/** Read once per request: the title and the page both need it. */
const loadGuide = cache(async (bookingId: string) => {
  try {
    return await getRenterGuide(bookingId);
  } catch (caught) {
    if (caught instanceof BackendApiError && caught.status === 404) notFound();
    throw caught;
  }
});

/** The title is also the file name a browser suggests when the guide is saved as a PDF. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const guide = await loadGuide((await params).id);
  return { title: `${guide.listing_name ?? "Your rental"} — Quick-start guide` };
}

/**
 * S6-02 Scenario 2: the owner's quick-start guide for the renter's CONFIRMED
 * or ACTIVE booking - a single item, a bundle component or a kit item alike.
 * Any other booking, status or a listing without a guide is a 404, as the API
 * answers. Scenario 4: always the latest version, saying when it changed.
 */
export default async function BookingGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guide = await loadGuide(id);
  const changed = updatedSinceBooking(guide, guide.booked_at);

  return (
    <Container className="py-16 print:py-0">
      <div className="mx-auto max-w-2xl">
        <ButtonLink href={RENTER_BOOKINGS_PATH} variant="outline" className="px-4 py-2 text-xs print:hidden">
          ← Back to bookings
        </ButtonLink>
        <p className="eyebrow mt-8 print:mt-0">
          Your rental · {guide.listing_name ?? "Your rental"} · {formatDateRange(guide.start_date, guide.end_date)}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="heading text-3xl">Quick-start guide</h1>
          <div className="flex flex-wrap gap-2 print:hidden">
            <PrintGuideButton />
            {/* The listing's thread rather than the booking's: a bundle component has no booking thread of its own. */}
            <MessageButton target={{ kind: "listing", listingId: guide.listing_id }} label="Message owner" className="px-4 py-2 text-xs" />
          </div>
        </div>
        <div className="mt-3">
          {changed ? (
            <Badge variant="info">Updated {formatDate(guide.updated_at)} — changed since you booked</Badge>
          ) : (
            <p className="text-sm text-ink-soft">Last updated {formatDate(guide.updated_at)}</p>
          )}
        </div>

        <div className="mt-10">
          <GuideView
            guide={{
              safetyTips: guide.safety_tips,
              returnNotes: guide.return_notes,
              steps: guide.steps.map((step) => ({ text: step.text, photoUrl: step.photo_url })),
            }}
          />
        </div>
      </div>
    </Container>
  );
}
