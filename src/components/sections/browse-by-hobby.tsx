import Link from "next/link";
import { Camera, Tent, Waves, Music, Wrench, type LucideIcon } from "lucide-react";
import { Container, SectionHead } from "@/components/ui";
import { CATEGORIES } from "@/lib/marketplace-data";

const ICONS: Record<string, LucideIcon> = {
  "Cameras & drones": Camera,
  "Camping & hiking": Tent,
  "Water sports": Waves,
  "Music & studio audio": Music,
  "Power tools & DIY": Wrench,
};

/** Category grid linking into the marketplace. */
export function BrowseByHobby() {
  return (
    <Container className="pt-20">
      <SectionHead title="Explore by hobby" href="/browse" linkLabel="All categories" />
      <p className="body-copy mt-2">Find the kit for your next project, trip, session, or new obsession.</p>
      <ul className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((cat) => {
          const Icon = ICONS[cat.name];
          return (
            <li key={cat.name}>
              <Link
                href="/browse"
                className="group flex flex-col items-center gap-3 card px-4 py-8 text-center transition-colors hover:border-ink"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-ink transition-colors group-hover:bg-accent-soft group-hover:text-accent-dark">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="text-sm font-semibold">{cat.name}</h3>
                <p className="text-xs text-ink-soft">{cat.count}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
