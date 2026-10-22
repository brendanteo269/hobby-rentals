import Link from "next/link";
import { EmptyState } from "./ui";
import { profilePath, type ProfileView } from "@/lib/routes";
import type { PublicMemberProfile } from "@/lib/reviews";
import { PublishedReviewCard } from "@/components/reviews/published-review-card";

export type { ProfileView } from "@/lib/routes";

const TABS: { view: ProfileView; label: string }[] = [
  { view: "ratings", label: "Ratings" },
  { view: "wallet", label: "Wallet" },
  { view: "account", label: "Account" },
];

/** Switches between the profile's panels. Renting and owning live in their portals, not here. */
export function ViewTabs({ active }: { active: ProfileView }) {
  return (
    <nav className="flex gap-6 border-b border-line" aria-label="Profile view">
      {TABS.map((tab) => {
        const isActive = tab.view === active;
        return (
          <Link
            key={tab.view}
            href={profilePath(tab.view)}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm transition-colors ${
              isActive
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function RatingsView({ profile }: { profile: PublicMemberProfile | null }) {
  if (!profile) {
    return (
      <EmptyState
        title="Ratings could not be loaded"
        body="Try refreshing this page in a moment."
      />
    );
  }

  const reviews = profile.reviews;
  return (
    <div>
      <div>
        <p className="eyebrow">Your reputation</p>
        <h2 className="heading mt-2 text-2xl">Ratings and reviews</h2>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <RatingSummary
          label="As an owner"
          average={profile.owner_summary.average}
          count={profile.owner_summary.count}
        />
        <RatingSummary
          label="As a renter"
          average={profile.renter_summary.average}
          count={profile.renter_summary.count}
        />
      </div>
      {reviews.length === 0 ? (
        <p className="body-copy mt-8">No reviews yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {reviews.map((review) => <li key={review.id}><PublishedReviewCard review={review} /></li>)}
        </ul>
      )}
    </div>
  );
}

function RatingSummary({ label, average, count }: { label: string; average: number | null; count: number }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="heading mt-1 text-xl">
        {average === null ? "No ratings yet" : `${average.toFixed(1)} / 5`}
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        {count} {count === 1 ? "review" : "reviews"}
      </p>
    </div>
  );
}
