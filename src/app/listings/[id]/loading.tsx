import { Container, Skeleton } from "@/components/ui";

export default function ListingLoading() {
  return (
    <Container className="py-16">
      <span className="sr-only" role="status">Loading</span>
      <div className="grid gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </Container>
  );
}
