import Link from "next/link";
import type { Route } from "next";
import { MessagesSquare } from "lucide-react";
import { Container } from "@/components/ui";
import { getForums } from "@/lib/api/forum";
import { timeAgo } from "@/lib/forum";

export const metadata = { title: "Community — HobbyRentals" };

/** S6-11 Scenario 1: one forum per hobby category. */
export default async function CommunityPage() {
  const forums = await getForums();
  return (
    <Container className="pb-16 pt-10">
      <h1 className="heading text-3xl">Community</h1>
      <p className="body-copy mt-2 max-w-2xl">Ask questions, share tips and trip reports, and review gear with other members.</p>
      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {forums.map((forum) => (
          <li key={forum.category_slug}>
            <Link href={`/community/${forum.category_slug}` as Route} className="card flex h-full items-start gap-4 p-5 transition-colors hover:border-ink-soft">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <MessagesSquare className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="heading block text-lg">{forum.label}</span>
                <span className="mt-1 block text-sm text-ink-soft">
                  {forum.post_count} post{forum.post_count === 1 ? "" : "s"}
                  {forum.latest_post_at && ` · last ${timeAgo(forum.latest_post_at)}`}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
