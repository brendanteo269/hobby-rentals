import { notFound } from "next/navigation";
import { ButtonLink, Container, FormNotice } from "@/components/ui";
import { OwnerProtectionCard } from "@/components/listings/owner-protection-card";
import { getListing } from "@/lib/api/listings";
import { getHobbyShieldQuote, getMyHobbyShieldPolicies } from "@/lib/api/owner-protection";
import { createClient } from "@/lib/supabase/server";
import { daysUntilExpiry, policyIsCurrent } from "@/lib/owner-protection";
import { formatDate, formatMoney } from "@/lib/format";

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
  const days = policy ? daysUntilExpiry(policy) : 0;

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">HobbyShield</p>
        <h1 className="heading mt-3 text-3xl">Protect {listing.name}</h1>
        <p className="body-copy mt-3">HobbyShield is a simulated, platform-administered protection plan for your listed gear.</p>
        <ButtonLink href={`/listings/${id}`} variant="outline" className="mt-5 px-4 py-2 text-xs">← Back to listing</ButtonLink>
        {policy ? (
          <section className="mt-8 border border-line bg-white p-6">
            <p className="eyebrow">HobbyShield active</p><h2 className="heading mt-2 text-xl">{policy.policy_number}</h2>
            <p className="body-copy mt-2">Coverage of up to {formatMoney(policy.coverage_cap_cents)} is active until {formatDate(policy.effective_to)}.</p>
            {days > 0 && days <= 3 && <p className="mt-3 text-sm text-amber-800">Expires in {days} {days === 1 ? "day" : "days"} · Renewal available upon expiration.</p>}
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
