import { Container } from "@/components/ui";
import { requireOwner } from "@/components/owner-portal";
import { BundleForm } from "@/components/bundles/bundle-form";
import { createMyBundle } from "@/app/listings/mine/bundles/actions";
import { getBundleFormContext } from "@/app/listings/mine/bundles/form-context";

export const metadata = { title: "Create a bundle — HobbyRentals" };

/** S2-20 Scenario 1: name a set of published listings and give it a package rate. */
export default async function NewBundlePage() {
  await requireOwner();
  const context = await getBundleFormContext();

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Your inventory</p>
        <h1 className="heading mt-3 text-3xl">Create a bundle</h1>
        <p className="body-copy mt-3">
          Fields marked with an asterisk are required. Everything here can be edited after it goes
          live. A bundle groups listings you have already published, so it needs no photos or
          serial number of its own — each item keeps its own.
        </p>

        <div className="mt-10">
          <BundleForm action={createMyBundle} {...context} />
        </div>
      </div>
    </Container>
  );
}
