import { notFound } from "next/navigation";
import { Badge, ButtonLink, Container } from "@/components/ui";
import { getPublicMember } from "@/lib/api/reviews";
import { formatDate } from "@/lib/format";

function Rating({ label, summary }: { label: string; summary: { average: number | null; count: number } }) {
  return <div className="border border-line bg-white p-4"><p className="text-xs text-ink-soft">{label}</p><p className="heading mt-1 text-xl">{summary.average === null ? "No ratings yet" : `${summary.average.toFixed(1)} / 5`}</p><p className="mt-1 text-xs text-ink-soft">{summary.count} {summary.count === 1 ? "review" : "reviews"}</p></div>;
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getPublicMember(id).catch(() => null);
  if (!member) notFound();
  return <Container className="py-16"><p className="eyebrow">Member since {new Date(member.created_at).toLocaleDateString("en-SG", { month: "long", year: "numeric" })}</p><h1 className="heading mt-2 text-3xl">{member.display_name ?? "Member"}</h1>
    <div className="mt-8 grid gap-3 sm:grid-cols-2"><Rating label="Owner rating" summary={member.owner_summary} /><Rating label="Renter rating" summary={member.renter_summary} /></div>
    <section className="mt-12"><h2 className="heading text-2xl">Reviews</h2>{member.reviews.length === 0 ? <p className="body-copy mt-3">No reviews yet.</p> : <ul className="mt-5 space-y-3">{member.reviews.map((review) => <li key={review.id} className="border border-line bg-white p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="dark">{review.rating} / 5</Badge><span className="text-sm text-ink-soft">Reviewed as {review.reviewed_role.toLowerCase()} · {formatDate(review.published_at)}</span></div><p className="mt-3 text-sm text-ink">{review.body}</p><p className="mt-3 text-xs text-ink-soft">{review.rental_name_snapshot} · by {review.reviewer?.display_name ?? "Member"}</p></li>)}</ul>}</section>
    {member.listings.length > 0 && <section className="mt-12"><h2 className="heading text-2xl">Listings</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{member.listings.map((listing) => <li key={listing.id} className="border border-line bg-white p-4"><h3 className="font-medium text-ink">{listing.name}</h3><ButtonLink href={`/listings/${listing.id}`} variant="outline" className="mt-4 px-3 py-1.5 text-xs">View listing</ButtonLink></li>)}</ul></section>}
  </Container>;
}
