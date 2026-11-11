import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { PostForm } from "@/components/community/post-form";
import { CATEGORY_LABELS, isCategory } from "@/lib/listings";

export const metadata = { title: "New post — Community" };

/** S6-11 Scenario 2: writing a post in one forum. */
export default async function NewPostPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  return (
    <Container className="max-w-2xl pb-16 pt-10">
      <Link href={`/community/${category}` as Route} className="text-sm text-ink-soft hover:text-ink">&larr; {CATEGORY_LABELS[category]}</Link>
      <h1 className="heading mt-3 text-3xl">New post in {CATEGORY_LABELS[category]}</h1>
      <div className="mt-8"><PostForm slug={category} /></div>
    </Container>
  );
}
