export type ReviewRole = "OWNER" | "RENTER";
export type ReviewEligibility = { booking_id: string | null; bundle_booking_id: string | null; rental_name: string; reviewed_role: ReviewRole; settled_at: string; expires_at: string };
export type PublishedReview = { id: string; rating: number; body: string; reviewed_role: ReviewRole; rental_name_snapshot: string; published_at: string; reviewer?: { display_name: string | null } | null };
export type RatingSummary = { average: number | null; count: number };
import type { ListingCard } from "@/lib/listings";
export type PublicMemberProfile = { id: string; display_name: string | null; created_at: string; owner_summary: RatingSummary; renter_summary: RatingSummary; reviews: PublishedReview[]; listings: ListingCard[] };

import type { Route } from "next";

export function reviewPath(eligibility: Pick<ReviewEligibility, "booking_id" | "bundle_booking_id">): Route {
  const query = eligibility.booking_id ? `booking=${encodeURIComponent(eligibility.booking_id)}` : `bundle=${encodeURIComponent(eligibility.bundle_booking_id!)}`;
  return `/reviews/new?${query}` as Route;
}
