import { notFound } from "next/navigation";
import { RenterPortal, requireRenter } from "@/components/renter-portal";
import { KitDetail } from "@/components/bundles/kit-detail";
import { getKit, KitApiError } from "@/lib/api/booking-groups";

export const metadata = { title: "Bundle request — HobbyRentals" };

/** S5-09 Scenario 4: one place to follow a cross-owner bundle, every owner's item and its status. */
export default async function KitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRenter();
  const { id } = await params;
  const kit = await getKit(id).catch((error) => {
    if (error instanceof KitApiError && error.status === 404) notFound();
    throw error;
  });
  return (
    <RenterPortal active="Bookings" title="Bundle request">
      <KitDetail kit={kit} />
    </RenterPortal>
  );
}
