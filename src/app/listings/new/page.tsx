import { Container } from "@/components/ui";
import { ListingForm } from "@/components/listings/listing-form";
import { submitListing } from "@/app/listings/actions";
import { getListingFormContext } from "@/app/listings/form-context";

export const metadata = { title: "Create a listing — HobbyRentals" };

export default async function NewListingPage() {
  const context = await getListingFormContext();

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Your inventory</p>
        <h1 className="heading mt-3 text-3xl">Create a listing</h1>
        <p className="body-copy mt-3">
          Fields marked with an asterisk are required. Everything here can be edited after it goes
          live.
        </p>

        <div className="mt-10">
          <ListingForm action={submitListing} {...context} />
        </div>
      </div>
    </Container>
  );
}
