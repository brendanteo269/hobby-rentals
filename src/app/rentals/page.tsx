import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import type { Route } from "next";
import { Badge, ButtonLink, EmptyState } from "@/components/ui";
import { EnableRentingPrompt, RenterPortal } from "@/components/renter-portal";
import { ConfirmHandoverButton } from "@/components/bookings/confirm-handover-button";
import { ConfirmReturnButton } from "@/components/bookings/confirm-return-button";
import { SuspensionBanner } from "@/components/bookings/suspension-banner";
import { backendRequest } from "@/lib/api/client";
import { getRenterActivity } from "@/lib/api/rentals";
import { BOOKING_STATUS_BADGE_VARIANT, BOOKING_STATUS_LABELS } from "@/lib/bookings";
import { formatDate, formatMoney } from "@/lib/format";
import { getOwnProfile } from "@/lib/profile";
import { renterActionItems, renterDashboard, type RentalCard, type RenterActionItem } from "@/lib/rentals";
import { profilePath, renterBookingsPath } from "@/lib/routes";
import { mapWalletResponse } from "@/lib/wallet";

export const metadata = { title: "My rentals — HobbyRentals" };

/**
 * S3-13: the renter's overview - what is waiting on them, what they have out
 * now and what they are about to collect. The full history, with every action
 * on a booking, is the Bookings tab, which each card links to.
 *
 * The other renter pages send a member who has not switched renting on here,
 * so this is the one that offers to, rather than calling requireRenter.
 */
export default async function RentalsPage() {
  const profile = await getOwnProfile();
  if (!profile?.wants_to_rent) return <EnableRentingPrompt />;

  const [activity, heldCents] = await Promise.all([
    getRenterActivity(),
    heldInEscrow(),
  ]);
  const { bookings, bundleBookings, waitlist, suspension } = activity;
  const { active, upcoming, pendingCount, hasAnyBooking } = renterDashboard(bookings, bundleBookings);
  const actions = renterActionItems(activity);

  return (
    <RenterPortal active="Overview" title="My rentals">
      {suspension && <SuspensionBanner status={suspension} />}
      {!hasAnyBooking && waitlist.length === 0 ? (
        // Scenario 3.
        <EmptyState
          title="You haven't rented anything yet"
          body="Find gear from people nearby. Your active and upcoming rentals will show here."
          action={<ButtonLink href="/browse">Browse the marketplace</ButtonLink>}
        />
      ) : (
        <div className="space-y-12">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Active" value={String(active.length)} href={renterBookingsPath("active")} />
            <Stat label="Upcoming" value={String(upcoming.length)} href={renterBookingsPath("upcoming")} />
            <Stat label="Awaiting owner" value={String(pendingCount)} href={renterBookingsPath("requests")} />
            <Stat
              label="Held in escrow"
              value={heldCents === null ? "—" : formatMoney(heldCents)}
              href={profilePath("wallet")}
            />
          </dl>

          <section aria-labelledby="actions-heading">
            <h2 id="actions-heading" className="heading text-xl">
              Needs your action
            </h2>
            {actions.length === 0 ? (
              <p className="body-copy mt-2">You&apos;re all caught up.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line card overflow-hidden">
                {actions.map((item, index) => (
                  <li key={`${item.rowId ?? item.name}-${index}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {item.title}
                        <span className="font-normal text-ink-soft"> · {item.name}</span>
                      </p>
                      {item.detail && (
                        <p className={`mt-0.5 text-xs ${item.urgent ? "text-accent-dark" : "text-ink-soft"}`}>{item.detail}</p>
                      )}
                    </div>
                    <ActionControl item={item} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <RentalSection
            id="active"
            title="Active rentals"
            empty="Nothing is out with you right now."
            cards={active}
            actions={actions}
          />
          <RentalSection
            id="upcoming"
            title="Upcoming rentals"
            empty="No confirmed rentals coming up."
            cards={upcoming}
            actions={actions}
          />
        </div>
      )}
    </RenterPortal>
  );
}

/** What the renter has on hold, or null when the wallet cannot be read: a hiccup there costs the one figure, not the page. */
async function heldInEscrow(): Promise<number | null> {
  try {
    return mapWalletResponse(await backendRequest("/wallet", { cache: "no-store" })).heldCents;
  } catch (error) {
    // A redirect (the session ended) is Next's control flow, not a failure.
    unstable_rethrow(error);
    return null;
  }
}

function Stat({ label, value, href }: { label: string; value: string; href: Route }) {
  return (
    <Link href={href} className="block card p-4 transition-colors hover:border-ink">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="heading mt-1 text-2xl">{value}</dd>
    </Link>
  );
}

/** The one control that settles an action item: a link, or the confirm button its booking row has too. */
function ActionControl({ item }: { item: RenterActionItem }): ReactNode {
  const { action } = item;
  if (action.kind !== "link") {
    return action.kind === "confirm-handover" ? (
      <ConfirmHandoverButton bookingId={action.bookingId} />
    ) : (
      <ConfirmReturnButton bookingId={action.bookingId} />
    );
  }
  return (
    <ButtonLink href={action.href} variant={item.urgent ? "accent" : "outline"} className="px-3 py-1.5 text-xs">
      {action.label}
    </ButtonLink>
  );
}

function RentalSection({
  id,
  title,
  empty,
  cards,
  actions,
}: {
  id: string;
  title: string;
  empty: string;
  cards: RentalCard[];
  actions: RenterActionItem[];
}) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="heading text-xl">
        {title}
      </h2>
      {cards.length === 0 ? (
        <p className="body-copy mt-2">{empty}</p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <li key={`${card.kind}-${card.id}`}>
              <RentalCardView card={card} nextAction={actions.find((item) => item.rowId === card.rowId)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RentalCardView({ card, nextAction }: { card: RentalCard; nextAction?: RenterActionItem }) {
  const fallbackName = card.kind === "BUNDLE" ? "Bundle" : "Listing";

  return (
    <article className="card flex h-full flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={card.href} className="heading text-lg hover:underline">
            {card.name ?? fallbackName}
          </Link>
          <p className="mt-1 text-sm text-ink-soft">From {card.ownerName ?? "the owner"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {card.kind === "BUNDLE" && <Badge>Bundle</Badge>}
          {card.overdueSince ? (
            <Badge variant="accent">Overdue</Badge>
          ) : (
            <Badge variant={BOOKING_STATUS_BADGE_VARIANT[card.status]}>{BOOKING_STATUS_LABELS[card.status]}</Badge>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-ink-soft">Rental period</dt>
          <dd className="mt-0.5 font-medium">
            {formatDate(card.startDate)} – {formatDate(card.endDate)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-soft">Deposit held</dt>
          <dd className="mt-0.5 font-medium">{card.depositCents > 0 ? formatMoney(card.depositCents) : "None"}</dd>
        </div>
      </dl>

      {card.meetup && <p className="text-sm text-ink-soft">Meetup: {card.meetup}</p>}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <Link href={card.detailsHref} className="text-sm font-medium text-ink underline underline-offset-4">
          View booking
        </Link>
        {nextAction && <ActionControl item={nextAction} />}
      </div>
    </article>
  );
}
