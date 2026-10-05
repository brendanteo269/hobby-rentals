import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Container, ButtonLink } from "./ui";
import { SiteNav } from "./site-nav";
import { AccountMenu } from "./account-menu";
import { signOut } from "@/app/auth/actions";
import { NotificationBell } from "./notifications/notification-bell";
import { getUnreadNotificationCount } from "@/lib/api/notifications";

/**
 * The unread count for the bell, or null when it cannot be had. The header is
 * on every page, so a notifications outage must cost the badge, not the page.
 */
async function unreadCount(): Promise<number | null> {
  try {
    return await getUnreadNotificationCount();
  } catch (error) {
    // A redirect (the session ended) is Next's control flow, not a failure.
    unstable_rethrow(error);
    console.error("Unread notification count failed:", error);
    return null;
  }
}

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const count = user ? await unreadCount() : null;

  return (
    <header className="border-b border-line bg-white">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Package className="size-5 text-accent" aria-hidden="true" />
          <span className="heading text-lg">HobbyRentals</span>
        </Link>

        <SiteNav />

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/messages" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
                Messages
              </Link>
              <Link href="/listings/mine" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
                My listings
              </Link>
              {/* Outline rather than a second accent button: two filled
                  buttons side by side read as two primary actions and make
                  the header fight for attention. Listing is the common one. */}
              <ButtonLink href="/listings/mine/bundles/new" className="hidden sm:flex">
                + New Bundle
              </ButtonLink>
              <ButtonLink href="/listings/new" className="hidden sm:flex">
                + New Listing
              </ButtonLink>
              <NotificationBell unreadCount={count} />
              <AccountMenu initial={(user.email ?? "?").charAt(0)} signOutAction={signOut} />
            </>
          ) : (
            <ButtonLink href="/login">Log in / Sign up</ButtonLink>
          )}
        </div>
      </Container>
    </header>
  );
}
