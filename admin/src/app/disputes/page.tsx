import type { Route } from "next";
import Link from "next/link";
import { requirePortalSession } from "@/lib/admin";
import { listDisputes } from "@/lib/disputes";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { Badge, Container, EmptyState, Panel } from "@/components/ui";

export const metadata = { title: "Disputes — HobbyRentals Admin" };

const FILTERS = [
  { key: "OPEN", label: "Open" },
  { key: "RESOLVED", label: "Resolved" },
] as const;

/**
 * S3-10: damage disputes owners raised on returned rentals. An open one
 * holds the rental's money - the owner's payout and the renter's deposit -
 * until it is decided here, so the oldest leads the queue.
 */
export default async function DisputesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePortalSession();
  const { status: statusParam } = await searchParams;
  const status = statusParam === "RESOLVED" ? "RESOLVED" : "OPEN";
  const { disputes, error } = await listDisputes(status);

  return (
    <Container className="py-12">
      <p className="eyebrow">Settlement</p>
      <h1 className="display-caps mt-3 text-3xl">Damage disputes</h1>

      <nav className="mt-6 flex gap-4 text-sm" aria-label="Dispute status">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={`${ROUTES.disputes}?status=${filter.key}` as Route}
            aria-current={status === filter.key ? "page" : undefined}
            className={status === filter.key ? "font-medium underline underline-offset-4" : "text-ink-soft hover:text-ink"}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        <Panel
          title={status === "OPEN" ? "Waiting on a decision" : "Decided"}
          description={error ?? `${disputes.length} dispute${disputes.length === 1 ? "" : "s"}.`}
        >
          {disputes.length === 0 ? (
            <div className="-mx-6 -my-5">
              <EmptyState
                title={status === "OPEN" ? "No open disputes" : "No resolved disputes"}
                body={status === "OPEN" ? "Every returned rental is either settled or still inside its claim window." : "Nothing has been decided yet."}
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {disputes.map((dispute) => (
                <li key={dispute.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={ROUTES.dispute(dispute.id)} className="font-medium underline-offset-4 hover:underline">
                      {dispute.listing_name ?? "A listing"}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {dispute.owner_name ?? "Owner"} vs {dispute.renter_name ?? "renter"} · reported {formatDateTime(dispute.created_at)}
                      {dispute.bundle_booking_id && " · bundle"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">Claimed {formatMoney(dispute.claimed_cents)}</span>
                    {dispute.status === "RESOLVED" ? (
                      <Badge tone={dispute.liable_party === "RENTER" ? "warning" : "positive"}>
                        {dispute.liable_party === "RENTER" ? `Renter liable · ${formatMoney(dispute.damage_cents ?? 0)}` : "Owner liable"}
                      </Badge>
                    ) : (
                      <Badge tone="critical">Open</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Container>
  );
}
