import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, HandCoins, Inbox } from "lucide-react";
import { Container, ButtonLink, Badge, StatTile } from "@/components/ui";
import { OfferListingPanel } from "@/components/requests/offer-listing-panel";
import { CloseRequestButton } from "@/components/requests/close-request-button";
import { getGearRequest } from "@/lib/api/gear-requests";
import { GEAR_REQUEST_STATUS_LABELS, offeredListingHref } from "@/lib/gear-requests";
import { formatDateRange, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/**
 * S5-13 Scenarios 3 and 4: one request, from both sides.
 *
 * The renter sees every offer and the button that takes it down. An owner
 * sees their own offer, their own listings to answer with, and nobody else's
 * - the board is not a list of who else is competing for the work.
 */
export default async function GearRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getGearRequest(id).catch(() => null);
  if (!detail) notFound();

  const { request, offers, offerable } = detail;
  const { data: { user } } = await (await createClient()).auth.getUser();
  const isRenter = user?.id === request.renter_id;
  const alreadyOffered = new Set(offers.map((offer) => offer.listing_id));
  // Inclusive of both ends, in UTC: these are calendar dates, and parsing
  // them as local midnight would lose a day everywhere east of Greenwich.
  const days =
    Math.round(
      (Date.parse(`${request.end_date}T00:00:00Z`) - Date.parse(`${request.start_date}T00:00:00Z`))
        / 86_400_000,
    ) + 1;

  return (
    <Container className="max-w-3xl py-16">
      <ButtonLink href="/requests" variant="outline" className="px-4 py-2 text-xs">
        &larr; Back to requests
      </ButtonLink>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="heading text-3xl">{request.title}</h1>
        {request.status !== "OPEN" && (
          <Badge variant="neutral">{GEAR_REQUEST_STATUS_LABELS[request.status]}</Badge>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={CalendarRange}
          label="Dates requested by renter"
          value={formatDateRange(request.start_date, request.end_date)}
          detail={`${days} ${days === 1 ? "day" : "days"}`}
          size="phrase"
        />
        <StatTile
          icon={HandCoins}
          label="Most the renter would pay"
          value={`${formatMoney(request.max_daily_price_cents)} / day`}
          detail={`Up to ${formatMoney(request.max_daily_price_cents * days)} for the hire`}
          tone="accent"
          size="phrase"
        />
        <StatTile
          icon={Inbox}
          label="Offers"
          value={String(request.offer_count)}
          detail={request.offer_count === 0 ? "Nobody has answered yet" : "From owners with something similar"}
          tone={request.offer_count > 0 ? "success" : "neutral"}
        />
      </div>

      {request.details && (
        <p className="body-copy mt-6 whitespace-pre-line">{request.details}</p>
      )}

      {/* Scenario 4, the renter's own route: taking it down. Offered once the
          request is theirs and still open - a closed one is already gone. */}
      {isRenter && request.status === "OPEN" && (
        <div className="mt-6">
          <CloseRequestButton requestId={request.id} />
        </div>
      )}

      {isRenter && request.status === "FULFILLED" && (
        <p className="body-copy mt-6 bg-surface-muted px-4 py-3 text-sm">
          You booked one of the offers, so this came off the board. Owners can no longer offer on it.
        </p>
      )}

      {/* Scenario 3: what the owner answers with. Hidden once the request has
          closed, which is the other half of Scenario 4. */}
      {!isRenter && request.status === "OPEN" && (
        <div className="mt-8">
          <OfferListingPanel
            requestId={request.id}
            listings={offerable}
            alreadyOffered={[...alreadyOffered]}
          />
        </div>
      )}

      <section className="mt-10">
        <h2 className="heading text-xl">
          {isRenter ? "Offers" : "Your offers"}
          <span className="ml-2 text-base font-normal text-ink-soft">{offers.length}</span>
        </h2>
        {offers.length === 0 ? (
          <p className="body-copy mt-3">
            {isRenter
              ? "No offers yet. Owners with something similar have been told about this request."
              : "You have not offered anything on this request."}
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {offers.map((offer) => (
              <li key={offer.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{offer.listing?.name ?? "A listing"}</p>
                  {/* Who is offering it. A list of listings with no names
                      against them makes the renter open each one to find
                      out who they would be renting from. */}
                  <p className="mt-0.5 text-sm text-ink-soft">
                    Offered by {offer.owner_display_name ?? "a member"}
                  </p>
                  {offer.listing?.price_per_day_cents != null && (
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {formatMoney(offer.listing.price_per_day_cents)} / day
                      {offer.listing.status === "ARCHIVED" && " · archived until someone books it"}
                    </p>
                  )}
                  {offer.message && <p className="body-copy mt-2 text-sm">&ldquo;{offer.message}&rdquo;</p>}
                </div>
                {/* The dates they asked for, already chosen: the renter wrote
                    them into the request and should not answer twice. */}
                <Link
                  href={offeredListingHref(offer.listing_id, request) as Route}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  View listing with these dates &rarr;
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
