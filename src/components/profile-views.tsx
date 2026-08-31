import Link from "next/link";
import { Button, ButtonLink } from "./ui";
import { enableRenting, enableOwning } from "@/app/profile/actions";

export type ProfileView = "renter" | "owner" | "account";

const TABS: { view: ProfileView; label: string }[] = [
  { view: "renter", label: "Renting" },
  { view: "owner", label: "Owning" },
  { view: "account", label: "Account" },
];

/** Switches between the two sides of the marketplace. */
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

/** Shared empty state, so both sides read the same way before there is data. */
function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="border border-line bg-white px-8 py-14 text-center">
      <h2 className="display-caps text-xl">{title}</h2>
      <p className="body-copy mx-auto mt-3 max-w-sm">{body}</p>
      <div className="mt-6 flex justify-center">{action}</div>
    </div>
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
      action={<ButtonLink href="/">Browse gear</ButtonLink>}
    />
  );
}

export function OwnerView({ enabled }: { enabled: boolean }) {
  if (!enabled) return <NotEnabled side="owner" />;
  return (
    <EmptyState
      title="No listings yet"
      body="Gear you list will appear here, along with requests from people wanting to book it."
      action={<ButtonLink href="/">List your gear</ButtonLink>}
    />
  );
}
