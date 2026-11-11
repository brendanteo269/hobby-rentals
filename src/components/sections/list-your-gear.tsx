import Link from "next/link";
import { Container, ButtonLink } from "@/components/ui";
import { CLAIM_WINDOW_HOURS, PLATFORM_FEE_BPS, helpPath, percent } from "@/lib/help";

/**
 * The owner pitch. Every figure comes from lib/help, which mirrors the
 * backend's settings, so this banner cannot quote a fee or payout timing the
 * platform does not actually charge.
 */
const TERMS = [
  { term: "Your price", detail: "Set a daily rate, a weekly rate or both, plus the deposit you want held." },
  { term: `${percent(PLATFORM_FEE_BPS)} commission`, detail: "Taken out of the rental price when you're paid. Renter fees and deposits aren't touched." },
  { term: "Paid after return", detail: `The money reaches your wallet ${CLAIM_WINDOW_HOURS} hours after the item comes back, if no damage is reported.` },
];

/** Owner call to action near the foot of the homepage. */
export function ListYourGear() {
  return (
    <Container className="pt-20">
      <div className="grid gap-10 rounded-3xl bg-dark px-8 py-12 text-white sm:px-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
        <div>
          <p className="eyebrow text-white/60">For owners</p>
          <h2 className="heading mt-3 text-2xl sm:text-3xl">Rent out the gear you&apos;re not using</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
            That tent you use twice a year can cover its own cost. You accept each request yourself, and
            every return is checked against the photos you took when you listed it.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href="/listings/new">List an item</ButtonLink>
            <Link href={helpPath("what-owners-earn")} className="text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white">
              How payouts work
            </Link>
          </div>
        </div>

        <dl className="divide-y divide-white/15 border-y border-white/15">
          {TERMS.map(({ term, detail }) => (
            <div key={term} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-sm font-semibold">{term}</dt>
              <dd className="text-sm text-white/70">{detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Container>
  );
}
