import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { requireOwner } from "@/components/owner-portal";
import { BundleForm } from "@/components/bundles/bundle-form";
import { updateMyBundle } from "@/app/listings/mine/bundles/actions";
import { getBundleFormContext } from "@/app/listings/mine/bundles/form-context";
import { getBundle } from "@/lib/api/bundles";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit bundle — HobbyRentals" };

/**
 * S2-20 Scenario 3: the same form as create, started from the stored bundle.
 *
 * 404 rather than 403 for anyone but the owner, matching the API: a published
 * bundle is readable by everyone, so without this check a renter could open
 * an edit form for a set that is not theirs. Nothing would save - the API
 * checks ownership on write - but a form that cannot succeed should not exist.
 */
export default async function EditBundlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;

  const supabase = await createClient();
  const [bundle, { data: { user } }, context] = await Promise.all([
    getBundle(id).catch(() => null),
    supabase.auth.getUser(),
    getBundleFormContext(),
  ]);

  if (!bundle || bundle.owner_id !== user?.id || bundle.status === "REMOVED") notFound();

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Your inventory</p>
        <h1 className="heading mt-3 text-3xl">Edit bundle</h1>
        <p className="body-copy mt-3">
          Fields marked with an asterisk are required. Changes apply to new bookings only, and the
          listings inside stay published and independently bookable whatever you do here.
        </p>

        <div className="mt-10">
          <BundleForm action={updateMyBundle.bind(null, bundle.id)} bundle={bundle} {...context} />
        </div>
      </div>
    </Container>
  );
}
