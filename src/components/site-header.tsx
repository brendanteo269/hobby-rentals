import Link from "next/link";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Container, ButtonLink } from "./ui";
import { SiteNav } from "./site-nav";
import { AccountMenu } from "./account-menu";
import { signOut } from "@/app/auth/actions";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
              <Link href="/listings/mine" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
                My listings
              </Link>
              <ButtonLink href="/listings/new" className="hidden sm:flex">
                + New listing
              </ButtonLink>
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
