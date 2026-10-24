import { BookmarkPlus } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";
import { RenterPortal, requireRenter } from "@/components/renter-portal";
import { SavedSearchList } from "@/components/saved-searches/saved-search-list";
import { getSavedSearches } from "@/lib/api/saved-searches";

export const metadata = { title: "Saved searches — HobbyRentals" };
export default async function SavedSearchesPage() {
  await requireRenter();
  const searches = await getSavedSearches();
  return <RenterPortal active="Saved searches" title="My rentals">{searches.length ? <><p className="body-copy mb-6">We’ll let you know when a new listing matches a saved search, or when one becomes available at your chosen price.</p><SavedSearchList searches={searches} /></> : <EmptyState icon={BookmarkPlus} title="No saved searches yet" body="Save a marketplace search to hear about newly matching gear." action={<ButtonLink href="/browse">Browse the marketplace</ButtonLink>} />}</RenterPortal>;
}
