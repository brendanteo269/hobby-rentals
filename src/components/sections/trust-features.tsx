import { Container } from "@/components/ui";
import { ArrowRight, BadgeCheck, CreditCard, Landmark, ShieldCheck, type LucideIcon } from "lucide-react";
import { CLAIM_WINDOW_HOURS } from "@/lib/help";

type TrustFeature = { step: string; icon: LucideIcon; title: string; pill: string; body: string; detail: string; flow: [LucideIcon, LucideIcon, LucideIcon]; tone: "success" | "info" | "warning" };

const FEATURES: TrustFeature[] = [
  { step: "01", icon: ShieldCheck, title: "Escrow Reservation", pill: "Held by us", body: "Rental fees and deposits are held by the platform, never sent directly to another member.", detail: "Your funds remain protected while both sides prepare for the handover.", flow: [CreditCard, ShieldCheck, BadgeCheck], tone: "success" },
  { step: "02", icon: BadgeCheck, title: "Product Passport Check-in", pill: "Photo record", body: "Guided baseline photos and identity evidence create a durable, shared condition record.", detail: "The original condition trail stays available throughout the rental.", flow: [BadgeCheck, ArrowRight, ShieldCheck], tone: "info" },
  { step: "03", icon: Landmark, title: "Verified Return & Release", pill: `${CLAIM_WINDOW_HOURS}h claim window`, body: "After return, the platform records settlement and the owner’s net payout transparently.", detail: `A ${CLAIM_WINDOW_HOURS}-hour claim window protects both parties before funds are captured or released.`, flow: [ShieldCheck, ArrowRight, Landmark], tone: "warning" },
];

const toneClasses = {
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
};

/**
 * Three permanent, stable steps through the rental protection journey.
 * Carries the #how-it-works anchor the footer links to.
 */
export function TrustFeatures() {
  return (
    <Container className="pt-20">
      <section id="how-it-works" className="scroll-mt-24 rounded-3xl bg-surface-muted px-8 py-14 sm:px-14">
        <p className="eyebrow text-center">How HobbyRentals protects you</p>
        <h2 className="heading mt-3 text-center text-2xl sm:text-3xl">A clear path from reservation to return</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const [Start, Middle, End] = feature.flow;
            return (
              // Arrive 01 -> 02 -> 03 when the surrounding Reveal scrolls in.
              <li
                key={feature.step}
                style={{ transitionDelay: `${150 + index * 120}ms` }}
                className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 transition-[opacity,translate] duration-500 ease-out group-data-[reveal=hidden]/reveal:translate-y-3 group-data-[reveal=hidden]/reveal:opacity-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex size-11 items-center justify-center rounded-xl ${toneClasses[feature.tone]}`}>
                    <feature.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-line px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-soft">{feature.pill}</span>
                </div>
                <p className="mt-5 text-xs font-bold tracking-[0.18em] text-ink-soft/70">{feature.step}</p>
                <h3 className="heading mt-2 text-base">{feature.title}</h3>
                <p className="body-copy mt-3">{feature.body}</p>
                <div className="mt-auto flex items-center gap-2 pt-5 text-ink-soft" aria-hidden="true">
                  <Start className="size-4" />
                  <ArrowRight className="size-3" />
                  <Middle className="size-4" />
                  <ArrowRight className="size-3" />
                  <End className="size-4" />
                </div>
                <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">{feature.detail}</p>
              </li>
            );
          })}
        </ol>
      </section>
    </Container>
  );
}
