import { ButtonLink, Container } from "@/components/ui";

/**
 * S5-01 Scenario 6: an archived, deactivated or stolen-flagged listing (or a
 * link that never pointed anywhere). notFound() sends HTTP 404 and adds
 * noindex, so search engines drop the page.
 */
export default function GearNotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="eyebrow">Not available</p>
      <h1 className="heading mt-3 text-3xl">This item is no longer available</h1>
      <p className="body-copy mx-auto mt-3 max-w-md">
        The owner may have taken it down, or it is no longer offered for rent. There is plenty more to borrow.
      </p>
      <ButtonLink href="/browse" className="mt-8">Browse the marketplace</ButtonLink>
    </Container>
  );
}
