import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Heart, MessageCircle, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Container, ButtonLink, headerIconButton } from "./ui";
import { SiteNav } from "./site-nav";
import { AccountMenu } from "./account-menu";
import { MobileMenu } from "./mobile-menu";
import { CreateMenu } from "./create-menu";
import { signOut } from "@/app/auth/actions";
import { NewMessageToaster } from "./messages/new-message-toaster";
import { NotificationBell } from "./notifications/notification-bell";
import { getNotificationCounts } from "@/lib/api/notifications";
import { getOwnProfile } from "@/lib/profile";
import { defaultDashboardPath } from "@/lib/routes";

/**
 * The unread count for the bell, or null when it cannot be had. The header is
 * on every page, so a notifications outage must cost the badge, not the page.
 */
async function notificationCounts(): Promise<{ count: number; action_required: number } | null> {
  try {
    return await getNotificationCounts();
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
  const [counts, profile] = user ? await Promise.all([notificationCounts(), getOwnProfile()]) : [null, null];
  // The side onboarding would send the member to: their listings if they
  // only own, their rentals otherwise.
  const dashboardPath = defaultDashboardPath({
    wantsToRent: profile?.wants_to_rent ?? false,
    wantsToOwn: profile?.wants_to_own ?? false,
  });

  return (
    // Sticky, so the bell, messages and "+ New" stay in reach down long pages.
    // z-30 keeps it under modals and the location sheet (z-40/z-50).
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <Container className="flex h-16 items-center justify-between gap-6">
        <div className="flex h-full items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Package className="size-5 text-accent" aria-hidden="true" />
            <span className="heading text-lg">HobbyRentals</span>
          </Link>
          <SiteNav dashboardPath={user ? dashboardPath : null} />
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <CreateMenu />
              <NewMessageToaster />
              <span className="hidden h-6 w-px bg-line md:block" aria-hidden="true" />
              <div className="flex items-center gap-1">
                {/* Below sm these two are in the mobile menu instead. */}
                <Link href="/favourites" aria-label="Favourites" title="Favourites" className={`${headerIconButton} max-sm:hidden`}>
                  <Heart className="size-5" aria-hidden="true" />
                </Link>
                <Link href="/messages" aria-label="Messages" title="Messages" className={`${headerIconButton} max-sm:hidden`}>
                  <MessageCircle className="size-5" aria-hidden="true" />
                </Link>
                <NotificationBell
                  unreadCount={counts?.count ?? null}
                  actionRequiredCount={counts?.action_required ?? null}
                />
                <MobileMenu dashboardPath={dashboardPath} />
              </div>
              <AccountMenu name={profile?.display_name ?? null} email={user.email ?? ""} signOutAction={signOut} />
            </>
          ) : (
            <ButtonLink href="/login" className="h-9 py-0">Log in / Sign up</ButtonLink>
          )}
        </div>
      </Container>
    </header>
  );
}
