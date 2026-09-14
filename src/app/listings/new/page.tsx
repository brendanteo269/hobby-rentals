import { Container } from "@/components/ui";
import { CreateListingForm } from "@/components/listings/create-listing-form";

export const metadata = { title: "List your gear — HobbyRentals" };

export default function NewListingPage() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Your inventory</p>
        <h1 className="display-caps mt-3 text-3xl">List your gear</h1>
        <p className="body-copy mt-3">
          Fields marked with an asterisk are required. Everything here can be edited after it goes
          live.
        </p>

        <div className="mt-10">
          <CreateListingForm />
        </div>
      </div>
    </Container>
  );
}
