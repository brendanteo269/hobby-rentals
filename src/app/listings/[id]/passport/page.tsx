import { notFound } from "next/navigation";
import { ButtonLink, Container, FormNotice } from "@/components/ui";
import { PassportTimeline } from "@/components/passport/passport-timeline";
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

        <dl className="mt-8 grid gap-4 border border-line bg-white p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="eyebrow">Serial number</dt>
            <dd className="mt-1">
              {passport.serial_status === "VERIFIED"
                ? passport.serial_number
                : "Serial Verification Pending"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Baseline condition</dt>
            <dd className="mt-1">{missingBaseline ? "Not recorded" : "Recorded"}</dd>
          </div>
        </dl>

        {missingBaseline && (
          <div className="mt-6 space-y-3">
            <FormNotice message="This item has no baseline condition photos yet. Renters can't rely on its condition record until it does." />
            <ButtonLink href={`/listings/${id}/passport/baseline`} className="px-4 py-2 text-xs">
              Add condition photos
            </ButtonLink>
          </div>
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
