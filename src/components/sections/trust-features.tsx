import { Container } from "@/components/ui";
import { ShieldCheck, BadgeCheck, RotateCcw, type LucideIcon } from "lucide-react";

type TrustFeature = { icon: LucideIcon; title: string; body: string };

const FEATURES: TrustFeature[] = [
  {
    icon: ShieldCheck,
    title: "Escrow-protected payments",
    body: "Your rental fee and deposit are held securely by the platform — never wired straight to a stranger.",
  },
  {
    icon: BadgeCheck,
    title: "Guided condition Passport",
    body: "Inspect and snap guided photos at pickup. Every item carries an append-only digital condition history.",
  },
  {
    icon: RotateCcw,
    title: "Fast return & payout",
    body: "Return the gear, compare its condition, and receive a fast deposit release after a clean handover.",
  },
];

/** Explains the platform's trust mechanics: escrow, condition Passport, payout. */
export function TrustFeatures() {
  return (
    <Container className="pt-20">
      <div className="rounded-3xl bg-surface-muted px-8 py-14 sm:px-14">
        <p className="eyebrow text-center">How HobbyRentals protects you</p>
        <h2 className="heading mt-3 text-center text-2xl sm:text-3xl">Built for worry-free handover</h2>
        <ul className="mt-10 grid gap-10 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="rounded-2xl border border-line bg-white p-6">
              <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
                <feature.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="heading mt-4 text-sm">{feature.title}</h3>
              <p className="body-copy mt-2">{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
