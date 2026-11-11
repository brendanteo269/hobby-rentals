import type { OwnerVerification } from "@/lib/verification";
import type { RenterTrust } from "@/lib/renter-trust";
import type { BookingPause } from "@/lib/away";
import type { ResponseTimeBand } from "@/lib/response-time";

export type ReviewRole = "OWNER" | "RENTER";
export type ReviewEligibility = { booking_id: string | null; bundle_booking_id: string | null; rental_name: string; reviewed_role: ReviewRole; settled_at: string; expires_at: string };
export type PublishedReview = {
  id: string;
  rating: number;
  body: string;
  reviewed_role: ReviewRole;
  rental_name_snapshot: string;
  published_at: string;
  reviewer?: { display_name: string | null; avatar_url?: string | null } | null;
  rental_listing: {
    name: string;
    condition: "NEW" | "GOOD" | "FAIR" | "POOR";
    photo_url: string | null;
  } | null;
};
export type RatingSummary = { average: number | null; count: number };
/**
 * S6-12: "What renters say", made by AI from a listing's reviews in the
 * background. Present only with at least three reviews; review_count is how
 * many it was made from, which can trail the live count until it is remade.
 */
export type ReviewSummary = { summary: string; pros: string[]; cons: string[]; review_count: number; generated_at: string };
export type ReviewCollection = RatingSummary & { reviews: PublishedReview[]; summary?: ReviewSummary | null };

/** The box's label, e.g. "AI summary of 5 reviews". */
export function reviewSummaryLabel(summary: Pick<ReviewSummary, "review_count">): string {
  return `AI summary of ${summary.review_count} ${summary.review_count === 1 ? "review" : "reviews"}`;
}
import type { ListingCard } from "@/lib/listings";
export type PublicMemberProfile = { id: string; display_name: string | null; avatar_url?: string | null; created_at: string; verification?: OwnerVerification; renter_trust?: RenterTrust; /** S5-17: absent without enough history. */ response_time?: ResponseTimeBand | null; owner_summary: RatingSummary; renter_summary: RatingSummary; reviews: PublishedReview[]; listings: ListingCard[]; booking_pause?: BookingPause | null };

import type { Route } from "next";

export function reviewPath(eligibility: Pick<ReviewEligibility, "booking_id" | "bundle_booking_id">): Route {
  const query = eligibility.booking_id ? `booking=${encodeURIComponent(eligibility.booking_id)}` : `bundle=${encodeURIComponent(eligibility.bundle_booking_id!)}`;
  return `/reviews/new?${query}` as Route;
}
