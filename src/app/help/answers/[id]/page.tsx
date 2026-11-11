import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { getHelpAnswer } from "@/lib/api/help-answers";
import { helpPath } from "@/lib/help";

type Params = { params: Promise<{ id: string }> };

// Answers fill gaps in the help centre; search engines should send people to the help centre itself.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const answer = await getHelpAnswer(id).catch(() => null);
  return {
    title: `${answer?.title ?? "Answer"} — HobbyRentals Help`,
    robots: { index: false, follow: true },
  };
}

/**
 * S6-08 Scenario 3: an answer HobbyRentals staff wrote after the chat
 * assistant answered a question badly. The assistant uses it as a source and
 * cites it here, as it cites /help sections. Plain text only: nothing in it
 * is rendered as HTML.
 */
export default async function HelpAnswerPage({ params }: Params) {
  const { id } = await params;
  const answer = await getHelpAnswer(id);
  if (!answer) notFound();
  const updated = new Date(answer.updated_at).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Container className="max-w-3xl py-16">
      <Link href={helpPath()} className="text-sm text-ink-soft transition-colors hover:text-ink">
        ← Help centre
      </Link>
      <p className="eyebrow mt-6">Answer from the HobbyRentals team</p>
      <h1 className="heading mt-2 text-3xl">{answer.title}</h1>
      {answer.question !== answer.title && <p className="body-copy mt-3 italic">“{answer.question}”</p>}

      <article className="card mt-8 p-6">
        <p className="body-copy whitespace-pre-line text-ink">{answer.answer}</p>
        <p className="mt-4 text-xs text-ink-soft">Checked by the HobbyRentals team · updated {updated}</p>
      </article>

      {answer.related.length > 0 && (
        <section className="mt-10">
          <h2 className="heading text-xl">In the help centre</h2>
          <ul className="mt-3 space-y-2">
            {answer.related.map((section) => (
              <li key={section.slug}>
                <Link href={section.href as Route} className="text-sm text-accent hover:underline">
                  {section.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="body-copy mt-10 text-sm">
        Still stuck?{" "}
        <Link href={helpPath("contact-support")} className="underline">
          Contact support
        </Link>
        .
      </p>
    </Container>
  );
}
