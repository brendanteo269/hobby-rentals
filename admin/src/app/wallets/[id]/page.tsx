import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/admin";
import { ROUTES } from "@/lib/routes";
import { getUserAuditTrail, AUDIT_PAGE_SIZE } from "@/lib/audit";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getWallet, getWalletTransactions, walletOwnerLabel, type TransactionType, TRANSACTION_PAGE_SIZE } from "@/lib/wallets";
import { Container, Panel } from "@/components/ui";
import { TransactionHistory } from "@/components/transaction-history";
import { TransactionFilters } from "@/components/transaction-filters";
import { WalletAdjustmentForm } from "@/components/wallet-adjustment-form";
import { Pagination } from "@/components/pagination";
import { AuditTrail } from "@/components/audit-trail";

export const metadata = { title: "Wallet — HobbyRentals Admin" };

export default async function WalletDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; search?: string; type?: string; auditPage?: string }>;
}) {
  await requirePortalSession();
  const { id } = await params;
  const { page: pageParam, search = "", type = "", auditPage: auditPageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const auditPage = Math.max(1, Number(auditPageParam) || 1);

  const wallet = await getWallet(id);
  // Covers both a malformed id and one that does not exist, same as the
  // account detail page — the two are not distinguished.
  if (!wallet) notFound();

  const [{ transactions, total: transactionCount }, { entries: auditEntries, total: auditTotal }] = await Promise.all([
    getWalletTransactions(wallet.id, page, search, type as TransactionType | ""),
    getUserAuditTrail(wallet.user_id, auditPage),
  ]);

  const lastPage = Math.max(1, Math.ceil(transactionCount / TRANSACTION_PAGE_SIZE));
  const auditLastPage = Math.max(1, Math.ceil(auditTotal / AUDIT_PAGE_SIZE));
  const totalBalance = wallet.available_balance_cents + wallet.held_balance_cents;
  const isFiltered = Boolean(search || type);

  return (
    <Container className="py-12">
      <Link href={ROUTES.wallets} className="text-sm text-ink-soft transition-colors hover:text-ink">
        ← All wallets
      </Link>

      <div className="mt-6">
        <p className="eyebrow">Wallet</p>
        <h1 className="display-caps mt-3 text-3xl">{walletOwnerLabel(wallet)}</h1>
        <p className="body-copy mt-2">{wallet.email ?? "No email address"}</p>
      </div>

      {/*
        Balances and transaction history each get the full page width rather
        than sharing a column with the sidebar — a 6-column ledger table
        squeezed into two-thirds of the page is exactly what was forcing a
        horizontal scrollbar even on an ordinary desktop window.
      */}
      <div className="mt-10 space-y-6">
        <Panel title="Balances">
          <div className="grid gap-6 sm:grid-cols-3">
            <Stat label="Available balance" cents={wallet.available_balance_cents} note="Spendable, or eligible for a manual adjustment" />
            <Stat label="Held balance" cents={wallet.held_balance_cents} note="Locked for active bookings" />
            <Stat label="Total balance" cents={totalBalance} note="Available plus held" />
          </div>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-4 text-xs text-ink-soft">
            <div className="flex gap-1.5">
              <dt>Wallet ID</dt>
              <dd>
                <code>{wallet.id}</code>
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Created</dt>
              <dd>{formatDateTime(wallet.created_at)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel
          title="Transaction history"
          description={
            transactionCount === 0
              ? isFiltered
                ? "No transactions match these filters."
                : "No transactions yet."
              : `${transactionCount} transaction${transactionCount === 1 ? "" : "s"}${isFiltered ? " matching these filters" : ""}.`
          }
        >
          <div className="mb-6">
            <TransactionFilters search={search} type={type} />
          </div>
          <TransactionHistory transactions={transactions} />
        </Panel>
        <Pagination
          page={page}
          lastPage={lastPage}
          hrefForPage={(p) => hrefForTransactionPage(wallet.id, search, type, p)}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WalletAdjustmentForm walletId={wallet.id} />
          </div>
          <AuditTrail
            entries={auditEntries}
            page={auditPage}
            lastPage={auditLastPage}
            hrefForPage={(p) => hrefForAuditPage(wallet.id, page, search, type, p)}
          />
        </div>
      </div>
    </Container>
  );
}

function Stat({ label, cents, note }: { label: string; cents: number; note: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-2xl font-medium">{formatMoney(cents)}</p>
      <p className="body-copy mt-1">{note}</p>
    </div>
  );
}

function hrefForTransactionPage(walletId: string, search: string, type: string, page: number): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (type) params.set("type", type);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${ROUTES.wallet(walletId)}?${query}` : ROUTES.wallet(walletId);
}

/** Preserves the transaction table's own page/search/type while paging the audit trail — the two lists paginate independently. */
function hrefForAuditPage(walletId: string, page: number, search: string, type: string, auditPage: number): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (type) params.set("type", type);
  if (page > 1) params.set("page", String(page));
  if (auditPage > 1) params.set("auditPage", String(auditPage));
  const query = params.toString();
  return query ? `${ROUTES.wallet(walletId)}?${query}` : ROUTES.wallet(walletId);
}
