import { PageSkeleton } from "@/components/ui";

/** A bundle's own page, which would otherwise inherit the marketplace's skeleton from /bundles. */
export default function BundleLoading() {
  return <PageSkeleton />;
}
