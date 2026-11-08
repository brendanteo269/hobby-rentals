import { notFound } from "next/navigation";
import { ButtonLink, Container } from "@/components/ui";
import { GuideEditor } from "@/components/guides/guide-editor";
import { DeleteGuideButton } from "@/components/guides/delete-guide-button";
import { deleteGuide, saveGuide } from "@/app/listings/[id]/guide/actions";
import { getListing } from "@/lib/api/listings";
import { getOwnerGuide } from "@/lib/api/guides";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Quick-start guide — HobbyRentals" };

/**
 * S6-02: where an owner writes the quick-start guide for one listing.
 *
 * Its own page rather than part of the listing form, on purpose: listing
 * edits apply to new bookings only, while guide edits reach every renter with
 * a current booking straight away (Scenario 4) - one form could not say both.
 * 404 for anyone but the owner, matching the API.
 */
export default async function ListingGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [listing, owned, { data: { user } }] = await Promise.all([
    getListing(id).catch(() => null),
    getOwnerGuide(id).catch(() => null),
    (await createClient()).auth.getUser(),
  ]);
  if (!listing || !owned || listing.owner_id !== user?.id || listing.status === "REMOVED") notFound();

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Your inventory · {listing.name}</p>
        <h1 className="heading mt-3 text-3xl">Quick-start guide</h1>
        <p className="body-copy mt-3">
          Renters see this once their booking is confirmed, so they can set up and use your gear without messaging you.
          Edits reach anyone with a current booking straight away.
        </p>
        <ButtonLink href={`/listings/${id}`} variant="outline" className="mt-5 px-4 py-2 text-xs">
          ← Back to listing
        </ButtonLink>

        <div className="mt-10">
          <GuideEditor action={saveGuide.bind(null, id)} guide={owned.guide} />
        </div>

        {owned.guide && (
          <div className="mt-6 flex justify-end">
            <DeleteGuideButton action={deleteGuide.bind(null, id)} blocked={owned.has_current_renters} />
          </div>
        )}
      </div>
    </Container>
  );
}
