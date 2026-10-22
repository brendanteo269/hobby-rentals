import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { ListingCard } from "@/components/browse/listing-card";
import { PublishedReviewCard } from "@/components/reviews/published-review-card";
import { getPublicMember } from "@/lib/api/reviews";
import { VerifiedOwnerBadge } from "@/components/listings/verified-owner-badge";
import { hasAnsweredRequests, responseRatePercent } from "@/lib/verification";

function Rating({ label, summary }: { label: string; summary: { average: number | null; count: number } }) {
  return <div className="card p-4"><p className="text-xs text-ink-soft">{label}</p><p className="heading mt-1 text-xl">{summary.average === null ? "No ratings yet" : `${summary.average.toFixed(1)} / 5`}</p><p className="mt-1 text-xs text-ink-soft">{summary.count} {summary.count === 1 ? "review" : "reviews"}</p></div>;
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getPublicMember(id).catch(() => null);
  if (!member) notFound();
  return <Container className="py-16"><p className="eyebrow">Member since {new Date(member.created_at).toLocaleDateString("en-SG", { month: "long", year: "numeric" })}</p><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="heading text-3xl">{member.display_name ?? "Member"}</h1><VerifiedOwnerBadge verified={member.verification?.verified} /></div>
    {member.verification && <p className="body-copy mt-2 text-sm">{member.verification.completed_rentals} completed {member.verification.completed_rentals === 1 ? "rental" : "rentals"} · {hasAnsweredRequests(member.verification) ? `answered ${responseRatePercent(member.verification)}% of booking requests` : "no booking requests yet"}</p>}
    <div className="mt-8 grid gap-3 sm:grid-cols-2"><Rating label="Owner rating" summary={member.owner_summary} /><Rating label="Renter rating" summary={member.renter_summary} /></div>
    <section className="mt-12"><h2 className="heading text-2xl">Reviews</h2>{member.reviews.length === 0 ? <p className="body-copy mt-3">No reviews yet.</p> : <ul className="mt-5 space-y-3">{member.reviews.map((review) => <li key={review.id}><PublishedReviewCard review={review} /></li>)}</ul>}</section>
    {member.listings.length > 0 && <section className="mt-12"><h2 className="heading text-2xl">Listings</h2><ul className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{member.listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</ul></section>}
  </Container>;
}
