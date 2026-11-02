import type { Route } from "next";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { Container, ButtonLink, EmptyState, Badge } from "@/components/ui";
import { MarketplaceHeader } from "@/components/browse/marketplace-header";
import { getGearRequestBoard } from "@/lib/api/gear-requests";
import type { GearRequest } from "@/lib/gear-requests";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Gear requests" };

/**
 * S5-13 Scenario 1: the board every posted request lands on.
 *
 * Only open requests are here - the API returns nothing else - so Scenario
 * 4's "removed from the board" needs no filtering of its own.
 *
 * It carries the marketplace header so Items, Bundles and Requests read as
 * three views of one place rather than a separate feature bolted on.
 */
export default async function GearRequestsPage() {
  let requests: GearRequest[] = [];
  let error: string | null = null;
  try {
    requests = await getGearRequestBoard();
  } catch {
    error = "The requests board could not be loaded. Try again in a moment.";
  }

  return (
    <Container className="pb-16 pt-10">
      <MarketplaceHeader active="requests" filters={{ q: "", category: [], location_area: [], start_date: "", end_date: "" }} activeCount={error ? null : requests.length} />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <p className="body-copy max-w-2xl">
          Renters post what they could not find. If you have a potential listed or archived listing, offer it.
        </p>
        <ButtonLink href="/requests/new">Post a request</ButtonLink>
      </div>

      <div className="mt-8">
        {error ? (
          <EmptyState icon={PackageSearch} title="Requests could not be loaded" body={error} />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No open requests"
            body="Nobody is looking for anything right now. If you cannot find what you need, post a request and owners will come to you."
            action={<ButtonLink href="/requests/new">Post a request</ButtonLink>}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((request) => (
              <li key={request.id}>
                <Link href={`/requests/${request.id}` as Route} className="card flex h-full flex-col p-5 transition-shadow hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="heading text-lg">{request.title}</h2>
                    <Badge variant={request.offer_count > 0 ? "success" : "neutral"}>
                      {request.offer_count} {request.offer_count === 1 ? "offer" : "offers"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    {formatDate(request.start_date)} &ndash; {formatDate(request.end_date)}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Up to {formatMoney(request.max_daily_price_cents)} / day
                  </p>
                  {request.details && <p className="body-copy mt-3 line-clamp-3 text-sm">{request.details}</p>}
                  <span className="mt-auto pt-4 text-sm font-medium text-ink">View request &rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
