import Link from "next/link";
import { Container } from "@/components/ui";
import { HelpBlock } from "@/components/help-block";
import { helpPath, type HelpSection } from "@/lib/help";

/**
 * Layout for /terms and /privacy: a contents list beside numbered sections.
 * Sections use the help centre's shape, so a slug doubles as the anchor.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  /** Shown as "Last updated …"; bump it whenever the text changes. */
  updated: string;
  intro: string;
  sections: HelpSection[];
}) {
  return (
    <Container className="py-16">
      <p className="eyebrow">Last updated {updated}</p>
      <h1 className="heading mt-2 text-3xl">{title}</h1>
      <p className="body-copy mt-3 max-w-2xl">{intro}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Contents" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="space-y-1.5">
            {sections.map((section, index) => (
              <li key={section.slug}>
                <a href={`#${section.slug}`} className="text-sm text-ink-soft transition-colors hover:text-ink">
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="max-w-2xl space-y-10">
          {sections.map((section, index) => (
            <section key={section.slug} id={section.slug} className="scroll-mt-24 space-y-3">
              <h2 className="heading text-lg">
                {index + 1}. {section.title}
              </h2>
              {section.body.map((block, blockIndex) => (
                <HelpBlock key={blockIndex} block={block} />
              ))}
            </section>
          ))}
          <p className="body-copy border-t border-line pt-6">
            Questions about this page? See the{" "}
            <Link href={helpPath("contact-support")} className="font-medium text-ink underline underline-offset-2">
              help centre
            </Link>
            .
          </p>
        </div>
      </div>
    </Container>
  );
}
