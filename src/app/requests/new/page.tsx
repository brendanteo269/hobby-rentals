import { Container, ButtonLink } from "@/components/ui";
import { PostRequestForm } from "@/components/requests/post-request-form";

export const metadata = { title: "Post a gear request" };

/**
 * S5-13 Scenario 1: what the renter fills in when nothing in the marketplace
 * fits. Short on purpose - every extra field is a reason not to finish it,
 * and the one that matters is the name, which is what owners are matched on.
 */
export default function NewGearRequestPage() {
  return (
    <Container className="py-16">
      <ButtonLink href="/requests" variant="outline" className="px-4 py-2 text-xs">
        &larr; Back to requests
      </ButtonLink>
      <h1 className="heading mt-6 text-3xl">Post a gear request</h1>
      <p className="body-copy mt-2 max-w-xl">
        Owners with something similar are told as soon as you post &mdash; including owners whose
        listing is archived, who would not show up in a search at all.
      </p>
      <div className="mt-8 max-w-xl">
        <PostRequestForm />
      </div>
    </Container>
  );
}
