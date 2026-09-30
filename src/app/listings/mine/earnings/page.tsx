import { ButtonLink, EmptyState } from "@/components/ui";
import { OwnerPortal, requireOwner } from "@/components/owner-portal";
import { profilePath } from "@/lib/routes";

export const metadata = { title: "Earnings — HobbyRentals" };

/** A placeholder until rental payouts are settled to owners (Sprint 3), as the S2-01 notes allow. */
export default async function OwnerEarningsPage() {
  await requireOwner();
  return (
    <OwnerPortal active="Earnings" title="Earnings">
      <EmptyState
        title="Earnings are coming soon"
        body="Once a rental is returned and settled, its payout will be listed here. Until then, your credit balance is in your wallet."
        action={<ButtonLink href={profilePath("wallet")} variant="outline">Open wallet</ButtonLink>}
      />
    </OwnerPortal>
  );
}
