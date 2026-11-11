import Link from "next/link";
import { Container } from "@/components/ui";
import { helpPath } from "@/lib/help";

/** An old chat can still link to an answer that has since been withdrawn or replaced. */
export default function HelpAnswerNotFound() {
  return (
    <Container className="max-w-3xl py-16">
      <p className="eyebrow">Help centre</p>
      <h1 className="heading mt-2 text-3xl">This answer is no longer available</h1>
      <p className="body-copy mt-3">It may have been replaced by a newer one. The help centre covers fees, deposits, protection, late returns, claims and cancellations.</p>
      <Link href={helpPath()} className="mt-6 inline-block rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90">
        Go to the help centre
      </Link>
    </Container>
  );
}
