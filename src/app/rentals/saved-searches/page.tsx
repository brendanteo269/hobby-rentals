import { BookmarkPlus } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";
import { RenterPortal, requireRenter } from "@/components/renter-portal";
import { SavedSearchList } from "@/components/saved-searches/saved-search-list";
import { getSavedSearches } from "@/lib/api/saved-searches";

export const metadata = { title: "Saved searches — HobbyRentals" };
export default async function SavedSearchesPage() {
  await requireRenter();
  const searches = await getSavedSearches();
  return <RenterPortal active="Saved searches" title="My rentals">{searches.length ? <><p className="body-copy mb-6">We’ll notify you once when a listing first matches each saved search.</p><SavedSearchList searches={searches} /></> : <EmptyState icon={BookmarkPlus} title="No saved searches yet" body="Save a marketplace search to hear about newly matching gear." action={<ButtonLink href="/browse">Browse the marketplace</ButtonLink>} />}</RenterPortal>;
}
