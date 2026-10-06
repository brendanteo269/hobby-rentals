import { Container } from "@/components/ui";
import { ArrowRight, BadgeCheck, CreditCard, Landmark, ShieldCheck, type LucideIcon } from "lucide-react";

type TrustFeature = { step: string; icon: LucideIcon; title: string; pill: string; body: string; detail: string; flow: [LucideIcon, LucideIcon, LucideIcon]; tone: "emerald" | "indigo" | "amber" };

const FEATURES: TrustFeature[] = [
  { step: "01", icon: ShieldCheck, title: "Escrow Reservation", pill: "Locked in Vault", body: "Rental fees and deposits are held by the platform, never sent directly to another member.", detail: "Your funds remain protected while both sides prepare for the handover.", flow: [CreditCard, ShieldCheck, BadgeCheck], tone: "emerald" },
  { step: "02", icon: BadgeCheck, title: "Product Passport Check-in", pill: "Append-Only Ledger", body: "Guided baseline photos and identity evidence create a durable, shared condition record.", detail: "The original condition trail stays available throughout the rental.", flow: [BadgeCheck, ArrowRight, ShieldCheck], tone: "indigo" },
  { step: "03", icon: Landmark, title: "Verified Return & Release", pill: "24h Release Window", body: "After return, the platform records settlement and the owner’s net payout transparently.", detail: "A 24-hour claim window protects both parties before funds are captured or released.", flow: [ShieldCheck, ArrowRight, Landmark], tone: "amber" },
];

const toneClasses = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
};

/** Three permanent, stable steps through the rental protection journey. */
export function TrustFeatures() {
  return (
    <Container className="pt-20">
      <div className="rounded-3xl bg-surface-muted px-8 py-14 sm:px-14">
        <p className="eyebrow text-center">How HobbyRentals protects you</p>
        <h2 className="heading mt-3 text-center text-2xl sm:text-3xl">A clear path from reservation to return</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
          {FEATURES.map((feature) => {
            const [Start, Middle, End] = feature.flow;
            return <li key={feature.step} className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"><div className="flex items-start justify-between gap-3"><span className={`flex size-11 items-center justify-center rounded-xl ring-1 ${toneClasses[feature.tone]}`}><feature.icon className="size-5" aria-hidden="true" /></span><span className="rounded-full border border-zinc-200 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-zinc-600">{feature.pill}</span></div><p className="mt-5 text-xs font-bold tracking-[0.18em] text-zinc-400">{feature.step}</p><h3 className="heading mt-2 text-base">{feature.title}</h3><p className="body-copy mt-3">{feature.body}</p><div className="mt-auto flex items-center gap-2 pt-5 text-zinc-500"><Start className="size-4" aria-hidden="true" /><ArrowRight className="size-3" aria-hidden="true" /><Middle className="size-4" aria-hidden="true" /><ArrowRight className="size-3" aria-hidden="true" /><End className="size-4" aria-hidden="true" /></div><p className="mt-4 border-t border-zinc-100 pt-4 text-sm leading-relaxed text-zinc-600">{feature.detail}</p></li>;
          })}
        </ol>
      </div>
    </Container>
  );
}
