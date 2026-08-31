import Link from "next/link";
import { Container, ButtonLink } from "./ui";

const COLUMNS = [
  { title: "Marketplace", links: ["Cameras", "Camping", "Water sports", "Music", "Cycling"] },
  { title: "Renting", links: ["How it works", "Damage cover", "Owner payouts", "Trust & safety", "Help centre"] },
  { title: "Company", links: ["About", "Careers", "Journal", "Press", "Contact"] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-cream">
      <Container className="py-14">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div className="md:border-r md:border-white/15 md:pr-10">
            <p className="display-caps text-lg">HobbyRentals</p>
            <p className="mt-4 max-w-xs text-sm text-cream/70">
              A Singapore marketplace for the expensive things we only use a few weekends a year.
            </p>
            <ButtonLink
              href="/signup"
              variant="outline"
              className="mt-6 border-cream/40 text-cream hover:bg-white/10"
            >
              Get started
            </ButtonLink>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href="/" className="text-sm text-cream/70 transition-colors hover:text-cream">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright © 2026 HobbyRentals | All Rights Reserved</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-cream">Terms and Conditions</Link>
            <Link href="/" className="hover:text-cream">Privacy Policy</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
