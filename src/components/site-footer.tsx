import Link from "next/link";
import type { Route } from "next";
import { Container, ButtonLink } from "./ui";
import { helpPath } from "@/lib/help";
import { relatedCategoryHref } from "@/lib/browse-params";
import { CATEGORY_LABELS, type ListingCategory } from "@/lib/listings";

type FooterLink = { label: string; href: Route };

const FOOTER_CATEGORIES: ListingCategory[] = ["PHOTOGRAPHY_VIDEOGRAPHY", "CAMPING_OUTDOOR", "MUSIC_AUDIO", "POWER_TOOLS_DIY"];

/**
 * Every link here goes to a real page or a real anchor on one; the help
 * centre's slugs are stable by design (see lib/help), so linking into them is
 * safe. Add a page before adding its link.
 */
const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "All gear", href: "/browse" },
      ...FOOTER_CATEGORIES.map((category) => ({ label: CATEGORY_LABELS[category], href: relatedCategoryHref(category) as Route })),
      { label: "Bundles", href: "/bundles" },
      { label: "Community", href: "/community" },
    ],
  },
  {
    title: "Renting",
    links: [
      { label: "How it works", href: "/#how-it-works" as Route },
      { label: "Fees and payments", href: helpPath("fees") },
      { label: "Security deposit", href: helpPath("deposit") },
      { label: "Late returns", href: helpPath("overdue") },
      { label: "Cancellations", href: helpPath("cancellations") },
    ],
  },
  {
    title: "Owning",
    links: [
      { label: "List an item", href: "/listings/new" },
      { label: "What owners earn", href: helpPath("what-owners-earn") },
      { label: "HobbyShield", href: helpPath("hobbyshield") },
      { label: "Damage claims", href: helpPath("claims") },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help centre", href: helpPath() },
      { label: "Contact us", href: helpPath("contact-support") },
      { label: "Terms of use", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-dark text-white print:hidden">
      <Container className="py-14">
        <div className="grid gap-12 md:grid-cols-[1fr_2.5fr]">
          <div className="md:border-r md:border-white/15 md:pr-10">
            <p className="heading text-lg">HobbyRentals</p>
            <p className="mt-4 max-w-xs text-sm text-white/70">
              Hobby gear, rented from people nearby. Payments are held by us until the item is back.
            </p>
            <ButtonLink href="/listings/new" variant="outlineOnDark" className="mt-6">
              List an item
            </ButtonLink>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HobbyRentals · Singapore</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
