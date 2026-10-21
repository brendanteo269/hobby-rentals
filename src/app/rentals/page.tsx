import Link from "next/link";
import { Badge, ButtonLink, EmptyState } from "@/components/ui";
import { RenterPortal, requireRenter } from "@/components/renter-portal";
import { getMyBookings } from "@/lib/api/bookings";
import { getMyBundleBookings } from "@/lib/api/bundles";
import { BOOKING_STATUS_BADGE_VARIANT, BOOKING_STATUS_LABELS } from "@/lib/bookings";
import { formatDate, formatMoney } from "@/lib/format";
import { renterDashboard, type RentalCard } from "@/lib/rentals";
import { profilePath } from "@/lib/routes";

export const metadata = { title: "My rentals — HobbyRentals" };

/**
 * S3-13: the renter's dashboard - what they have out now and what they are
 * about to collect. The full history, and every action on a booking, stays on
 * the profile's Renting tab, which each card links to.
 */
export default async function RentalsPage() {
  await requireRenter();
  const [bookings, bundleBookings] = await Promise.all([getMyBookings(), getMyBundleBookings()]);
  const { active, upcoming, pendingCount, hasAnyBooking } = renterDashboard(bookings, bundleBookings);

  return (
    <RenterPortal active="My Rentals" title="My rentals">
      {active.length === 0 && upcoming.length === 0 ? (
        // Scenario 3.
        <EmptyState
          title={hasAnyBooking ? "Nothing rented right now" : "You haven't rented anything yet"}
          body={
            hasAnyBooking
              ? "Your active and upcoming rentals show here. Find something for your next session."
              : "Find gear from people nearby. Your active and upcoming rentals will show here."
          }
          action={<ButtonLink href="/browse">Browse the marketplace</ButtonLink>}
        />
      ) : (
        <div className="space-y-12">
          <RentalSection
            id="active"
            title="Active rentals"
            empty="Nothing is out with you right now."
            cards={active}
          />
          <RentalSection
            id="upcoming"
            title="Upcoming rentals"
            empty="No confirmed rentals coming up."
            cards={upcoming}
          />
        </div>
      )}

      {(pendingCount > 0 || hasAnyBooking) && (
        <p className="body-copy mt-10 text-sm">
          {pendingCount > 0 &&
            `${pendingCount} ${pendingCount === 1 ? "request is" : "requests are"} waiting on an owner. `}
          <Link href={profilePath("renter")} className="font-medium text-ink underline underline-offset-4">
            See all your bookings
          </Link>
        </p>
      )}
    </RenterPortal>
  );
}

function RentalSection({ id, title, empty, cards }: { id: string; title: string; empty: string; cards: RentalCard[] }) {
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
              <RentalCardView card={card} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RentalCardView({ card }: { card: RentalCard }) {
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

      <Link href={card.detailsHref} className="mt-auto text-sm font-medium text-ink underline underline-offset-4">
        View booking
      </Link>
    </article>
  );
}
