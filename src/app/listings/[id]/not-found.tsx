import { ButtonLink, Container, EmptyState } from "@/components/ui";

/**
 * S2-07 Scenario 5. The API answers 404 alike for a listing that never
 * existed and one this viewer can no longer see (archived, removed, a
 * draft), so this can't say which - it just points somewhere useful.
 */
export default function ListingNotFound() {
  return (
    <Container className="py-16">
      <EmptyState
        title="This listing is no longer available"
        body="It may have been archived or removed by its owner, or the link may be wrong."
        action={<ButtonLink href="/browse">Browse available gear</ButtonLink>}
      />
    </Container>
  );
}
