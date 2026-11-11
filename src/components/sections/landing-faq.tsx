import Link from "next/link";
import { Plus } from "lucide-react";
import { Container } from "@/components/ui";
import { HelpBlock } from "@/components/help-block";
import { HELP_SECTIONS, helpPath } from "@/lib/help";

/**
 * The questions shown, keyed by help section slug. Answers are the help
 * centre's own copy, so the two never disagree; only the question wording
 * lives here.
 */
const QUESTIONS: { slug: string; question: string }[] = [
  { slug: "what-renters-pay", question: "What do I pay when I book?" },
  { slug: "deposit-return", question: "When do I get my deposit back?" },
  { slug: "damage-protection-cover", question: "What if I damage something?" },
  { slug: "late-return-fees", question: "What happens if I return something late?" },
  { slug: "cancellation-refunds", question: "Can I cancel a booking?" },
];

const FAQ = QUESTIONS.flatMap(({ slug, question }) => {
  const section = HELP_SECTIONS.find((s) => s.slug === slug);
  return section ? [{ ...section, question }] : [];
});

/** Renter FAQ on the homepage, answered from lib/help. */
export function LandingFaq() {
  return (
    <Container className="pt-20">
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <h2 className="heading text-2xl sm:text-3xl">Common questions</h2>
          <p className="body-copy mt-3 max-w-xs">
            Fees, deposits and claims are all covered in the{" "}
            <Link href={helpPath()} className="font-medium text-ink underline underline-offset-2">
              help centre
            </Link>
            .
          </p>
        </div>

        <div className="border-t border-line">
          {FAQ.map((item) => (
            <details key={item.slug} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent/40 [&::-webkit-details-marker]:hidden">
                {item.question}
                <Plus className="size-4 shrink-0 text-ink-soft transition-transform group-open:rotate-45" aria-hidden="true" />
              </summary>
              <div className="space-y-3 pb-6 pr-8">
                {item.body.map((block, index) => (
                  <HelpBlock key={index} block={block} />
                ))}
                <Link href={helpPath(item.slug)} className="inline-block text-sm font-medium text-ink underline underline-offset-2">
                  Read more
                </Link>
              </div>
            </details>
          ))}
        </div>
      </div>
    </Container>
  );
}
