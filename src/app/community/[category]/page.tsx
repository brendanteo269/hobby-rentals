import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { ButtonLink, Container, EmptyState } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { PostCard } from "@/components/community/post-card";
import { ForumApiError, getForumPosts } from "@/lib/api/forum";
import { FLAIRS, FLAIR_LABELS, SORTS, isFlair, isSort, type Flair, type ForumSort } from "@/lib/forum";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Community — HobbyRentals" };

type Params = { category: string };
type Search = { sort?: string; flair?: string; page?: string };

function href(category: string, sort: ForumSort, flair: Flair | null, page = 1): Route {
  const query = new URLSearchParams();
  if (sort !== "hot") query.set("sort", sort);
  if (flair) query.set("flair", flair);
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  return `/community/${category}${qs ? `?${qs}` : ""}` as Route;
}

/** S6-11 Scenario 1: one forum's posts, sorted Hot, New or Top, optionally by flair. */
export default async function ForumPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { category } = await params;
  const search = await searchParams;
  const sort: ForumSort = search.sort && isSort(search.sort) ? search.sort : "hot";
  const flair: Flair | null = search.flair && isFlair(search.flair) ? search.flair : null;
  const page = Math.max(1, Number(search.page) || 1);

  let data;
  try {
    data = await getForumPosts(category, sort, flair, page);
  } catch (error) {
    if (error instanceof ForumApiError && error.status === 404) notFound();
    throw error;
  }
  const { data: { user } } = await (await createClient()).auth.getUser();
  const pill = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm transition-colors ${active ? "bg-ink text-white" : "bg-surface-muted text-ink-soft hover:text-ink"}`;

  return (
    <Container className="pb-16 pt-10">
      <Link href="/community" className="text-sm text-ink-soft hover:text-ink">&larr; Community</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="heading text-3xl">{data.category_label}</h1>
        <ButtonLink href={`/community/${category}/new` as Route}>New post</ButtonLink>
      </div>

      <nav aria-label="Sort posts" className="mt-6 flex flex-wrap gap-2">
        {SORTS.map((option) => (
          <Link key={option.value} href={href(category, option.value, flair)} aria-current={sort === option.value ? "page" : undefined} className={pill(sort === option.value)}>
            {option.label}
          </Link>
        ))}
        <span className="mx-2 w-px bg-line" aria-hidden="true" />
        <Link href={href(category, sort, null)} className={pill(flair === null)}>All</Link>
        {FLAIRS.map((value) => (
          <Link key={value} href={href(category, sort, value)} className={pill(flair === value)}>{FLAIR_LABELS[value]}</Link>
        ))}
      </nav>

      {data.posts.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={MessagesSquare} title="No posts yet" body="Start the conversation: ask a question or share a tip."
            action={<ButtonLink href={`/community/${category}/new` as Route}>Write the first post</ButtonLink>} />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.posts.map((post) => <PostCard key={post.id} post={post} viewerId={user?.id ?? null} />)}
        </ul>
      )}

      <Pagination page={page} lastPage={Math.max(1, Math.ceil(data.total / data.page_size))} hrefForPage={(p) => href(category, sort, flair, p)} />
    </Container>
  );
}
