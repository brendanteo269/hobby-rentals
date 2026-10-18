import type { Route } from "next";
import { redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { PAGE_SIZE, parseDateParam, searchEscrowHolds } from "@/lib/escrow";
import { ROUTES } from "@/lib/routes";
import { Container, Panel } from "@/components/ui";
import { EscrowSearch } from "@/components/escrow-search";
import { EscrowTable } from "@/components/escrow-table";
import { Pagination } from "@/components/pagination";

export const metadata = { title: "Escrow — HobbyRentals Admin" };

/**
 * S3-15: search escrow records across all rentals by booking, user account or
 * date range, and jump into one to inspect it. Read-only - nothing here moves
 * money or changes a booking's outcome; manual override is its own story.
 */
export default async function EscrowPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  // The proxy already turned away anyone without the portal password.
  // Repeated here because a page that reads financial data should not depend
  // on middleware having run - a matcher change is one edit away from
  // silently exposing it.
  await requirePortalSession();

  const { q = "", from: fromParam, to: toParam, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  // A malformed date in a hand-edited URL is treated as no filter rather than reaching the RPC.
  const from = parseDateParam(fromParam) ?? "";
  const to = parseDateParam(toParam) ?? "";

  const { records, total, error } = await searchEscrowHolds(q, from || null, to || null, page);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A page past the end of the result set (a bookmarked or shared link whose
  // matches have since shrunk) would otherwise render as a false "no
  // records match this search" - send it back to the real last page instead.
  if (page > lastPage) redirect(hrefForEscrowPage(q, from, to, lastPage) as Route);

  const filtered = Boolean(q || from || to);
  const description = error
    ? error
    : total === 0
      ? "No escrow records match this search."
      : `${total} escrow record${total === 1 ? "" : "s"}${filtered ? " matching this search" : ""}.`;

  return (
    <Container className="py-12">
      <p className="eyebrow">Finances</p>
      <h1 className="display-caps mt-3 text-3xl">Escrow</h1>

      <div className="mt-8">
        <EscrowSearch query={q} from={from} to={to} />
      </div>

      <div className="mt-8">
        <Panel title="Escrow records" description={description}>
          <div className="-mx-6 -my-5">
            <EscrowTable records={records} />
          </div>
        </Panel>
      </div>

      <Pagination page={page} lastPage={lastPage} hrefForPage={(p) => hrefForEscrowPage(q, from, to, p)} />
    </Container>
  );
}

function hrefForEscrowPage(q: string, from: string, to: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${ROUTES.escrow}?${search}` : ROUTES.escrow;
}
