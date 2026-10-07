import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { SerialForm } from "@/components/passport/serial-form";
import { getListing } from "@/lib/api/listings";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Identify this item — HobbyRentals" };

export default async function PassportSerialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing;
  try {
    listing = await getListing(id);
  } catch {
    notFound();
  }
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (user?.id !== listing.owner_id) notFound();

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Product Passport · {listing.name}</p>
        <h1 className="heading mt-3 text-3xl">Identify this item</h1>
        <p className="body-copy mt-3">
          Record the item&apos;s serial number, or a photo of its distinguishing marks if it has none. It
          can&apos;t go live without one, and once saved, this can&apos;t be changed.
        </p>
        <div className="mt-10">
          <SerialForm listingId={id} />
        </div>
      </div>
    </Container>
  );
}
