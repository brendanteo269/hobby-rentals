import Link from "next/link";
import { Container, SectionHead, ImageSlot } from "@/components/ui";
import { CATEGORIES } from "@/lib/marketplace-data";

/** Category grid linking into the marketplace. */
export function BrowseByHobby() {
  return (
    <Container className="pt-20">
      <SectionHead title="Browse by hobby" href="/" linkLabel="All 24 categories" />
      <ul className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <li key={cat.name}>
            <Link href="/" className="group block">
              <ImageSlot label={cat.name} className="aspect-4/3 w-full" />
              <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide group-hover:text-clay">
                {cat.name}
              </h3>
              <p className="mt-1 text-xs text-ink-soft">{cat.listings}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
