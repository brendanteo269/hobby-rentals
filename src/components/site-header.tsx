import Link from "next/link";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import { Container, ButtonLink } from "./ui";
import { signOut } from "@/app/auth/actions";

const NAV: { label: string; href: Route }[] = [
  { label: "Marketplace", href: "/" },
  { label: "Start Renting!", href: "/" },
  { label: "About", href: "/" },
  { label: "Contact", href: "/" },
];

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-line bg-cream">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="display-caps text-lg tracking-wide">
          HobbyRentals
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
                Dashboard
              </Link>
              <form action={signOut}>
                <button type="submit" className="text-sm text-ink-soft transition-colors hover:text-ink">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <ButtonLink href="/login" className="px-4 py-2 text-xs">
              Log in / Sign up
            </ButtonLink>
          )}
        </div>
      </Container>
    </header>
  );
}
