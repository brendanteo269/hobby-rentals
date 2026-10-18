import "server-only";
import { backendRequest } from "@/lib/api/client";
import type { PublicMemberProfile, PublishedReview, ReviewEligibility } from "@/lib/reviews";

export const getReviewEligibility = () => backendRequest<ReviewEligibility[]>("/reviews/eligible");
export const getListingReviews = (listingId: string) => backendRequest<PublishedReview[]>(`/reviews/listings/${encodeURIComponent(listingId)}`);
export const getPublicMember = (memberId: string) => backendRequest<PublicMemberProfile>(`/members/${encodeURIComponent(memberId)}`);
export const submitReview = (body: { booking_id?: string; bundle_booking_id?: string; rating: number; body: string }) => backendRequest("/reviews", { method: "POST", body: JSON.stringify(body) });
