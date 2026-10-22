import { notFound } from "next/navigation";
import { ButtonLink, Container, FormNotice } from "@/components/ui";
import { OwnerProtectionCard } from "@/components/listings/owner-protection-card";
import { getListing } from "@/lib/api/listings";
import { getHobbyShieldQuote, getMyHobbyShieldPolicies } from "@/lib/api/owner-protection";
import { createClient } from "@/lib/supabase/server";
import { daysUntilExpiry, policyIsCurrent } from "@/lib/owner-protection";
import { formatSingaporeDateTime, formatMoney } from "@/lib/format";

export const metadata = { title: "HobbyShield — HobbyRentals" };

export default async function ProtectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing;
  let quote;
  let policies;
  try {
    [listing, quote, policies] = await Promise.all([getListing(id), getHobbyShieldQuote(id), getMyHobbyShieldPolicies()]);
  } catch {
    notFound();
  }
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (user?.id !== listing.owner_id) notFound();
  const policy = policies.find((item) => item.listing_id === id && policyIsCurrent(item));
  const scheduled = policies.find((item) => item.listing_id === id && item.status === "SCHEDULED");
  const days = policy ? daysUntilExpiry(policy) : 0;
  const renewalStartsAt = policy?.effective_to;
  const renewalEndsAt = policy
    ? new Date(new Date(policy.effective_to).getTime() + (policy.terms_snapshot.term_days ?? 30) * 86_400_000).toISOString()
    : undefined;

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">HobbyShield</p>
        <h1 className="heading mt-3 text-3xl">Protect {listing.name}</h1>
        <p className="body-copy mt-3">HobbyShield is a simulated, platform-administered protection plan for your listed gear.</p>
        <ButtonLink href={`/listings/${id}`} variant="outline" className="mt-5 px-4 py-2 text-xs">← Back to listing</ButtonLink>
        {policy ? (
          <section className="mt-8 card p-6">
            <p className="eyebrow">{scheduled ? "HobbyShield renewal scheduled" : "HobbyShield active"}</p><h2 className="heading mt-2 text-xl">{policy.policy_number}</h2>
            {scheduled ? <><p className="body-copy mt-2">Your HobbyShield coverage is continuous until {formatSingaporeDateTime(scheduled.effective_to)}.</p><p className="mt-3 text-sm text-ink-soft">Your current term ends {formatSingaporeDateTime(policy.effective_to)}; your next term begins immediately and runs until {formatSingaporeDateTime(scheduled.effective_to)}.</p></> : <><p className="body-copy mt-2">Coverage of up to {formatMoney(policy.coverage_cap_cents)} is active until {formatSingaporeDateTime(policy.effective_to)}.</p>{days >= 0 && days <= 7 && <p className="mt-3 text-sm text-amber-800">Expires in {days} {days === 1 ? "day" : "days"}. Renew now to keep coverage continuous.</p>}</>}
            {days >= 0 && days <= 7 && !scheduled && <OwnerProtectionCard listingId={id} quote={quote} renewal renewalStartsAt={renewalStartsAt} renewalEndsAt={renewalEndsAt} />}
          </section>
        ) : quote.reason === "Set a replacement value before purchasing HobbyShield." ? (
          <section className="mt-8">
            <FormNotice message="Set a replacement value before purchasing HobbyShield." />
            <ButtonLink href={`/listings/${id}/edit#price`} className="mt-4 px-4 py-2 text-xs">Set replacement value</ButtonLink>
          </section>
        ) : quote.reason === "Record baseline condition photos before purchasing HobbyShield." ? (
          <section className="mt-8">
            <FormNotice message="Complete the Product Passport baseline before purchasing HobbyShield." />
            <ButtonLink href={`/listings/${id}/passport/baseline`} className="mt-4 px-4 py-2 text-xs">Add baseline condition photos</ButtonLink>
          </section>
        ) : quote.reason === "Complete the Product Passport identity record before purchasing HobbyShield." ? (
          <section className="mt-8">
            <FormNotice message="Complete the Product Passport identity record before purchasing HobbyShield." />
            <ButtonLink href={`/listings/${id}/passport`} className="mt-4 px-4 py-2 text-xs">Complete Product Passport</ButtonLink>
          </section>
        ) : <OwnerProtectionCard listingId={id} quote={quote} />}
      </div>
    </Container>
  );
}
