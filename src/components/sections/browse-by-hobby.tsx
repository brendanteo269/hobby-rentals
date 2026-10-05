import Link from "next/link";
import type { Route } from "next";
import { Camera, Tent, Dumbbell, Music, Wrench, type LucideIcon } from "lucide-react";
import { Container, SectionHead } from "@/components/ui";
import { CATEGORY_LABELS, type ListingCategory } from "@/lib/listings";

/** The grid's fixed slots, in display order. Keyed by slug so a card's link and label always agree. */
const TOP_CATEGORIES: { slug: ListingCategory; icon: LucideIcon }[] = [
  { slug: "PHOTOGRAPHY_VIDEOGRAPHY", icon: Camera },
  { slug: "CAMPING_OUTDOOR", icon: Tent },
  { slug: "SPORTS_FITNESS", icon: Dumbbell },
  { slug: "MUSIC_AUDIO", icon: Music },
  { slug: "POWER_TOOLS_DIY", icon: Wrench },
];

/** Category grid linking into the marketplace, filtered to that category. */
export function BrowseByHobby() {
  return (
    <Container className="pt-20">
      <SectionHead title="Explore by hobby" href="/browse" linkLabel="All categories" />
      <p className="body-copy mt-2">Find the kit for your next project, trip, session, or new obsession.</p>
      <ul className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {TOP_CATEGORIES.map(({ slug, icon: Icon }) => (
          <li key={slug}>
            <Link
              href={`/browse?category=${slug}` as Route}
              className="group flex flex-col items-center gap-3 card px-4 py-8 text-center transition-colors hover:border-ink"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-ink transition-colors group-hover:bg-accent-soft group-hover:text-accent-dark">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-semibold">{CATEGORY_LABELS[slug]}</h3>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
