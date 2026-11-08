import "server-only";
import { backendRequest } from "@/lib/api/client";
import type { GuideIndexEntry, OwnerGuideResponse, RenterGuide } from "@/lib/guides";

const listingGuideApiPath = (listingId: string) => `/listings/${encodeURIComponent(listingId)}/guide`;

/** The owner's own guide for editing. 404s for anyone else's listing. */
export const getOwnerGuide = (listingId: string) => backendRequest<OwnerGuideResponse>(listingGuideApiPath(listingId));

/** Replaces the whole guide. A 422 carries field_errors keyed "safety_tips", "steps.2.text" and so on. */
export const saveOwnerGuide = (
  listingId: string,
  guide: { safety_tips: string | null; return_notes: string | null; steps: { text: string; photo_key: string | null }[] },
) => backendRequest<OwnerGuideResponse>(listingGuideApiPath(listingId), { method: "PUT", body: JSON.stringify(guide) });

/** 409 while a renter's booking is CONFIRMED or ACTIVE. */
export const deleteOwnerGuide = (listingId: string) =>
  backendRequest<void>(listingGuideApiPath(listingId), { method: "DELETE" });

/** The guide on the renter's own CONFIRMED or ACTIVE booking; 404 otherwise. */
export const getRenterGuide = (bookingId: string) =>
  backendRequest<RenterGuide>(`/bookings/${encodeURIComponent(bookingId)}/guide`);

/** Which of the renter's current bookings have a guide, bundle and kit items included. */
export const getMyGuideIndex = () => backendRequest<GuideIndexEntry[]>("/bookings/mine/guides");
