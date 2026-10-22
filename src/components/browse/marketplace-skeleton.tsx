import { Container, Skeleton } from "@/components/ui";

/**
 * The marketplace while it loads: the toggle, search bar, filter row and a
 * grid of card shapes, laid out as the real page is so nothing jumps.
 */
export function MarketplaceSkeleton() {
  return (
    <Container className="pb-16 pt-10">
      <span className="sr-only" role="status">Loading</span>
      <Skeleton className="h-11 w-56 rounded-full" />
      <Skeleton className="mt-5 h-14 w-full rounded-full" />
      <div className="mt-4 flex flex-wrap gap-2">
        {[24, 28, 32, 28, 32].map((width, index) => (
          <Skeleton key={index} className="h-10 rounded-full" style={{ width: `${width * 4}px` }} />
        ))}
      </div>
      <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="card overflow-hidden">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </Container>
  );
}
