import { formatDate } from "@/lib/format";
import type { PublicQuestion } from "@/lib/listing-questions";

/**
 * S5-07 Scenario 3: questions renters asked that the owner answered and chose
 * to show. Renters are never named. Nothing is shown when there are none.
 */
export function ListingQuestionsSection({ questions }: { questions: PublicQuestion[] }) {
  if (questions.length === 0) return null;
  return (
    <section id="questions" className="mt-16 scroll-mt-24 border-t border-line pt-10">
      <h2 className="heading text-lg">Questions and answers</h2>
      <p className="body-copy mt-1">Answered by the owner.</p>
      <dl className="mt-6 space-y-5">
        {questions.map((item) => (
          <div key={`${item.published_at}-${item.question}`} className="card p-5">
            <dt className="font-medium text-ink">Q: {item.question}</dt>
            <dd className="body-copy mt-2 whitespace-pre-line">A: {item.answer}</dd>
            <dd className="mt-2 text-xs text-ink-soft">Answered {formatDate(item.published_at)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
