import { Container } from "@/components/ui";

export default function ListingLoading() {
  return <Container className="py-16"><div className="grid animate-pulse gap-10 lg:grid-cols-2"><div className="aspect-square bg-surface-muted" /><div className="space-y-5"><div className="h-4 w-28 bg-surface-muted" /><div className="h-10 w-3/4 bg-surface-muted" /><div className="h-20 bg-surface-muted" /></div></div></Container>;
}
