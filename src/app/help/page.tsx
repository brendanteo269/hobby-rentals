import type { Metadata } from "next";
import Link from "next/link";
import { HashTargetHighlight } from "@/components/hash-target-highlight";
import { Container } from "@/components/ui";
import { HELP_TOPICS, helpPath, type HelpBlock } from "@/lib/help";

export const metadata: Metadata = {
  title: "Help centre — HobbyRentals",
  description: "Fees, deposits, damage protection, HobbyShield, late returns, damage claims and cancellations on HobbyRentals.",
};

function Block({ block }: { block: HelpBlock }) {
  if (typeof block === "string") return <p className="body-copy">{block}</p>;
  return (
    <ul className="body-copy list-disc space-y-1.5 pl-5">
      {block.list.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * The help centre. Public, so a visitor can read the rules before signing up,
 * and rendered on the server from lib/help. Every section carries its slug as
 * an id: the assistant links answers to /help#<slug>, and the section it
 * names is highlighted on arrival.
 */
export default function HelpPage() {
  // Optional: without it the contact section still says where to go, just not by email.
  const supportEmail = process.env.SUPPORT_EMAIL;

  return (
    <Container className="py-16">
      <HashTargetHighlight />
      <p className="eyebrow">Help centre</p>
      <h1 className="heading mt-2 text-3xl">How HobbyRentals works</h1>
      <p className="body-copy mt-3 max-w-2xl">
        Fees, deposits, protection, late returns, claims and cancellations: what each one costs and what happens when.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Help topics" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {HELP_TOPICS.map((topic) => (
              <li key={topic.id}>
                <Link href={helpPath(topic.id)} className="text-sm text-ink-soft transition-colors hover:text-ink">
                  {topic.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href={helpPath("contact-support")} className="text-sm text-ink-soft transition-colors hover:text-ink">
                Contact support
              </Link>
            </li>
          </ul>
        </nav>

        <div className="space-y-12">
          {HELP_TOPICS.map((topic) => (
            <section key={topic.id} id={topic.id} aria-labelledby={`${topic.id}-title`} className="scroll-mt-24">
              <h2 id={`${topic.id}-title`} className="heading text-2xl">{topic.title}</h2>
              <p className="body-copy mt-1">{topic.summary}</p>
              <div className="mt-5 space-y-4">
                {topic.sections.map((section) => (
                  <article
                    key={section.slug}
                    id={section.slug}
                    className="scroll-mt-24 card space-y-3 p-6 transition-[border-color,box-shadow] data-[hash-target]:border-accent data-[hash-target]:ring-2 data-[hash-target]:ring-accent/30"
                  >
                    <h3 className="heading text-lg">
                      <a href={`#${section.slug}`} className="hover:underline">{section.title}</a>
                    </h3>
                    {section.body.map((block, index) => (
                      <Block key={index} block={block} />
                    ))}
                  </article>
                ))}
              </div>
            </section>
          ))}

          <section
            id="contact-support"
            aria-labelledby="contact-support-title"
            className="scroll-mt-24 card space-y-3 p-6 transition-[border-color,box-shadow] data-[hash-target]:border-accent data-[hash-target]:ring-2 data-[hash-target]:ring-accent/30"
          >
            <h2 id="contact-support-title" className="heading text-2xl">Contact support</h2>
            <p className="body-copy">
              For a problem with a booking, message the other member from the booking first: most things are sorted out fastest that way. Damage
              disagreements go through a damage claim, where an administrator decides.
            </p>
            {supportEmail && (
              <p className="body-copy">
                For anything else, email{" "}
                <a href={`mailto:${supportEmail}`} className="font-medium text-ink underline underline-offset-2">
                  {supportEmail}
                </a>
                .
              </p>
            )}
          </section>
        </div>
      </div>
    </Container>
  );
}
