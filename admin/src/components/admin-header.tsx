import Link from "next/link";
import { Container } from "./ui";
import { hasPortalSession } from "@/lib/portal-auth";
import { leavePortal } from "@/app/auth/actions";
import { ROUTES } from "@/lib/routes";

/**
 * Portal chrome. Renders nothing until the password has been entered, so the
 * login page does not frame itself as part of a console the viewer is not yet
 * inside.
 */
export async function AdminHeader() {
  if (!(await hasPortalSession())) return null;

  return (
    <header className="border-b border-line bg-cream">
      <Container className="flex h-16 items-center justify-between gap-6">
        <div className="flex items-baseline gap-6">
          <Link href={ROUTES.users} className="display-caps text-lg tracking-wide">
            HobbyRentals
          </Link>
          <span className="eyebrow hidden sm:inline">Admin</span>
        </div>

        <nav className="flex items-center gap-6" aria-label="Admin sections">
          <Link
            href={ROUTES.users}
            className="text-sm text-ink-soft transition-colors hover:text-ink"
          >
            Users
          </Link>
          <Link
            href={ROUTES.wallets}
            className="text-sm text-ink-soft transition-colors hover:text-ink"
          >
            Wallets
          </Link>
          <form action={leavePortal}>
            <button
              type="submit"
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Leave portal
            </button>
          </form>
        </nav>
      </Container>
    </header>
  );
}
