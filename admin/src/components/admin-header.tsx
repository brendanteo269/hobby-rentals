import Link from "next/link";
import { Container } from "./ui";
import { getAdminUser } from "@/lib/admin";
import { signOut } from "@/app/auth/actions";

/**
 * Portal chrome. Renders nothing for signed-out or non-admin visitors, so the
 * login and refusal pages do not frame themselves as part of a console the
 * viewer cannot use.
 */
export async function AdminHeader() {
  const admin = await getAdminUser();
  if (!admin) return null;

  return (
    <header className="border-b border-line bg-cream">
      <Container className="flex h-16 items-center justify-between gap-6">
        <div className="flex items-baseline gap-6">
          <Link href="/users" className="display-caps text-lg tracking-wide">
            HobbyRentals
          </Link>
          <span className="eyebrow hidden sm:inline">Admin</span>
        </div>

        <nav className="flex items-center gap-6" aria-label="Admin sections">
          <Link href="/users" className="text-sm text-ink-soft transition-colors hover:text-ink">
            Users
          </Link>
          <span className="hidden text-sm text-ink-soft md:inline">{admin.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </nav>
      </Container>
    </header>
  );
}
