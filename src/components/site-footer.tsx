import Link from "next/link";
import { Container, ButtonLink } from "./ui";

const COLUMNS = [
  { title: "Marketplace", links: ["Cameras", "Camping", "Water sports", "Music", "Bundles"] },
  { title: "Trust & Security", links: ["Product Passport", "Escrow protection", "Guided handover", "Damage claims", "Community guidelines"] },
  { title: "For owners", links: ["Inventory management", "Dynamic pricing tools", "Owner insurance", "Handover rules", "Earnings estimator"] },
  { title: "For renters", links: ["How it works", "Trust & safety", "Help centre"] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-dark text-white">
      <Container className="py-14">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div className="md:border-r md:border-white/15 md:pr-10">
            <p className="heading text-lg">HobbyRentals</p>
            <p className="mt-4 max-w-xs text-sm text-white/70">
              Extending product utilisation through trusted peer-to-peer hobby gear rentals.
            </p>
            <ButtonLink href="/signup" variant="outlineOnDark" className="mt-6">
              Get started
            </ButtonLink>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em]">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href="/" className="text-sm text-white/70 transition-colors hover:text-white">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 HobbyRentals · Singapore</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white">Terms and Conditions</Link>
            <Link href="/" className="hover:text-white">Privacy Policy</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
