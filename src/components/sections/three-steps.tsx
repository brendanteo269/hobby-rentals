import { Container } from "@/components/ui";
import { STEPS } from "@/lib/marketplace-data";

/** Explains the rental process in three numbered steps. */
export function ThreeSteps() {
  return (
    <Container className="pt-20">
      <div className="bg-sand px-8 py-14 sm:px-14">
        <h2 className="display-caps text-center text-2xl sm:text-3xl">Three steps to the kit</h2>
        <ol className="mt-10 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n}>
              <p className="font-display text-2xl text-clay">{step.n}</p>
              <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide">{step.title}</h3>
              <p className="body-copy mt-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </Container>
  );
}
