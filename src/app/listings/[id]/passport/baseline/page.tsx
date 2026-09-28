import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { BaselineCaptureStep } from "@/components/passport/baseline-capture-step";
import { getListing } from "@/lib/api/listings";

export const metadata = { title: "Product Passport baseline — HobbyRentals" };

export default async function PassportBaselinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing;
  try {
    listing = await getListing(id);
  } catch {
    notFound();
  }

  const publishes = listing.status === "DRAFT";

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Product Passport · {listing.name}</p>
        <h1 className="heading mt-3 text-3xl">Record its condition</h1>
        <p className="body-copy mt-3">
          Photograph the item from all four angles. These photos become the start of its permanent
          condition record and can&apos;t be edited or deleted later.
          {publishes && " Your listing goes live once they're saved."}
        </p>

        <div className="mt-10">
          <BaselineCaptureStep listingId={id} publishes={publishes} />
        </div>
      </div>
    </Container>
  );
}
