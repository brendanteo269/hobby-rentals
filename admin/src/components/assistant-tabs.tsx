import Link from "next/link";
import type { Route } from "next";
import { ROUTES } from "@/lib/routes";

const TABS: { href: Route; label: string }[] = [
  { href: ROUTES.assistant, label: "Answers" },
  { href: ROUTES.assistantFeedback, label: "Feedback report" },
  { href: ROUTES.assistantAnswers, label: "Approved answers" },
];

/** The chat assistant's admin pages. */
export function AssistantTabs({ current }: { current: Route }) {
  return (
    <nav aria-label="Chat assistant" className="mt-6 flex gap-6 border-b border-line text-sm">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={current === tab.href ? "page" : undefined}
          className={`-mb-px border-b-2 pb-2 ${current === tab.href ? "border-ink font-medium" : "border-transparent text-ink-soft hover:text-ink"}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
