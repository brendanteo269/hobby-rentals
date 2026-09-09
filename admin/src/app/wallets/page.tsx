import { requirePortalSession } from "@/lib/admin";
import { searchWallets, PAGE_SIZE } from "@/lib/wallets";
import { ROUTES } from "@/lib/routes";
import { Container, Panel } from "@/components/ui";
import { WalletSearch } from "@/components/wallet-search";
import { WalletTable } from "@/components/wallet-table";
import { Pagination } from "@/components/pagination";

export const metadata = { title: "Wallet management — HobbyRentals Admin" };

export default async function WalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  // The proxy already turned away anyone without the portal password.
  // Repeated here for the same reason as every other page: a page that reads
  // wallet data should not depend on middleware having run.
  await requirePortalSession();

  const { q = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { wallets, total, error } = await searchWallets(q, page);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const description = error
    ? error
    : total === 0
      ? "No wallets match this search."
      : `${total} wallet${total === 1 ? "" : "s"}${q ? " matching this search" : ""}.`;

  return (
    <Container className="py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display-caps mt-3 text-3xl">Wallet management</h1>

      <div className="mt-8">
        <WalletSearch query={q} />
      </div>

      <div className="mt-8">
        <Panel title="Wallets" description={description}>
          <div className="-mx-6 -my-5">
            <WalletTable wallets={wallets} />
          </div>
        </Panel>
      </div>

      <Pagination page={page} lastPage={lastPage} hrefForPage={(p) => hrefForWalletsPage(q, p)} />
    </Container>
  );
}

function hrefForWalletsPage(q: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${ROUTES.wallets}?${search}` : ROUTES.wallets;
}
