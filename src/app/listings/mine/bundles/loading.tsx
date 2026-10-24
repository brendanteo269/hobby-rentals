import { PageSkeleton } from "@/components/ui";

/** The bundle forms sit outside the dashboard frame, so they get a plain skeleton rather than the dashboard's. */
export default function BundleFormLoading() {
  return <PageSkeleton />;
}
