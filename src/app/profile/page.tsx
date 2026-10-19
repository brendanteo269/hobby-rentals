import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/profile";
import { getMyListings } from "@/lib/api/listings";
import { getMyBookings } from "@/lib/api/bookings";
import { getMySuspension } from "@/lib/api/overdue";
import { getMyOwnerVerification } from "@/lib/api/verification";
import { VerifiedOwnerBadge } from "@/components/listings/verified-owner-badge";
import { responseRatePercent } from "@/lib/verification";
import { getMyBundleBookings } from "@/lib/api/bundles";
import { getMyWaitlist } from "@/lib/api/waitlist";
import { getReviewEligibility } from "@/lib/api/reviews";
import { Badge, Container } from "@/components/ui";
import { isLocationArea, LOCATION_LABELS } from "@/lib/listings";
import { ViewTabs, RenterView, OwnerView, RatingsView } from "@/components/profile-views";
import {
  defaultProfileView,
  isProfileView,
  type ProfileView,
} from "@/lib/routes";
import type { Roles } from "@/lib/contact-details";
import { AccountSettings } from "@/components/account-settings";
import { CreditWallet } from "@/components/credit-wallet";
import { getPublicMember } from "@/lib/api/reviews";
import { getOwnerInsights } from "@/lib/api/owner-insights";
import { isInsightsPeriod, type InsightsPeriod } from "@/lib/owner-insights";

export const metadata = { title: "Your profile — HobbyRentals" };

/**
 * The view lives in the URL rather than client state, so it survives a reload
 * and can be linked to. An absent or unrecognised value falls back to the same
 * rule onboarding uses to choose where to send a member, so the two agree.
 */
function resolveView(requested: string | undefined, roles: Roles): ProfileView {
  return isProfileView(requested) ? requested : defaultProfileView(roles);
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; period?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy guard already redirects anonymous visitors; this is defence in
  // depth and narrows the type for the render below.
  if (!user) redirect("/login");

  const profile = await getOwnProfile();
  // Defence in depth: the middleware gate already turns an un-onboarded member
  // away from this page (S1-02 AC5). This is what stops a future change there
  // from silently rendering a half-configured profile.
  if (!profile?.onboarded_at) redirect("/onboarding");

  const { view, period: requestedPeriod } = await searchParams;
  const insightsPeriod: InsightsPeriod = isInsightsPeriod(requestedPeriod) ? requestedPeriod : "30d";
  const roles: Roles = {
    wantsToRent: profile.wants_to_rent,
    wantsToOwn: profile.wants_to_own,
  };
  const active: ProfileView = resolveView(view, roles);
  const ratings = active === "ratings" ? await getPublicMember(user.id).catch(() => null) : null;

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  });
  const isVerified = Boolean(user.email_confirmed_at);
  const [myListings, myBookings, myBundleBookings, myWaitlist, reviewEligibility, verification, suspension, ownerInsights] = await Promise.all([
    getMyListings(),
    getMyBookings(),
    getMyBundleBookings(),
    getMyWaitlist(true),
    getReviewEligibility().catch(() => []),
    // S4-01: the owner's own badge standing. Swallowed like the suspension
    // below - a badge missing from your own profile must not cost you the
    // page, and it says nothing a renter cannot already see.
    getMyOwnerVerification().catch(() => undefined),
    // S3-18: unpaid late fees pause new bookings; the banner is how the
    // renter learns that and settles up. Failures are swallowed on purpose:
    // this is a banner beside the bookings, and losing it must never cost
    // the renter sight of the bookings themselves. Nothing is let through by
    // hiding it either - the database refuses a suspended renter's booking
    // whatever this page managed to show.
    getMySuspension().catch(() => undefined),
    getOwnerInsights(insightsPeriod).catch(() => null),
  ]);

  return (
    <Container className="py-16">
      <p className="eyebrow">Member since {memberSince}</p>
      <h1 className="heading mt-3 text-3xl">{profile.display_name ?? "Your profile"}</h1>
      <p className="body-copy mt-2 flex flex-wrap items-center gap-3">
        {user.email}
        {/* About the email address, not the owner. Named in full so it cannot
            be read as the Verified Owner badge beside it (S4-01). */}
        <Badge variant={isVerified ? "dark" : "accent"}>
          {isVerified ? "Verified account" : "Pending verification"}
        </Badge>
        <VerifiedOwnerBadge verified={verification?.verified} />
      </p>
      {verification?.verified && (
        <p className="body-copy mt-2 text-sm">
          {verification.completed_rentals} completed{" "}
          {verification.completed_rentals === 1 ? "rental" : "rentals"} · You answered{" "}
          {responseRatePercent(verification)}% of booking requests
        </p>
      )}

      {/* The one location a member has left: where they hand their gear over.
          Absent for anyone who only rents, which is most of this page's
          visitors on day one. */}
      {profile.default_pickup_location && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
          <MapPin className="size-4" aria-hidden="true" />
          {isLocationArea(profile.default_pickup_location)
            ? LOCATION_LABELS[profile.default_pickup_location]
            : profile.default_pickup_location}
        </p>
      )}

      {profile.bio && <p className="body-copy mt-2 max-w-xl">{profile.bio}</p>}

      <div className="mt-10">
        <ViewTabs active={active} />
        <div className="mt-8">
          {active === "renter" && <RenterView enabled={profile.wants_to_rent} bookings={myBookings} bundleBookings={myBundleBookings} waitlist={myWaitlist} reviewEligibility={reviewEligibility} suspension={suspension} />}
          {active === "owner" && (
            <OwnerView
              enabled={profile.wants_to_own}
              listings={myListings}
              insights={ownerInsights}
            />
          )}
          {active === "ratings" && <RatingsView profile={ratings} />}
          {active === "wallet" && <CreditWallet />}
          {active === "account" && (
            <AccountSettings
              email={user.email ?? ""}
              emailVerified={isVerified}
              displayName={profile.display_name}
              contactNumber={profile.contact_number}
              defaultPickupLocation={profile.default_pickup_location}
              bio={profile.bio}
              roles={roles}
            />
          )}
        </div>
      </div>
    </Container>
  );
}
