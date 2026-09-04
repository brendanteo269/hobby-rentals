import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { searchUsers, PAGE_SIZE } from "@/lib/users";
import { Container, Panel } from "@/components/ui";
import { UserSearch } from "@/components/user-search";
import { UserTable } from "@/components/user-table";

export const metadata = { title: "User management — HobbyRentals Admin" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  // The proxy already turned away anyone without the role. Repeated here
  // because a page that reads account data should not depend on middleware
  // having run — a matcher change is one edit away from silently exposing it.
  await requireAdmin();

  const { q = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { users, total, error } = await searchUsers(q, page);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const description = error
    ? error
    : total === 0
      ? "No accounts match this search."
      : `${total} account${total === 1 ? "" : "s"}${q ? " matching this search" : ""}.`;

  return (
    <Container className="py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display-caps mt-3 text-3xl">User management</h1>

      <div className="mt-8">
        <UserSearch query={q} />
      </div>

      <div className="mt-8">
        <Panel title="Accounts" description={description}>
          <div className="-mx-6 -my-5">
            <UserTable users={users} />
          </div>
        </Panel>
      </div>

      {lastPage > 1 && (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          <PageLink q={q} page={page - 1} disabled={page <= 1}>
            ← Previous
          </PageLink>
          <span className="text-sm text-ink-soft">
            Page {page} of {lastPage}
          </span>
          <PageLink q={q} page={page + 1} disabled={page >= lastPage}>
            Next →
          </PageLink>
        </nav>
      )}
    </Container>
  );
}

/** A disabled control is rendered as text, so it cannot be tabbed to or followed. */
function PageLink({
  q,
  page,
  disabled,
  children,
}: {
  q: string;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) return <span className="text-sm text-stone">{children}</span>;

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();

  return (
    <Link
      href={search ? `/users?${search}` : "/users"}
      className="text-sm text-ink-soft transition-colors hover:text-ink"
    >
      {children}
    </Link>
  );
}
