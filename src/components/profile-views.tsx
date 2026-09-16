import Link from "next/link";
import { Button, ButtonLink, EmptyState } from "./ui";
import { enableRenting, enableOwning } from "@/app/profile/actions";
import { saveProfileAvailability } from "@/app/profile/actions";
import { ProfileAvailabilityCard } from "@/components/profile-availability-card";

export type ProfileView = "renter" | "owner" | "wallet" | "account";

const TABS: { view: ProfileView; label: string }[] = [
  { view: "renter", label: "Renting" },
  { view: "owner", label: "Owning" },
  { view: "wallet", label: "Wallet" },
  { view: "account", label: "Account" },
];

/** Switches between the sides of the marketplace and the account panels. */
export function ViewTabs({ active }: { active: ProfileView }) {
  return (
    <nav className="flex gap-6 border-b border-line" aria-label="Profile view">
      {TABS.map((tab) => {
        const isActive = tab.view === active;
        return (
          <Link
            key={tab.view}
            href={`/profile?view=${tab.view}`}
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

/**
 * Shown when the member has not opted into this side yet. Turning it on is a
 * single click, so an early "rent only" choice never becomes a dead end.
 */
function NotEnabled({ side }: { side: "renter" | "owner" }) {
  const copy =
    side === "renter"
      ? {
          title: "Renting is not switched on",
          body: "Turn it on to book gear from people nearby. Nothing is charged until an owner accepts.",
          label: "Start renting",
          action: enableRenting,
        }
      : {
          title: "Owning is not switched on",
          body: "Turn it on to list the gear you already have and earn from it between uses.",
          label: "Start listing",
          action: enableOwning,
        };

  return (
    <EmptyState
      title={copy.title}
      body={copy.body}
      action={
        <form action={copy.action}>
          <Button type="submit">{copy.label}</Button>
        </form>
      }
    />
  );
}

export function RenterView({ enabled }: { enabled: boolean }) {
  if (!enabled) return <NotEnabled side="renter" />;
  return (
    <EmptyState
      title="No bookings yet"
      body="Gear you book will appear here, with collection dates and the owner's details."
      action={<ButtonLink href="/browse">Browse products</ButtonLink>}
    />
  );
}

export function OwnerView({ enabled, availableDays = [1, 2, 3, 4, 5, 6, 7] }: { enabled: boolean; availableDays?: number[] }) {
  if (!enabled) return <NotEnabled side="owner" />;
  return (
    <div className="space-y-6">
      <ProfileAvailabilityCard availableDays={availableDays} action={saveProfileAvailability} />
      <EmptyState
        title="No listings yet"
        body="Gear you list will appear here, along with requests from people wanting to book it."
        action={<ButtonLink href="/listings/new">List your gear</ButtonLink>}
      />
    </div>
  );
}
