import Link from "next/link";
import { ButtonLink, EmptyState, StatTile } from "@/components/ui";
import { Lock, Receipt, Undo2 } from "lucide-react";
import { RenterPortal, requireRenter } from "@/components/renter-portal";
import { backendRequest } from "@/lib/api/client";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { profilePath, RENTER_BOOKINGS_PATH, renterSpendingPath } from "@/lib/routes";
import { isSpendingPeriod, renterSpending, SPENDING_PERIODS, type SpendingPeriod } from "@/lib/spending";
import { mapWalletResponse } from "@/lib/wallet";

export const metadata = { title: "Spending — HobbyRentals" };

/**
 * What renting has cost the member, the renter's side of the owner's
 * Earnings tab. Read from the wallet ledger, which is where the money actually
 * went: a hold only becomes spending once a settlement or cancellation takes
 * something from it.
 */
export default async function RenterSpendingPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireRenter();
  const { period: requested } = await searchParams;
  const period: SpendingPeriod = isSpendingPeriod(requested) ? requested : "3m";
  const wallet = mapWalletResponse(await backendRequest("/wallet", { cache: "no-store" }));
  const { spentCents, returnedCents, rentals } = renterSpending(wallet.transactions, period);

  return (
    <RenterPortal active="Spending" title="Spending">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Period" className="flex rounded-full border border-line bg-white p-1">
          {SPENDING_PERIODS.map((option) => (
            <Link
              key={option.value}
              href={renterSpendingPath(option.value)}
              aria-current={option.value === period ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-xs ${
                option.value === period ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </nav>
        <ButtonLink href={profilePath("wallet")} variant="outline" className="px-4 py-2 text-xs">
          Open wallet
        </ButtonLink>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatTile icon={Receipt} tone="accent" label="Spent on rentals" value={formatMoney(spentCents)} detail="Rent, fees and anything taken from a deposit" />
        <StatTile icon={Undo2} tone="success" label="Returned to your wallet" value={formatMoney(returnedCents)} detail="Deposits and holds released, and refunds" />
        <StatTile icon={Lock} label="Held in escrow now" value={formatMoney(wallet.heldCents)} detail="Comes back unless a claim takes some of it" />
      </div>

      <section aria-labelledby="by-rental-heading" className="mt-12">
        <h2 id="by-rental-heading" className="heading text-xl">
          By rental
        </h2>
        {rentals.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={Receipt}
              title="Nothing in this period"
              body="Charges appear here once a rental is settled or cancelled. Money still on hold shows in your wallet."
              action={
                <ButtonLink href={RENTER_BOOKINGS_PATH} variant="outline">
                  See your bookings
                </ButtonLink>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {rentals.map((rental) => (
              <li key={rental.key} className="card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    {rental.rowId ? (
                      <Link href={`${RENTER_BOOKINGS_PATH}#${rental.rowId}`} className="font-medium hover:underline">
                        {rental.name ?? "A rental"}
                      </Link>
                    ) : (
                      <p className="font-medium">{rental.name ?? "Wallet refund"}</p>
                    )}
                    {rental.startDate && rental.endDate && (
                      <p className="mt-1 text-xs text-ink-soft">
                        {formatDate(rental.startDate)} – {formatDate(rental.endDate)}
                      </p>
                    )}
                  </div>
                  <p className="font-medium">{formatMoney(rental.spentCents)}</p>
                </div>
                <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                  {rental.lines.map((line) => (
                    <li key={line.id} className="flex flex-wrap justify-between gap-3">
                      <span className="text-ink-soft">
                        {line.label} · {formatDateTime(line.date)}
                      </span>
                      <span className={line.cents < 0 ? "text-success" : undefined}>
                        {line.cents < 0 ? `+${formatMoney(-line.cents)}` : formatMoney(line.cents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </RenterPortal>
  );
}
